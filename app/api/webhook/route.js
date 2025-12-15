import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- CONFIG ---
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "dungdev_secret_code_123";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Khởi tạo Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// --- HELPER: Gửi tin nhắn lại Facebook ---
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

// --- HELPER: Hỏi Gemini ---
async function askGemini(message) {
  if (!GEMINI_API_KEY) return "Bot đang bảo trì (Thiếu Key).";
  
  try {
    // SỬA: Thêm { apiVersion: 'v1beta' } để chắc chắn gọi được model 1.5 Flash
    // Lưu ý: SDK JS mới nhất tự động handle việc này, nhưng ta cứ dùng model chuẩn
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Bạn là nhân viên CSKH thân thiện. Khách nói: "${message}". Trả lời ngắn gọn, vui vẻ dưới 50 từ.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Lỗi Gemini Chi Tiết:", error);
    // Fallback: Nếu 1.5 lỗi, thử gọi model cũ gemini-pro (1.0)
    try {
        const modelBackup = genAI.getGenerativeModel({ model: "gemini-pro" });
        const resultBackup = await modelBackup.generateContent(message);
        return resultBackup.response.text();
    } catch (e) {
        return "Hiện tại em đang bận xíu, lát em check tin nhắn anh/chị ngay ạ! ❤️";
    }
  }
}

// --- MAIN HANDLERS ---
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
            const userMessage = webhook_event.message.text;
            
            // Trả lời ngay lập tức (không await để tránh Facebook timeout)
            const aiReply = await askGemini(userMessage);
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
