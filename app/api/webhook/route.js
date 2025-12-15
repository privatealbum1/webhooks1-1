import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- CONFIG ---
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "dungdev_secret_code_123";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Khởi tạo Gemini (Đã fix lỗi thư viện cũ)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// --- HELPER: Gửi tin nhắn lại Facebook ---
async function sendReplyToFacebook(recipientId, text) {
  if (!PAGE_ACCESS_TOKEN) {
    console.error("❌ LỖI NGHIÊM TRỌNG: Chưa có FB_PAGE_ACCESS_TOKEN trong biến môi trường!");
    return;
  }

  // CẬP NHẬT: Dùng bản v24.0 mới nhất để khớp với Token của bạn
  const url = `https://graph.facebook.com/v24.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  
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
      // Log lỗi chi tiết để debug
      console.error("❌ Facebook API Error:", JSON.stringify(data.error, null, 2));
      if (data.error.code === 190) console.error("👉 Nguyên nhân: Token hết hạn hoặc không đúng Token PAGE.");
      if (data.error.code === 100) console.error("👉 Nguyên nhân: Sai quyền hoặc Token Cá Nhân (User Token). Hãy lấy lại Page Token.");
    } else {
      console.log("✅ Đã gửi tin nhắn thành công!");
    }
  } catch (error) {
    console.error("❌ Lỗi mạng (Fetch):", error);
  }
}

// --- HELPER: Hỏi Gemini ---
async function askGemini(message) {
  if (!GEMINI_API_KEY) return "Bot đang bảo trì (Thiếu Key).";
  
  try {
    // Model chuẩn: gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Prompt nhập vai
    const prompt = `Bạn là trợ lý ảo vui tính. Khách hỏi: "${message}". Trả lời ngắn gọn dưới 50 từ:`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("❌ Lỗi Gemini:", error);
    // Thử model backup nếu 1.5 lỗi
    try {
        const modelBackup = genAI.getGenerativeModel({ model: "gemini-pro" });
        const res = await modelBackup.generateContent(message);
        return res.response.text();
    } catch (e) {
        return "Hiện tại não bộ em đang nâng cấp, anh/chị chờ xíu nhé! 🤖";
    }
  }
}

// --- MAIN HANDLERS ---
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  // Xác thực Webhook
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
        // Lấy tin nhắn đầu tiên trong mảng messaging
        const webhook_event = entry.messaging ? entry.messaging[0] : null;

        if (webhook_event && webhook_event.message && !webhook_event.message.is_echo && webhook_event.message.text) {
            const senderId = webhook_event.sender.id;
            const userMessage = webhook_event.message.text;
            
            console.log(`📩 Nhận tin từ khách ${senderId}: ${userMessage}`);

            // Xử lý song song: Vừa hỏi AI, vừa log (nếu cần)
            const aiReply = await askGemini(userMessage);
            
            // Gửi trả lời
            await sendReplyToFacebook(senderId, aiReply);
        }
      }
      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    }

    return NextResponse.json({ status: 'UNKNOWN' }, { status: 404 });
  } catch (error) {
    console.error("❌ Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
