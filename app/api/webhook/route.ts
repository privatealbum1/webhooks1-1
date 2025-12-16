import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { 
  getKOLForResponse, 
  getHumanLikeDelay, 
  addEmojis,
  updateKOLStats,
  generateSystemPrompt
} from '../../lib/kol-manager';

// --- CONFIG ---
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "dungdev_secret_code_123";
// FB_PAGE_ACCESS_TOKEN chỉ dùng làm backup nếu không tìm thấy token trong DB
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ChatMessage {
  role: "user" | "model";
  parts: Part[];
}

// --- HELPER: LẤY TOKEN CỦA PAGE ---
function getPageToken(kol: any, pageId: string): string {
  // 1. Tìm token trong danh sách page kết nối của KOL (từ Firestore)
  if (kol.facebook_pages && Array.isArray(kol.facebook_pages)) {
    const pageConfig = kol.facebook_pages.find((p: any) => p.page_id === pageId || p.id === pageId);
    if (pageConfig?.page_access_token) return pageConfig.page_access_token;
    if (pageConfig?.access_token) return pageConfig.access_token;
  }
  
  // 2. Nếu không thấy, dùng token mặc định trong file .env
  return process.env.FB_PAGE_ACCESS_TOKEN || "";
}

// --- FIREBASE: CHAT HISTORY ---
async function getChatHistory(senderId: string): Promise<ChatMessage[]> {
  try {
    const userChatsRef = collection(db, "chats", senderId, "messages");
    const q = query(userChatsRef, orderBy("createdAt", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    const history: ChatMessage[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.botReply) history.unshift({ role: "model", parts: [{ text: data.botReply }] });
      if (data.userMessage) history.unshift({ role: "user", parts: [{ text: data.userMessage }] });
    });
    return history;
  } catch (error) { return []; }
}

async function saveChatToFirebase(senderId: string, userMsg: string, botMsg: string, kolId?: string) {
  try {
    const userChatsRef = collection(db, "chats", senderId, "messages");
    await addDoc(userChatsRef, { 
      userMessage: userMsg, 
      botReply: botMsg, 
      kolId: kolId || null,
      createdAt: serverTimestamp() 
    });
  } catch (error) { console.error("🔥 Lỗi lưu chat:", error); }
}

// --- COMMENT PROCESSING ---
async function isCommentProcessed(commentId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "processed_comments", commentId);
    const docSnap = await getDoc(docRef);
    const exists = docSnap.exists();
    if (exists) {
      const data = docSnap.data();
      console.log(`  ℹ️ Comment ${commentId} already processed: from_bot=${data?.from_bot}, user=${data?.user_id}`);
    }
    return exists;
  } catch (error) {
    console.error(`  ❌ Error checking if comment processed:`, error);
    return false;
  }
}

async function isUserSpamming(userId: string, timeWindowSeconds: number = 30): Promise<boolean> {
  try {
    const userChatsRef = collection(db, "chats", userId, "messages");
    const recentTime = new Date(Date.now() - timeWindowSeconds * 1000);

    let snapshot;
    try {
      const q = query(userChatsRef, orderBy("createdAt", "desc"), limit(10));
      snapshot = await getDocs(q);
    } catch (indexError) {
      const q = query(userChatsRef, limit(10));
      snapshot = await getDocs(q);
    }

    let recentCount = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.();
      if (createdAt && createdAt > recentTime) {
        recentCount++;
      }
    });

    if (recentCount >= 3) {
      console.log(`⚠️ User ${userId} is spamming: ${recentCount} messages in ${timeWindowSeconds}s`);
      return true;
    }
    return false;
  } catch (error) {
    return false; // Fail-open
  }
}

async function markCommentAsProcessed(commentId: string, metadata?: any) {
  try {
    await setDoc(doc(db, "processed_comments", commentId), {
      processedAt: serverTimestamp(),
      ...metadata
    });
  } catch (error) { console.error("🔥 Lỗi đánh dấu comment:", error); }
}

async function shouldReplyToComment(commentId: string, parentId: string | null, senderId: string): Promise<boolean> {
  if (await isCommentProcessed(commentId)) return false;
  if (!parentId) return true; // Comment gốc -> Reply

  try {
    const parentDoc = await getDoc(doc(db, "processed_comments", parentId));
    if (!parentDoc.exists()) return true; // Parent không track -> Reply để chắc ăn
    
    const parentData = parentDoc.data();
    if (parentData.from_bot === true) return true; // User reply Bot -> Reply
    
    return false; // User reply User khác -> Skip
  } catch (error) { return false; }
}

// --- GEMINI AI WITH KOL PERSONALITY (Robust Version) ---
async function askGeminiWithPersonality(message: string, history: ChatMessage[], systemPrompt: string): Promise<string> {
  // 1. Dọn dẹp history (xóa các lượt bot trả lời liên tiếp nếu có để tránh lỗi API)
  while (history.length > 0 && history[0].role === "model") { history.shift(); }

  // 2. DANH SÁCH MODEL BẤT TỬ:
  // - Ưu tiên 1: Flash 1.5 (Nhanh, Chuẩn)
  // - Ưu tiên 2: Flash 1.5 Latest (Tên định danh khác phòng khi Google đổi)
  // - Ưu tiên 3: Gemini Pro (Bản cũ 1.0 - Chậm hơn nhưng siêu ổn định)
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
  
  // Biến lưu lỗi để debug
  let lastError = null;

  // 3. Vòng lặp thử từng model
  for (const modelName of modelsToTry) {
    try {
      // console.log(`🤖 Webhook trying model: ${modelName}...`); // Bỏ comment nếu muốn xem log
      
      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        systemInstruction: systemPrompt 
      });
      
      const chat = model.startChat({ 
        history: history, 
        generationConfig: { 
          maxOutputTokens: 500,
          temperature: 0.9 
        } 
      });
      
      const result = await chat.sendMessage(message);
      const response = (await result.response).text();
      
      // Nếu thành công -> Trả về kết quả và thoát hàm ngay lập tức
      return response;

    } catch (error: any) {
      console.warn(`⚠️ Webhook Model ${modelName} failed:`, error.message || error);
      lastError = error;
      
      // LƯU Ý ĐẶC BIỆT CHO GEMINI PRO (Model cũ):
      // Nếu fallback về gemini-pro, đôi khi nó lỗi vì không hiểu "systemInstruction".
      // Logic dưới đây để xử lý riêng trường hợp đó ở vòng lặp sau (nếu cần thiết),
      // nhưng thường thư viện mới đã tự handle. Chỉ cần continue là đủ.
      continue;
    }
  }

  // 4. Nếu thử cả 3 model đều chết
  console.error("🔥 ALL AI MODELS FAILED in Webhook. Last error:", lastError);
  return "Hiện tại server AI đang quá tải, bạn vui lòng nhắn lại sau ít phút nhé! (Error: AI Busy)";
}

// --- SEND REPLY (ĐÃ CẬP NHẬT: NHẬN TOKEN TỪNG PAGE) ---
async function sendReplyToMessenger(recipientId: string, text: string, accessToken: string) {
  if (!accessToken) {
    console.error("❌ Missing Access Token for Messenger reply");
    return;
  }
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`;
  
  // Typing indicator
  try {
    await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ recipient: { id: recipientId }, sender_action: "typing_on" }) 
    });
  } catch (e) {}
  
  // Send message
  try { 
    await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        recipient: { id: recipientId }, 
        messaging_type: "RESPONSE", 
        message: { text: text } 
      }) 
    }); 
  } catch (e) { console.error("Error sending message:", e); }
}

async function replyToComment(commentId: string, text: string, accessToken: string): Promise<string | null> {
  if (!accessToken) {
    console.error("❌ Missing Access Token for Comment reply");
    return null;
  }
  const url = `https://graph.facebook.com/v21.0/${commentId}/comments?access_token=${accessToken}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    if (data.error) {
      console.error("🔥 Lỗi Reply Comment:", data.error.message);
      return null;
    }
    return data.id;
  } catch (error) { return null; }
}

// --- HANDLE COMMENT LOGIC ---
async function handleCommentWithKOL(
  commentId: string,
  userMessage: string,
  pageId: string,
  senderId: string,
  parentId: string | null = null
): Promise<void> {
  try {
    // 1. Check rules
    const shouldReply = await shouldReplyToComment(commentId, parentId, senderId);
    if (!shouldReply) return;

    // 2. Check spam
    const isSpam = await isUserSpamming(senderId, 30);
    if (isSpam) {
      await markCommentAsProcessed(commentId, { from_bot: false, user_id: senderId, message: userMessage });
      return;
    }

    // 3. Get KOL
    const kol = await getKOLForResponse(pageId);
    if (!kol || !kol.engagement_rules.auto_reply_comments) return;

    // 4. Generate AI Reply
    const systemPrompt = generateSystemPrompt(kol);
    const history = await getChatHistory(senderId);
    const delay = getHumanLikeDelay(kol);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));

    let aiReply = await askGeminiWithPersonality(userMessage, history.slice(-5), systemPrompt);
    aiReply = addEmojis(aiReply, kol.voice_characteristics.emoji_usage);

    // 5. Send Reply (Lấy token động)
    const pageToken = getPageToken(kol, pageId);
    const botReplyId = await replyToComment(commentId, aiReply, pageToken);

    // 6. Tracking
    await markCommentAsProcessed(commentId, { from_bot: false, user_id: senderId, message: userMessage });
    if (botReplyId) {
      await markCommentAsProcessed(botReplyId, { parent_id: commentId, from_bot: true, user_id: pageId, message: aiReply });
    }
    await saveChatToFirebase(senderId, userMessage, aiReply, kol.id);
    await updateKOLStats(kol.id, 'total_comments_replied');
    
    // Sync (Optional)
    syncEngagementStats(kol.id, pageId).catch(err => console.error(err));

  } catch (error) { console.error(`🔥 Error in handleCommentWithKOL:`, error); }
}

async function syncEngagementStats(kolId: string, pageId: string) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/facebook/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kol_id: kolId, page_id: pageId, sync_type: 'stats' })
    });
  } catch (e) {}
}

// --- MAIN ROUTES ---
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  if (searchParams.get('hub.mode') === 'subscribe' && 
      searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object === 'page') {
      const entries = body.entry as any[];
      
      for (const entry of entries) {
        const pageId = entry.id;
        const kol = await getKOLForResponse(pageId);
        
        // --- A. MESSAGING ---
        if (entry.messaging) {
          const webhook_event = entry.messaging[0];
          if (webhook_event?.message?.text && !webhook_event.message.is_echo) {
            const senderId = webhook_event.sender.id;
            const userMessage = webhook_event.message.text;

            if (kol && kol.engagement_rules.auto_reply_messages) {
              const isSpam = await isUserSpamming(senderId, 30);
              if (!isSpam) {
                const systemPrompt = generateSystemPrompt(kol);
                const history = await getChatHistory(senderId);
                const delay = getHumanLikeDelay(kol);
                await new Promise(resolve => setTimeout(resolve, delay * 1000));

                let aiReply = await askGeminiWithPersonality(userMessage, history, systemPrompt);
                aiReply = addEmojis(aiReply, kol.voice_characteristics.emoji_usage);

                // Lấy token động và gửi
                const pageToken = getPageToken(kol, pageId);
                await sendReplyToMessenger(senderId, aiReply, pageToken);
                
                await saveChatToFirebase(senderId, userMessage, aiReply, kol.id);
                await updateKOLStats(kol.id, 'total_messages_replied');
              }
            }
          }
        }

        // --- B. COMMENTS ---
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'feed' && change.value.item === 'comment' && change.value.verb === 'add') {
              const commentId = change.value.comment_id;
              const userMessage = change.value.message;
              const senderId = change.value.from.id;
              const parentId = change.value.parent_id || null;

              // Bỏ qua nếu là chính page đang comment
              if (senderId === pageId || senderId.toString() === pageId.toString()) {
                await markCommentAsProcessed(commentId, { from_bot: true, user_id: pageId, message: userMessage });
                continue;
              }

              await handleCommentWithKOL(commentId, userMessage, pageId, senderId, parentId);
            }
          }
        }
      }
      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    }
    return NextResponse.json({ status: 'UNKNOWN' }, { status: 404 });
  } catch (error) {
    console.error("🔥 Webhook Error:", error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
