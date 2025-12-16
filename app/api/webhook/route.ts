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
const FB_APP_SECRET = process.env.FB_APP_SECRET || "";
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

/**
 * Check if user is spamming (sent multiple messages in short time)
 * Returns false on error to allow processing (fail-open)
 */
async function isUserSpamming(userId: string, timeWindowSeconds: number = 30): Promise<boolean> {
  try {
    const userChatsRef = collection(db, "chats", userId, "messages");
    const recentTime = new Date(Date.now() - timeWindowSeconds * 1000);

    // Try with orderBy first
    let snapshot;
    try {
      const q = query(
        userChatsRef,
        orderBy("createdAt", "desc"),
        limit(10)
      );
      snapshot = await getDocs(q);
    } catch (indexError) {
      // If orderBy fails (no index), get all recent docs without ordering
      console.log(`⚠️ No Firestore index for createdAt, using simple query`);
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

    // If user sent 3+ messages in last 30 seconds, consider it spam
    if (recentCount >= 3) {
      console.log(`⚠️ User ${userId} is spamming: ${recentCount} messages in ${timeWindowSeconds}s`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error checking spam (allowing message):', error);
    return false; // Fail-open: allow processing if spam check fails
  }
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
      console.log(`⏭️ Skip comment ${commentId} (should not reply)`);
      return;
    }

    // 2. Check spam - if user is commenting too fast, skip
    const isSpam = await isUserSpamming(senderId, 30);
    if (isSpam) {
      console.log(`⏭️ Skip comment ${commentId} (user spamming)`);
      // Still mark as processed to prevent retry
      await markCommentAsProcessed(commentId, {
        parent_id: parentId || undefined,
        from_bot: false,
        user_id: senderId,
        message: userMessage
      });
      return;
    }

    // 3. Tìm KOL profile từ pageId
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

    // 7. Send reply and get bot's new comment ID
    const botReplyId = await replyToComment(commentId, aiReply);

    // 8. Mark user comment as processed (from user)
    await markCommentAsProcessed(commentId, {
      parent_id: parentId || undefined,
      from_bot: false,
      user_id: senderId,
      message: userMessage
    });

    // 9. Track bot's reply IMMEDIATELY to prevent duplicate processing
    if (botReplyId) {
      await markCommentAsProcessed(botReplyId, {
        parent_id: commentId, // Bot reply's parent is user's comment
        from_bot: true,
        user_id: pageId, // Bot reply is from the page
        message: aiReply
      });
      console.log(`📝 Tracked bot reply ${botReplyId} to prevent duplication`);
    }

    // 10. Save interaction & update stats
    await saveChatToFirebase(senderId, userMessage, aiReply, kol.id);
    await updateKOLStats(kol.id, 'total_comments_replied');

    // 11. Trigger background sync for engagement stats (async, non-blocking)
    syncEngagementStats(kol.id, pageId).catch(err =>
      console.error('Background sync error:', err)
    );

    console.log(`✅ [KOL: ${kol.name}] Successfully replied to comment ${commentId}`);
  } catch (error) {
    console.error(`🔥 Error in handleCommentWithKOL:`, error);
  }
}

/**
 * Sync engagement stats in background (non-blocking)
 */
async function syncEngagementStats(kolId: string, pageId: string): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/facebook/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kol_id: kolId,
        page_id: pageId,
        sync_type: 'stats'
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log(`📊 Background sync completed for KOL ${kolId}`);
    }
  } catch (error) {
    console.error('Error in background sync:', error);
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

async function replyToComment(commentId: string, text: string): Promise<string | null> {
  if (!PAGE_ACCESS_TOKEN) return null;
  const url = `https://graph.facebook.com/v24.0/${commentId}/comments?access_token=${PAGE_ACCESS_TOKEN}`;
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
    } else {
      console.log("✅ Đã trả lời comment:", commentId, "New comment ID:", data.id);
      return data.id; // Return bot's new comment ID
    }
  } catch (error) {
    console.error("🔥 Lỗi mạng Comment:", error);
    return null;
  }
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

            console.log(`\n💬 New message webhook received:`);
            console.log(`  👤 From: ${senderId}`);
            console.log(`  📄 Message: ${userMessage}`);
            console.log(`  📍 Page ID: ${pageId}`);

            if (kol && kol.engagement_rules.auto_reply_messages) {
              console.log(`✅ [KOL: ${kol.name}] Auto-reply enabled`);

              // Check spam - if user is messaging too fast, skip
              const isSpam = await isUserSpamming(senderId, 30);
              if (isSpam) {
                console.log(`⏭️ Skip message from ${senderId} (user spamming - sending messages too fast)`);
                // Don't return, just skip processing but continue webhook
              } else {
                // Generate system prompt từ KOL personality
                const systemPrompt = generateSystemPrompt(kol);
                const history = await getChatHistory(senderId);

                // Delay giả lập người thật
                const delay = getHumanLikeDelay(kol);
                console.log(`⏱️ Simulating human delay: ${delay}s`);
                await new Promise(resolve => setTimeout(resolve, delay * 1000));

                // AI reply với personality
                let aiReply = await askGeminiWithPersonality(userMessage, history, systemPrompt);

                // Thêm emoji theo style
                aiReply = addEmojis(aiReply, kol.voice_characteristics.emoji_usage);

                console.log(`📤 Sending reply to ${senderId}: ${aiReply.substring(0, 50)}...`);
                await sendReplyToMessenger(senderId, aiReply);
                await saveChatToFirebase(senderId, userMessage, aiReply, kol.id);
                await updateKOLStats(kol.id, 'total_messages_replied');
                console.log(`✅ Message processed successfully`);
              }
            } else {
              console.log("⚠️ No active KOL found for this page or auto-reply disabled");
            }
          } else if (webhook_event?.message?.is_echo) {
            console.log(`🚫 SKIPPED: Echo message (bot's own message) - ignoring`);
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

              console.log(`\n🔔 New comment webhook received:`);
              console.log(`  📝 Comment ID: ${commentId}`);
              console.log(`  👤 From: ${senderId}`);
              console.log(`  📄 Message: ${userMessage}`);
              console.log(`  📍 Page ID: ${pageId}`);
              console.log(`  🔗 Parent ID: ${parentId || 'None (root comment)'}`);

              // 🛡️ KHÓA 1: Bỏ qua comment của chính Page (so sánh với pageId động)
              if (senderId === pageId || senderId.toString() === pageId.toString()) {
                console.log(`🚫 SKIPPED: Comment from page itself (${pageId}). Bot's own comment - ignoring.`);

                // Nhưng vẫn track bot's own reply để biết reply chain
                await markCommentAsProcessed(commentId, {
                  parent_id: parentId || undefined,
                  from_bot: true,
                  user_id: pageId,
                  message: userMessage
                });
                continue;
              }

              console.log(`✅ Comment is from user (not bot) - proceeding to handleCommentWithKOL...`);

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
