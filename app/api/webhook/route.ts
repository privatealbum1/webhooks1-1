import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
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

// --- 1. FIREBASE: LẤY LỊCH SỬ ---
async function getChatHistory(senderId: string): Promise<ChatMessage[]> {
  try {
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef, 
      where("senderId", "==", senderId), 
      orderBy("createdAt", "desc"), 
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    const history: ChatMessage[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Logic chuẩn: Unshift Bot trước -> Unshift User sau
      // Kết quả mảng sẽ là: [User, Bot, User, Bot...]
      if (data.botReply) {
        history.unshift({ role: "model", parts: [{ text: data.botReply }] });
      }
      if (data.userMessage) {
        history.unshift({ role: "user", parts: [{ text: data.userMessage }] });
      }
    });
    
    return history;
  } catch (error) {
    console.error("🔥 Lỗi lấy lịch sử:", error);
    return [];
  }
}

// --- 2. FIREBASE: LƯU CHAT ---
async function saveChatToFirebase(senderId: string, userMsg: string, botMsg: string) {
  try {
    await addDoc(collection(db, "chats"), {
      senderId,
      userMessage: userMsg,
      botReply: botMsg,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("🔥 Lỗi lưu chat:", error);
  }
}

// --- 3. GEMINI SDK (CÓ BỘ LỌC AN TOÀN) ---
async function askGemini(message: string, history: ChatMessage[]): Promise<string> {
  // 🔴 BỘ LỌC QUAN TRỌNG: Xóa sạch tin nhắn Bot ở đầu hàng
  // Đảm bảo tin đầu tiên LUÔN LUÔN là "user"
  while (history.length > 0 && history[0].role === "model") {
    history.shift(); 
  }

  // Danh sách model (Dùng Alias ngắn gọn để tránh lỗi version)
  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const chat = model.startChat({
        history: history, 
        generationConfig: { maxOutputTokens: 300 },
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text();

    } catch (error: any) {
      console.warn(`⚠️ Model ${modelName} lỗi:`, error.message);
      
      // 🔴 FIX LỖI SCOPE (Cannot find name 'model'):
      // Khởi tạo lại model mới bên trong catch để reset
      if (error.message.includes("role 'user'") || error.message.includes("content")) {
         try {
            const fallbackModel = genAI.getGenerativeModel({ model: modelName });
            const chatReset = fallbackModel.startChat({ history: [] }); // Reset lịch sử về 0
            const resReset = await chatReset.sendMessage(message);
            return resReset.response.text();
         } catch(e) {
            // Nếu reset cũng lỗi thì bỏ qua
         }
      }
    }
  }

  return "Hệ thống đang bảo trì, vui lòng thử lại sau! 🤖";
}

// --- 4. FACEBOOK REPLY ---
async function sendReplyToFacebook(recipientId: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) return;
  const url = `https://graph.facebook.com/v24.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  // Gửi trạng thái đang gõ
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
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (error) { console.error("🔥 Lỗi FB:", error); }
}

// --- HANDLERS ---
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
        const webhook_event = entry.messaging ? entry.messaging[0] : null;
        if (webhook_event?.message?.text && !webhook_event.message.is_echo) {
          const senderId = webhook_event.sender.id;
          const userMessage = webhook_event.message.text;

          const history = await getChatHistory(senderId);
          const aiReply = await askGemini(userMessage, history);
          
          await sendReplyToFacebook(senderId, aiReply);
          await saveChatToFirebase(senderId, userMessage, aiReply);
        }
      }
      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    }
    return NextResponse.json({ status: 'UNKNOWN' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
