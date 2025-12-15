import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- CONFIG ---
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "dungdev_secret_code_123";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

// 🔴 THAY ĐỔI Ở ĐÂY: Dán trực tiếp API Key của bạn vào dấu ngoặc kép dưới đây
// Ví dụ: const GEMINI_API_KEY = "AIzaSyAkKdz2qkgR8zYFtI_HvwHvrSjmEOD1Kv0";
const GEMINI_API_KEY = "AIzaSyAkKdz2qkgR8zYFtI_HvwHvrSjmEOD1Kv0"; 

// Khởi tạo Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ... (Giữ nguyên các phần code helper sendReplyToFacebook như cũ) ...

async function sendReplyToFacebook(recipientId, text) {
  if (!PAGE_ACCESS_TOKEN) return;
  const url = `https://graph.facebook.com/v24.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
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
    console.error("Lỗi gửi Facebook:", error);
  }
}

async function askGemini(message) {
  try {
    // 🔴 QUAN TRỌNG: Nếu gemini-1.5-flash vẫn lỗi, hãy thử đổi thành "gemini-pro"
    // Nhưng với Key mới, 1.5-flash phải chạy được!
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Bạn là trợ lý ảo. Khách nói: "${message}". Trả lời ngắn gọn dưới 50 từ:`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("❌ Lỗi Gemini Chi Tiết:", error);
    return "Bot đang bị lỗi kết nối AI, xin thử lại sau! 🤖";
  }
}

// ... (Giữ nguyên phần POST và GET handler như cũ) ...
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
            const aiReply = await askGemini(webhook_event.message.text);
            await sendReplyToFacebook(senderId, aiReply);
        }
      }
      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    }
    return NextResponse.json({ status: 'UNKNOWN' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
