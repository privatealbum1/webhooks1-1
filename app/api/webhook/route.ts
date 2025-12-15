import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ==========================================
// 1. CONFIGURATION (Khởi tạo các kết nối)
// ==========================================

// Config Firebase (Lấy từ Project Settings trong Firebase Console)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Singleton pattern cho Firebase để tránh khởi tạo lại nhiều lần trên Serverless
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Config Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ==========================================
// 2. HELPER FUNCTIONS (Hàm hỗ trợ)
// ==========================================

// Hàm gửi tin nhắn lại Facebook (Call Graph API)
async function sendReplyToFacebook(recipientId: string, messageText: string) {
  const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
  
  if (!PAGE_ACCESS_TOKEN) {
    console.error("Missing FB_PAGE_ACCESS_TOKEN");
    return;
  }

  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: "RESPONSE",
        message: { text: messageText }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Facebook API Error:", errorData);
    }
  } catch (error) {
    console.error("Fetch Error:", error);
  }
}

// Hàm gọi Gemini xử lý ngôn ngữ
async function askGemini(userMessage: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // System Instruction: Đóng vai CSKH
    const prompt = `
      Bạn là nhân viên CSKH của một Fanpage bán hàng uy tín.
      Khách hàng vừa nhắn: "${userMessage}"
      Hãy trả lời ngắn gọn, lịch sự, có icon vui vẻ. Dưới 50 từ.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Hệ thống đang bận, shop sẽ phản hồi lại ngay ạ!"; // Fallback nếu AI lỗi
  }
}

// ==========================================
// 3. MAIN HANDLERS (Xử lý chính)
// ==========================================

// GET: Dùng để Facebook Verify Webhook (Bắt tay lần đầu)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const MY_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === MY_VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Nhận dữ liệu tin nhắn/comment từ Facebook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Kiểm tra xem event có phải từ Page không
    if (body.object === 'page') {
      
      // Duyệt qua các entry (thường chỉ có 1 entry mỗi request)
      for (const entry of body.entry) {
        
        // --- XỬ LÝ TIN NHẮN (MESSAGING) ---
        if (entry.messaging) {
          const webhook_event = entry.messaging[0];
          
          // Lấy Sender ID (Khách hàng) và Message Text
          const senderId = webhook_event.sender.id;
          const messageText = webhook_event.message?.text;

          // QUAN TRỌNG: Bỏ qua nếu không có nội dung text hoặc là tin echo (do chính page gửi)
          if (!messageText || webhook_event.message.is_echo) {
             continue; 
          }

          console.log(`Received message from ${senderId}: ${messageText}`);

          // 1. Trigger Gemini để lấy câu trả lời
          const aiReply = await askGemini(messageText);

          // 2. Gửi phản hồi lại Facebook
          await sendReplyToFacebook(senderId, aiReply);

          // 3. Lưu log vào Firestore (không await để response nhanh hơn)
          setDoc(doc(db, "chats", `${senderId}_${Date.now()}`), {
            senderId: senderId,
            userMessage: messageText,
            aiReply: aiReply,
            createdAt: serverTimestamp(),
            type: "messaging"
          }).catch(e => console.error("Firestore Error:", e));
        }
      }

      // Luôn trả về 200 OK thật nhanh để Facebook không gửi lại
      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    }

    return NextResponse.json({ status: 'UNKNOWN' }, { status: 404 });

  } catch (error) {
    console.error("Webhook Handler Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
