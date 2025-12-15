import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

// --- CONFIG ---
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "dungdev_secret_code_123";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 

// Khởi tạo SDK
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- TYPES (Định nghĩa kiểu dữ liệu để code gợi ý thông minh) ---
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
      // Đảo ngược lại để cũ trước - mới sau
      if (data.userMessage) history.unshift({ role: "user", parts: [{ text: data.userMessage }] });
      if (data.botReply) history.unshift({ role: "model", parts: [{ text: data.botReply }] });
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

// --- 3. GEMINI SDK (LOGIC FALLBACK THÔNG MINH) ---
async function askGemini(message: string, history: ChatMessage[]): Promise<string> {
  // Danh sách model ưu tiên cho Tier 1
  const models = ["gemini-1.5-flash-001", "gemini-1.5-pro-001", "gemini-pro"];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const chat = model.startChat({
        history: history, // SDK tự xử lý history, rất tiện!
        generationConfig: {
          maxOutputTokens: 200, // Giới hạn độ dài trả lời
        },
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text();

    } catch (error: any) {
      console.warn(`⚠️ Model ${modelName} bị lỗi:`, error.message);
      // Tiếp tục vòng lặp để thử model tiếp theo
    }
  }

  return "Hệ thống đang bảo trì, vui lòng thử lại sau! 🤖";
}

// --- 4. FACEBOOK: GỬI TIN & TYPING ---
async function sendReplyToFacebook(recipientId: string, text: string) {
  if (!PAGE_ACCESS_TOKEN) return;
  const url = `https://graph.facebook.com/v24.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  // Gửi trạng thái "Đang soạn tin..." (Sender Action)
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, sender_action: "typing_on" })
  });

  // Gửi tin nhắn thật
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
  } catch (error) {
    console.error("🔥 Lỗi gửi FB:", error);
  }
}

// --- MAIN ROUTE HANDLERS ---

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
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

          // Xử lý Logic
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
    console.error("🔥 Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
