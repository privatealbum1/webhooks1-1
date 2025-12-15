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

async function markCommentAsProcessed(commentId: string) {
  try {
    await setDoc(doc(db, "processed_comments", commentId), {
      processedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("🔥 Lỗi đánh dấu comment:", error);
  }
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

        // --- B. XỬ LÝ COMMENT ---
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'feed' && 
                change.value.item === 'comment' && 
                change.value.verb === 'add') {
              
              const commentId = change.value.comment_id;
              const userMessage = change.value.message;
              const senderId = change.value.from.id;

              // 🛡️ KHÓA 1: Bỏ qua comment của chính Page
              if (senderId === MY_PAGE_ID) {
                console.log("🚫 Bỏ qua comment của chính Page.");
                continue; 
              }

              // 🛡️ KHÓA 2: Kiểm tra đã xử lý chưa
              const alreadyProcessed = await isCommentProcessed(commentId);
              if (alreadyProcessed) {
                console.log("🚫 Comment đã trả lời rồi:", commentId);
                continue;
              }

              // 🎯 KOL-POWERED REPLY
              if (kol && kol.engagement_rules.auto_reply_comments) {
                console.log(`💬 [KOL: ${kol.name}] Processing comment: ${userMessage}`);
                
                const systemPrompt = generateSystemPrompt(kol);
                const delay = getHumanLikeDelay(kol);
                
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
                
                let aiReply = await askGeminiWithPersonality(userMessage, [], systemPrompt);
                aiReply = addEmojis(aiReply, kol.voice_characteristics.emoji_usage);
                
                await replyToComment(commentId, aiReply);
                await markCommentAsProcessed(commentId);
                await updateKOLStats(kol.id, 'total_comments_replied');
              } else {
                console.log("⚠️ No active KOL or auto-reply disabled for comments");
              }
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
