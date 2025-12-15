import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- CONFIG ---
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "dungdev_secret_code_123";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

// 🔴 LƯU Ý: Vẫn dùng Key dán cứng để test (nếu test OK nhớ đổi lại process.env sau)
const GEMINI_API_KEY = "DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY"; 

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- GỬI TIN FACEBOOK ---
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
    console.error("Lỗi gửi FB:", error);
  }
}

// --- HỎI GEMINI (LOGIC FALLBACK THÔNG MINH) ---
async function askGemini(message) {
  // Danh sách các model để thử lần lượt (Ưu tiên Flash 001 cho Tier 1)
  const modelsToTry = ["gemini-1.5-flash-001", "gemini-1.5-pro-001", "gemini-pro"];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`👉 Đang thử gọi model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `Bạn là trợ lý ảo. Khách nói: "${message}". Trả lời ngắn gọn dưới 50 từ:`;
      
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      console.log(`✅ Thành công với model: ${modelName}`);
      return responseText; // Trả về ngay nếu thành công
      
    } catch (error) {
      console.error(`❌ Lỗi model ${modelName}: ${error.message}`);
      // Nếu lỗi, vòng lặp sẽ tự chạy tiếp sang model tiếp theo trong danh sách
    }
  }

  // Nếu thử hết danh sách mà vẫn lỗi
  return "Hệ thống AI đang bảo trì, vui lòng thử lại sau giây lát! 🤖";
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
            // Gọi hàm AI thông minh
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
