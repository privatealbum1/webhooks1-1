import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const { userAccessToken } = await request.json();

    // 1. Dùng User Token để lấy danh sách Page và Token của từng Page
    const fbRes = await fetch(`https://graph.facebook.com/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token`);
    const fbData = await fbRes.json();

    if (!fbData.data) {
      return NextResponse.json({ error: "Không tìm thấy Page nào" }, { status: 400 });
    }

    const savedPages = [];

    // 2. Duyệt qua từng Page để lưu vào Firebase + Đăng ký Webhook
    for (const page of fbData.data) {
      const pageId = page.id;
      const pageAccessToken = page.access_token;

      // A. Lưu vào Firebase (Để Webhook sau này biết đường lấy Token mà rep)
      await setDoc(doc(db, "registered_pages", pageId), {
        pageName: page.name,
        accessToken: pageAccessToken,
        isActive: true,
        connectedAt: serverTimestamp()
      });

      // B. QUAN TRỌNG: Tự động Subscribe Webhook cho Page này
      // (Thay vì phải vào Meta Developer bấm nút Subscribe thủ công)
      await fetch(`https://graph.facebook.com/${pageId}/subscribed_apps?access_token=${pageAccessToken}&subscribed_fields=feed,messages`, {
        method: 'POST'
      });

      savedPages.push(page);
    }

    return NextResponse.json({ success: true, pages: savedPages });

  } catch (error) {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
