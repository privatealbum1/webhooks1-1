import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

// --- CONFIG ---
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "dungdev_secret_code_123";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
// 🔴 ĐIỀN ID PAGE CỦA BẠN VÀO ĐÂY ĐỂ CHẶN BOT TỰ REP CHÍNH MÌNH (Lấy trong phần Giới thiệu Page)
const MY_PAGE_ID = "313615051829979"; // Lấy từ ảnh Screenshot_122 bạn gửi

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ChatMessage {
  role: "user" | "model";
  parts: Part[];
}

// --- 1. FIREBASE: QUẢN LÝ LỊCH SỬ CHAT (MESSAGES) ---
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

async function saveChatToFirebase(senderId: string, userMsg: string, botMsg: string) {
  try {
    const userChatsRef = collection(db, "chats", senderId, "messages");
    await addDoc(userChatsRef, { userMessage: userMsg, botReply: botMsg, createdAt: serverTimestamp() });
  } catch (error) { console.error("🔥 Lỗi lưu chat:", error); }
}

// --- 2. FIREBASE: QUẢN LÝ COMMENT ĐÃ XỬ LÝ (CHỐNG SPAM) ---
// Hàm này kiểm tra xem comment này Bot đã rep chưa
async function isCommentProcessed(commentId: string): Promise<boolean> {
  try {
    const docRef = doc(db, "processed_comments", commentId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists(); // Nếu tồn tại rồi -> Trả về true (Đã xử lý)
  } catch (error) {
    return false;
  }
}

// Hàm này đánh dấu comment là đã xong
async function markCommentAsProcessed(commentId: string) {
  try {
    await setDoc(doc(db, "processed_comments", commentId), {
      processedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("🔥 Lỗi đánh dấu comment:", error);
  }
}

// --- 3. GEMINI AI ---
async function askGemini(message: string, history: ChatMessage[]): Promise<string> {
  while (history.length > 0 && history[0].role === "model") { history.shift(); }
  
  const models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const chat = model.startChat({ history: history, generationConfig: { maxOutputTokens: 500 } });
      const result = await chat.sendMessage(message);
      return (await result.response).text();
    } catch (error: any) {
      if (error.message.includes("role 'user'") || error.message.includes("content")) {
         try {
            const fallbackModel = genAI.getGenerativeModel({ model: modelName });
            const chatReset = fallbackModel.startChat({ history: [] });
            const resReset = await chatReset.sendMessage(message);
            return resReset.response.text();
         } catch(e) {}
      }
    }
  }
  return "AI đang bận, thử lại sau nhé!";
}

// --- 4. GỬI TIN NHẮN & REPLY COMMENT ---
async function sendReplyToMessenger(recipientId: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) return;
  const url = `https://graph.facebook.com/v24.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: { id: recipientId }, sender_action: "typing_on" }) });
  const body = { recipient: { id: recipientId }, messaging_type: "RESPONSE", message: { text: text } };
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (e) {}
}

async function replyToComment(commentId: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) return;
  const url = `https://graph.facebook.com/v24.0/${commentId}/comments?access_token=${PAGE_ACCESS_TOKEN}`;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
    const data = await res.json();
    if (data.error) console.error("🔥 Lỗi Reply Comment:", data.error.message);
    else console.log("✅ Đã trả lời comment:", commentId);
  } catch (error) { console.error("🔥 Lỗi mạng Comment:", error); }
}

// --- MAIN HANDLERS ---
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  if (searchParams.get('hub.mode') === 'subscribe' && searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
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
        // --- A. XỬ LÝ TIN NHẮN ---
        if (entry.messaging) {
          const webhook_event = entry.messaging[0];
          if (webhook_event?.message?.text && !webhook_event.message.is_echo) {
            const senderId = webhook_event.sender.id;
            const userMessage = webhook_event.message.text;

            const history = await getChatHistory(senderId);
            const aiReply = await askGemini(userMessage, history);
            
            await sendReplyToMessenger(senderId, aiReply);
            await saveChatToFirebase(senderId, userMessage, aiReply);
          }
        }

        // --- B. XỬ LÝ COMMENT (NÂNG CẤP CHỐNG LOOP) ---
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'feed' && change.value.item === 'comment' && change.value.verb === 'add') {
              const commentId = change.value.comment_id;
              const userMessage = change.value.message;
              const senderId = change.value.from.id;

              // 🛡️ KHÓA 1: Bỏ qua nếu người comment là chính Page (Dựa vào ID Page)
              if (senderId === MY_PAGE_ID) {
                console.log("🚫 Bỏ qua comment của chính Page.");
                continue; 
              }

              // 🛡️ KHÓA 2: Kiểm tra Database xem comment này rep chưa
              const alreadyProcessed = await isCommentProcessed(commentId);
              if (alreadyProcessed) {
                console.log("🚫 Comment này đã trả lời rồi, bỏ qua:", commentId);
                continue;
              }

              console.log(`💬 Xử lý comment mới: ${userMessage}`);
              
              // Gọi AI trả lời
              const aiReply = await askGemini(userMessage, []);
              
              // Trả lời trên Facebok
              await replyToComment(commentId, aiReply);

              // 🛡️ Đánh dấu đã xong vào Database ngay lập tức
              await markCommentAsProcessed(commentId);
            }
          }
        }
      }
      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    }
    return NextResponse.json({ status: 'UNKNOWN' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
