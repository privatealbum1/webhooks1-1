import { NextResponse } from 'next/server';
// Import theo chuẩn ES Modules của Google
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- CONFIGURATION ---
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "dungdev_secret_code_123";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
// Lưu ý: Tạm thời dán cứng Key để test, chạy được thì đưa vào .env sau
const GEMINI_API_KEY = "AIzaSyAkKdz2qkgR8zYFtI_HvwHvrSjmEOD1Kv0"; 

// Khởi tạo Client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- FACEBOOK REPLY FUNCTION ---
async function sendReplyToFacebook(recipientId, text) {
  if (!PAGE_ACCESS_TOKEN) return;
  
  try {
    const url = `https://graph.facebook.com/v24.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    const body = {
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text: text }
    };

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("Facebook Error:", error);
  }
}

// --- GEMINI FUNCTION (CHUẨN TÀI LIỆU) ---
async function askGemini(message) {
  try {
    // Theo tài liệu Google: Dùng model alias chuẩn "gemini-1.5-flash"
    // SDK mới nhất sẽ tự động map sang version phù hợp
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Xin lỗi, hệ thống đang bận. Bạn thử lại sau nhé!";
  }
}

// --- WEBHOOK HANDLERS ---
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('hub.mode') === 'subscribe' && searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.object === 'page') {
      for (const entry of body.entry) {
        const webhook_event = entry.messaging ? entry.messaging[0] : null;
        if (webhook_event && webhook_event.message && !webhook_event.message.is_echo && webhook_event.message.text) {
          const senderId = webhook_event.sender.id;
          // Gọi AI
          const aiReply = await askGemini(webhook_event.message.text);
          // Gửi phản hồi
          await sendReplyToFacebook(senderId, aiReply);
        }
      }
      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    }
    return NextResponse.json({ status: 'UNKNOWN' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
