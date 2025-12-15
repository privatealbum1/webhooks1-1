import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- CONFIG ---
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "dungdev_secret_code_123";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Khởi tạo Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "API_KEY_THIEU");

// --- HELPER: Gửi tin nhắn lại Facebook ---
async function sendReplyToFacebook(recipientId, text) {
  if (!PAGE_ACCESS_TOKEN) {
    console.error("Lỗi: Chưa có FB_PAGE_ACCESS_TOKEN");
    return;
  }

  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  
  const body = {
    recipient: { id: recipientId },
    messaging_type: "RESPONSE",
    message: { text: text }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    if (data.error) {
      console.error("Lỗi gửi Facebook:", data.error);
    } else {
      console.log("Đã gửi tin nhắn thành công!");
    }
  } catch (error) {
    console.error("Lỗi Fetch:", error);
  }
}

// --- HELPER: Hỏi Gemini ---
async function askGemini(message) {
  if (!GEMINI_API_KEY) return "Xin lỗi, hệ thống AI đang bảo trì (Thiếu Key).";
  
  try {
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // Prompt đóng vai nhân viên CSKH
    const prompt = `Bạn là nhân viên chăm sóc khách hàng thân thiện. Khách nói: "${message}". Hãy trả lời ngắn gọn, vui vẻ dưới 50 từ.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Lỗi Gemini:", error);
    return "Hiện tại tôi đang bận xíu, sẽ trả lời bạn sau nhé!";
  }
}

// --- MAIN: Xử lý Webhook ---

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (body.object === 'page') {
      // Duyệt qua các sự kiện (thường chỉ có 1)
      for (const entry of body.entry) {
        // Chỉ xử lý tin nhắn (messaging)
        const webhook_event = entry.messaging ? entry.messaging[0] : null;

        if (webhook_event) {
          const senderId = webhook_event.sender.id;
          
          // QUAN TRỌNG: Bỏ qua tin nhắn delivery, read, hoặc tin nhắn do chính Page gửi (echo)
          // Nếu không chặn cái này, Bot sẽ tự chat với chính nó vô tận!
          if (webhook_event.message && !webhook_event.message.is_echo && webhook_event.message.text) {
            
            const userMessage = webhook_event.message.text;
            console.log(`Nhận tin từ ${senderId}: ${userMessage}`);

            // 1. Hỏi Gemini (Chờ 1 chút)
            const aiReply = await askGemini(userMessage);

            // 2. Trả lời lại Facebook
            await sendReplyToFacebook(senderId, aiReply);
          }
        }
      }
      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    }

    return NextResponse.json({ status: 'UNKNOWN' }, { status: 404 });
  } catch (error) {
    console.error("Lỗi Server:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
