"use client";
import { useState } from 'react';
import FacebookLogin from '@greatsumini/react-facebook-login';

// 🔴 QUAN TRỌNG: Thay số này bằng App ID lấy trong: developers.facebook.com -> App Settings -> Basic
const YOUR_FB_APP_ID = "3918018128495962"; 

export default function ConnectPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Xử lý khi đăng nhập thành công
  const onLoginSuccess = async (response: any) => {
    setLoading(true);
    setStatus("Đang kết nối với hệ thống...");
    
    try {
      const userAccessToken = response.accessToken;

      // Gọi API nội bộ (Serverless Function trên Vercel)
      const res = await fetch('/api/connect-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAccessToken }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setPages(data.pages);
        setStatus(`✅ Thành công! Đã kích hoạt Bot cho ${data.pages.length} Fanpage.`);
      } else {
        setStatus("❌ Lỗi: " + data.error);
      }
    } catch (error) {
      setStatus("❌ Lỗi kết nối server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '50px 20px', maxWidth: 600, margin: '0 auto', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 30 }}>Kích hoạt Auto Comment & Inbox</h1>
      
      {!loading && pages.length === 0 && (
        <div style={{ marginBottom: 20 }}>
          <FacebookLogin
            appId={YOUR_FB_APP_ID}
            onSuccess={onLoginSuccess}
            onFail={(error) => setStatus('Đăng nhập thất bại!')}
            style={{
              backgroundColor: '#1877F2',
              color: '#fff',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            children="Kết nối Facebook & Kích hoạt Bot"
            // Xin đủ quyền để Bot hoạt động
            scope="pages_manage_engagement,pages_read_engagement,pages_messaging,pages_show_list,pages_read_user_content,pages_manage_metadata" 
          />
        </div>
      )}

      {loading && <p>⏳ Đang xử lý, vui lòng đợi...</p>}
      
      {status && <p style={{ marginTop: 20, fontWeight: 'bold' }}>{status}</p>}

      {pages.length > 0 && (
        <div style={{ marginTop: 30, textAlign: 'left' }}>
          <h3>Danh sách Page đã kích hoạt:</h3>
          {pages.map((page) => (
            <div key={page.id} style={{ 
              padding: 15, 
              border: '1px solid #ddd', 
              borderRadius: 8, 
              marginBottom: 10,
              backgroundColor: '#f9f9f9' 
            }}>
              <div style={{ fontWeight: 'bold', fontSize: 18 }}>{page.name}</div>
              <div style={{ color: '#666', fontSize: 14 }}>ID: {page.id}</div>
              <div style={{ color: 'green', marginTop: 5 }}>● Đã bật tự động trả lời</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
