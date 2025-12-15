"use client";
import { useState } from 'react';
import FacebookLogin from '@greatsumini/react-facebook-login'; // Cài: npm i @greatsumini/react-facebook-login

export default function ConnectPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [status, setStatus] = useState("");

  // 1. Sau khi khách Login FB thành công -> Lấy User Token
  const onLoginSuccess = async (response: any) => {
    setStatus("Đang lấy danh sách Page...");
    const userAccessToken = response.accessToken;

    // Gọi API để lấy danh sách Page và lưu vào Firebase
    const res = await fetch('/api/connect-page', {
      method: 'POST',
      body: JSON.stringify({ userAccessToken }),
    });
    const data = await res.json();
    setPages(data.pages);
    setStatus("Đã tải xong! Bot đã tự động kích hoạt cho các Page dưới đây:");
  };

  return (
    <div style={{ padding: 50, textAlign: 'center' }}>
      <h1>Kích hoạt Bot cho Page của bạn</h1>
      
      {/* Nút Login Facebook */}
      <FacebookLogin
        appId="ID_APP_CUA_BAN_LAY_TREN_META" // 🔴 Điền App ID vào đây
        onSuccess={onLoginSuccess}
        onFail={(error) => console.log('Login Failed!', error)}
        onProfileSuccess={(response) => console.log('Get Profile Success!', response)}
        style={{ backgroundColor: '#4267b2', color: '#fff', padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: 5 }}
        children="Kết nối với Facebook"
        scope="pages_manage_engagement,pages_read_engagement,pages_messaging,pages_show_list,pages_read_user_content,pages_manage_metadata" 
        // 👆 Xin đủ quyền như Token xịn của bạn
      />

      <p>{status}</p>

      {/* Danh sách Page đã kết nối */}
      <div style={{ marginTop: 20 }}>
        {pages.map((page) => (
          <div key={page.id} style={{ border: '1px solid #ccc', padding: 10, margin: 10, borderRadius: 8 }}>
            <h3>{page.name}</h3>
            <p>✅ Đã kích hoạt Bot thành công</p>
            <small>ID: {page.id}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
