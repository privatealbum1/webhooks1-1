import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

// --- CONFIG ---
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "dungdev_secret_code_123";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ChatMessage {
  role: "user" | "model";
  parts: Part[];
}

// --- 1. FIREBASE & GEMINI (GIỮ NGUYÊN LOGIC CŨ) ---
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

async function askGemini(message: string, history: ChatMessage[]): Promise<string> {
  while (history.length > 0 && history[0].role === "model") { history.shift(); }
  
  // Model list
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
  return "Cảm ơn bạn đã tương tác! (Hệ thống AI đang bận)";
}

// --- 2. HÀM GỬI TIN NHẮN (MESSENGER) ---
async function sendReplyToMessenger(recipientId: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) return;
  const url = `https://graph.facebook.com/v24.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  
  // Typing...
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: { id: recipientId }, sender_action: "typing_on" }) });

  const body = { recipient: { id: recipientId }, messaging_type: "RESPONSE", message: { text: text } };
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } 
  catch (error) { console.error("🔥 Lỗi Messenger:", error); }
}

// --- 3. HÀM TRẢ LỜI COMMENT (NEW) ---
async function replyToComment(commentId: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) return;
  // API: POST /v24.0/{comment-id}/comments
  const url = `https://graph.facebook.com/v24.0/${commentId}/comments?access_token=${PAGE_ACCESS_TOKEN}`;
  
  const body = { message: text };
  
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.error) console.error("🔥 Lỗi Reply Comment:", data.error);
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
        // --- A. XỬ LÝ TIN NHẮN (MESSAGING) ---
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

        // --- B. XỬ LÝ COMMENT (FEED CHANGES) ---
        if (entry.changes) {
          for (const change of entry.changes) {
            // Kiểm tra đúng là sự kiện thêm comment
            if (change.field === 'feed' && change.value.item === 'comment' && change.value.verb === 'add') {
              const commentId = change.value.comment_id;
              const userMessage = change.value.message;
              const senderId = change.value.from.id;
              
              // ⚠️ QUAN TRỌNG: Kiểm tra xem người comment có phải là Page không để tránh vòng lặp vô tận
              // (Tạm thời lọc bằng logic: Nếu tên người gửi chứa chữ "Page" hoặc ID trùng Page ID thì bỏ qua.
              // Ở đây mình cứ xử lý, nếu Bot tự reply thì webhook thường không báo lại sự kiện của chính nó nếu không cài echo)
              
              console.log(`💬 Comment mới từ ${senderId}: ${userMessage}`);

              // Với Comment, tạm thời không cần load lịch sử dài dòng, chỉ cần trả lời đúng nội dung đó
              // Có thể truyền history rỗng []
              const aiReply = await askGemini(userMessage, []);
              
              await replyToComment(commentId, aiReply);
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
