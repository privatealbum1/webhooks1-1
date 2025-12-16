// app/api/webhook/route.ts - UPGRADED VERSION
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
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const MY_PAGE_ID = "313615051829979";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ChatMessage {
  role: "user" | "model";
  parts: Part[];
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
    return docSnap.exists();
  } catch (error) { return false; }
}

async function markCommentAsProcessed(
  commentId: string,
  metadata?: {
    parent_id?: string;
    from_bot: boolean;
    user_id: string;
    message: string;
  }
) {
  try {
    await setDoc(doc(db, "processed_comments", commentId), {
      processedAt: serverTimestamp(),
      ...metadata
    });
  } catch (error) {
    console.error("🔥 Lỗi đánh dấu comment:", error);
  }
}

/**
 * Kiểm tra xem có nên reply comment này không
 * Logic:
 * 1. Nếu là comment gốc (no parent) → Reply 1 lần
 * 2. Nếu là reply (có parent):
 *    - Check parent có phải bot reply không
 *    - Nếu user đang reply bot → Reply
 *    - Nếu không → Skip
 */
async function shouldReplyToComment(
  commentId: string,
  parentId: string | null,
  senderId: string
): Promise<boolean> {
  // Đã được xử lý rồi thì skip
  if (await isCommentProcessed(commentId)) {
    console.log(`🚫 Comment ${commentId} đã được xử lý rồi`);
    return false;
  }

  // Nếu là comment gốc (no parent) → Luôn reply
  if (!parentId) {
    console.log(`✅ Comment gốc → Sẽ reply`);
    return true;
  }

  // Nếu có parent, check xem parent có phải bot reply không
  try {
    const parentDoc = await getDoc(doc(db, "processed_comments", parentId));

    if (!parentDoc.exists()) {
      console.log(`⚠️ Parent comment ${parentId} không tồn tại → Skip reply`);
      return false;
    }

    const parentData = parentDoc.data();

    // Nếu parent là bot reply → User đang reply lại bot → Reply
    if (parentData.from_bot === true) {
      console.log(`✅ User reply lại bot → Sẽ reply`);
      return true;
    }

    // Parent không phải bot → User reply user khác → Skip
    console.log(`🚫 User reply user khác → Skip`);
    return false;
  } catch (error) {
    console.error('Error checking parent comment:', error);
    return false;
  }
}

// --- TÍNH NĂNG 3: NÂNG CẤP COMMENT HANDLER WITH KOL ---
/**
 * Xử lý comment với KOL personality hoàn chỉnh
 * - Load KOL profile từ pageId
 * - Load personality & conversation history
 * - Generate reply theo style KOL
 * - Apply human-like delays
 * - Track stats
 */
async function handleCommentWithKOL(
  commentId: string,
  userMessage: string,
  pageId: string,
  senderId: string,
  parentId: string | null = null
): Promise<void> {
  try {
    // 1. Kiểm tra xem có nên reply không
    const shouldReply = await shouldReplyToComment(commentId, parentId, senderId);
    if (!shouldReply) {
      console.log(`⏭️ Skip comment ${commentId}`);
      return;
    }

    // 2. Tìm KOL profile từ pageId
    const kol = await getKOLForResponse(pageId);

    if (!kol) {
      console.log(`⚠️ No active KOL found for page ${pageId}`);
      return;
    }

    if (!kol.engagement_rules.auto_reply_comments) {
      console.log(`⚠️ Auto-reply comments disabled for KOL ${kol.name}`);
      return;
    }

    console.log(`💬 [KOL: ${kol.name}] Processing comment from user ${senderId}`);

    // 3. Load personality & history
    const systemPrompt = generateSystemPrompt(kol);

    // Load recent conversation history with this user (if exists)
    const conversationHistory = await getChatHistory(senderId);

    // 4. Apply human-like delay
    const delay = getHumanLikeDelay(kol);
    console.log(`⏱️ Simulating human delay: ${delay}s`);
    await simulateHumanDelay(delay);

    // 5. Generate reply theo style KOL với context
    let aiReply = await askGeminiWithPersonality(
      userMessage,
      conversationHistory.slice(-5), // Last 5 messages for context
      systemPrompt
    );

    // 6. Post-process reply
    aiReply = addEmojis(aiReply, kol.voice_characteristics.emoji_usage);

    // Apply catchphrases randomly (20% chance)
    if (Math.random() < 0.2 && kol.voice_characteristics.catchphrases.length > 0) {
      const randomCatchphrase = kol.voice_characteristics.catchphrases[
        Math.floor(Math.random() * kol.voice_characteristics.catchphrases.length)
      ];
      aiReply = `${aiReply} ${randomCatchphrase}`;
    }

    // 7. Send reply
    await replyToComment(commentId, aiReply);

    // 8. Mark user comment as processed (from user)
    await markCommentAsProcessed(commentId, {
      parent_id: parentId || undefined,
      from_bot: false,
      user_id: senderId,
      message: userMessage
    });

    // 9. Save bot reply to tracking (important for reply chain)
    // The bot's reply will have a new comment_id from Facebook
    // We'll track it when webhook sends it back

    // 10. Save interaction & update stats
    await saveChatToFirebase(senderId, userMessage, aiReply, kol.id);
    await updateKOLStats(kol.id, 'total_comments_replied');

    console.log(`✅ [KOL: ${kol.name}] Successfully replied to comment ${commentId}`);
  } catch (error) {
    console.error(`🔥 Error in handleCommentWithKOL:`, error);
  }
}

/**
 * Simulate human typing/thinking delay
 */
async function simulateHumanDelay(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// --- GEMINI AI WITH KOL PERSONALITY ---
async function askGeminiWithPersonality(
  message: string, 
  history: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  while (history.length > 0 && history[0].role === "model") { history.shift(); }
  
  const models = ["gemini-2.0-flash-exp", "gemini-1.5-flash"];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemPrompt
      });
      
      const chat = model.startChat({ 
        history: history, 
        generationConfig: { maxOutputTokens: 500 } 
      });
      
      const result = await chat.sendMessage(message);
      return (await result.response).text();
    } catch (error: any) {
      if (error.message.includes("role 'user'") || error.message.includes("content")) {
         try {
            const fallbackModel = genAI.getGenerativeModel({ 
              model: modelName,
              systemInstruction: systemPrompt
            });
            const chatReset = fallbackModel.startChat({ history: [] });
            const resReset = await chatReset.sendMessage(message);
            return resReset.response.text();
         } catch(e) { console.error("Gemini fallback failed:", e); }
      }
    }
  }
  return "AI đang bận, thử lại sau nhé!";
}

// --- SEND REPLY ---
async function sendReplyToMessenger(recipientId: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) return;
  const url = `https://graph.facebook.com/v24.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  await fetch(url, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ recipient: { id: recipientId }, sender_action: "typing_on" }) 
  });
  
  const body = { 
    recipient: { id: recipientId }, 
    messaging_type: "RESPONSE", 
    message: { text: text } 
  };
  
  try { 
    await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    }); 
  } catch (e) { console.error("Error sending message:", e); }
}

async function replyToComment(commentId: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) return;
  const url = `https://graph.facebook.com/v24.0/${commentId}/comments?access_token=${PAGE_ACCESS_TOKEN}`;
  try {
    const res = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ message: text }) 
    });
    const data = await res.json();
    if (data.error) console.error("🔥 Lỗi Reply Comment:", data.error.message);
    else console.log("✅ Đã trả lời comment:", commentId);
  } catch (error) { console.error("🔥 Lỗi mạng Comment:", error); }
}

// --- MAIN HANDLERS ---
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
        
        // 🎯 LẤY KOL PROFILE CHO PAGE NÀY
        const kol = await getKOLForResponse(pageId);
        
        // --- A. XỬ LÝ TIN NHẮN ---
        if (entry.messaging) {
          const webhook_event = entry.messaging[0];
          if (webhook_event?.message?.text && !webhook_event.message.is_echo) {
            const senderId = webhook_event.sender.id;
            const userMessage = webhook_event.message.text;

            if (kol && kol.engagement_rules.auto_reply_messages) {
              console.log(`💬 [KOL: ${kol.name}] Processing message from ${senderId}`);
              
              // Generate system prompt từ KOL personality
              const systemPrompt = generateSystemPrompt(kol);
              const history = await getChatHistory(senderId);
              
              // Delay giả lập người thật
              const delay = getHumanLikeDelay(kol);
              await new Promise(resolve => setTimeout(resolve, delay * 1000));
              
              // AI reply với personality
              let aiReply = await askGeminiWithPersonality(userMessage, history, systemPrompt);
              
              // Thêm emoji theo style
              aiReply = addEmojis(aiReply, kol.voice_characteristics.emoji_usage);
              
              await sendReplyToMessenger(senderId, aiReply);
              await saveChatToFirebase(senderId, userMessage, aiReply, kol.id);
              await updateKOLStats(kol.id, 'total_messages_replied');
            } else {
              console.log("⚠️ No active KOL found for this page or auto-reply disabled");
            }
          }
        }

        // --- B. XỬ LÝ COMMENT (UPGRADED WITH KOL) ---
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'feed' &&
                change.value.item === 'comment' &&
                change.value.verb === 'add') {

              const commentId = change.value.comment_id;
              const userMessage = change.value.message;
              const senderId = change.value.from.id;
              const parentId = change.value.parent_id || null; // Facebook provides parent_id for replies

              // 🛡️ KHÓA 1: Bỏ qua comment của chính Page
              if (senderId === MY_PAGE_ID) {
                console.log("🚫 Bỏ qua comment của chính Page.");

                // Nhưng vẫn track bot's own reply để biết reply chain
                if (parentId) {
                  await markCommentAsProcessed(commentId, {
                    parent_id: parentId,
                    from_bot: true,
                    user_id: MY_PAGE_ID,
                    message: userMessage
                  });
                }
                continue;
              }

              // 🎯 TÍNH NĂNG 3: XỬ LÝ COMMENT VỚI KOL PERSONALITY
              // Sử dụng handleCommentWithKOL function nâng cao với parent tracking
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
