import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAccessToken } = body;

    if (!userAccessToken) {
      return NextResponse.json({ error: "Thiếu User Token" }, { status: 400 });
    }

    // 1. Gọi Facebook API để lấy danh sách Page của user này
    // Token User 60 ngày sẽ được đổi thành Token Page vĩnh viễn tại đây
    const fbUrl = `https://graph.facebook.com/v24.0/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token`;
    
    const fbRes = await fetch(fbUrl);
    const fbData = await fbRes.json();

    if (fbData.error) {
      console.error("FB Error:", fbData.error);
      return NextResponse.json({ error: fbData.error.message }, { status: 400 });
    }

    if (!fbData.data || fbData.data.length === 0) {
      return NextResponse.json({ error: "Bạn không quản lý Fanpage nào." }, { status: 400 });
    }

    const savedPages = [];

    // 2. Lưu từng Page vào Firebase
    for (const page of fbData.data) {
      const pageId = page.id;
      const pageAccessToken = page.access_token; // Đây là Token vĩnh viễn của Page

      // A. Lưu vào Collection 'registered_pages'
      // Webhook sẽ đọc collection này để lấy Token trả lời comment
      await setDoc(doc(db, "registered_pages", pageId), {
        pageName: page.name,
        accessToken: pageAccessToken,
        isActive: true,
        updatedAt: serverTimestamp()
      });

      // B. Tự động đăng ký Webhook (Subscribe App)
      // Để Facebook bắt đầu gửi tin nhắn về Webhook của bạn
      try {
        await fetch(`https://graph.facebook.com/v24.0/${pageId}/subscribed_apps?access_token=${pageAccessToken}&subscribed_fields=feed,messages`, {
          method: 'POST'
        });
      } catch (err) {
        console.error(`Lỗi Subscribe Page ${page.name}:`, err);
      }

      savedPages.push({ id: page.id, name: page.name });
    }

    return NextResponse.json({ success: true, pages: savedPages });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Lỗi xử lý phía Server" }, { status: 500 });
  }
}
