// app/connect/page.tsx
'use client';

import { useState, useEffect } from 'react';
import FacebookLogin from '@greatsumini/react-facebook-login';

const YOUR_FB_APP_ID = "3918018128495962";

export default function ConnectPageUpgraded() {
  const [pages, setPages] = useState([]);
  const [kols, setKols] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedKOLs, setSelectedKOLs] = useState({});

  useEffect(() => {
    fetchKOLs();
  }, []);

  const fetchKOLs = async () => {
    try {
      const res = await fetch('/api/kols');
      const data = await res.json();
      if (data.success) {
        setKols(data.data.filter(k => k.status === 'active'));
      }
    } catch (err) {
      console.error('Failed to fetch KOLs:', err);
    }
  };

  const onLoginSuccess = async (response) => {
    setLoading(true);
    setStatus("Đang kết nối với hệ thống...");
    
    try {
      const userAccessToken = response.accessToken;

      const res = await fetch('/api/connect-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAccessToken }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setPages(data.pages);
        setStatus(`✅ Thành công! Đã kết nối ${data.pages.length} Fanpage.`);
      } else {
        setStatus("❌ Lỗi: " + data.error);
      }
    } catch (error) {
      setStatus("❌ Lỗi kết nối server.");
    } finally {
      setLoading(false);
    }
  };

  const handleKOLSelection = (pageId, kolId) => {
    setSelectedKOLs({ ...selectedKOLs, [pageId]: kolId });
  };

  const handleLinkKOL = async (pageId) => {
    const kolId = selectedKOLs[pageId];
    if (!kolId) {
      alert('Vui lòng chọn KOL trước!');
      return;
    }

    try {
      const kolRes = await fetch(`/api/kols/${kolId}`);
      const kolData = await kolRes.json();
      
      if (!kolData.success) {
        alert('Không tìm thấy KOL');
        return;
      }

      const currentPages = kolData.data.connected_pages || [];
      
      if (currentPages.includes(pageId)) {
        alert('Page này đã được link với KOL này rồi!');
        return;
      }

      const updateRes = await fetch(`/api/kols/${kolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connected_pages: [...currentPages, pageId]
        })
      });

      const updateData = await updateRes.json();
      
      if (updateData.success) {
        alert('✅ Đã link Page với KOL thành công!');
        setPages(pages.map(p => 
          p.id === pageId ? { ...p, linkedKOL: kolData.data.name } : p
        ));
      } else {
        alert('Lỗi: ' + updateData.error);
      }
    } catch (err) {
      alert('Lỗi kết nối server');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Kết Nối Facebook Page
          </h1>
          <p className="text-gray-600 text-lg">
            Kết nối Fanpage và gán KOL AI để bắt đầu tự động hóa
          </p>
        </div>

        {kols.length === 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-6 text-center">
            <p className="text-yellow-800 font-semibold mb-2">⚠️ Chưa có KOL nào!</p>
            <p className="text-yellow-700 mb-4">Bạn cần tạo ít nhất 1 KOL trước khi kết nối Page</p>
            <button
              onClick={() => window.location.href = '/dashboard/kols/create'}
              className="bg-yellow-500 text-white px-6 py-3 rounded-xl hover:bg-yellow-600 transition-colors font-semibold"
            >
              Tạo KOL Ngay
            </button>
          </div>
        )}

        {!loading && pages.length === 0 && (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Kết Nối với Facebook
              </h2>
              <p className="text-gray-600 mb-8">
                Đăng nhập để kết nối các Fanpage của bạn với hệ thống KOL AI
              </p>
            </div>

            <FacebookLogin
              appId={YOUR_FB_APP_ID}
              onSuccess={onLoginSuccess}
              onFail={(error) => setStatus('❌ Đăng nhập thất bại!')}
              className="inline-flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-bold text-lg"
              children="🚀 Kết Nối Facebook"
              scope="pages_manage_engagement,pages_read_engagement,pages_messaging,pages_show_list,pages_read_user_content,pages_manage_metadata" 
            />
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">⏳ Đang xử lý, vui lòng đợi...</p>
          </div>
        )}
        
        {status && (
          <div className={`rounded-2xl p-6 mb-6 text-center font-semibold ${
            status.includes('✅') 
              ? 'bg-green-50 border-2 border-green-200 text-green-800' 
              : 'bg-red-50 border-2 border-red-200 text-red-800'
          }`}>
            {status}
          </div>
        )}

        {pages.length > 0 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                📋 Danh Sách Fanpage
              </h2>
              <p className="text-gray-600 mb-6">
                Gán KOL AI cho từng Fanpage để bắt đầu tự động hóa
              </p>

              <div className="space-y-4">
                {pages.map((page) => (
                  <div 
                    key={page.id} 
                    className="border-2 border-gray-200 rounded-2xl p-6 hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {page.name}
                        </h3>
                        <p className="text-gray-500 text-sm mb-3">
                          Page ID: {page.id}
                        </p>
                        
                        {page.linkedKOL && (
                          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
                            <span>✅</span>
                            <span>Đã link với: {page.linkedKOL}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {!page.linkedKOL && kols.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Chọn KOL cho Page này:
                        </label>
                        <div className="flex gap-3">
                          <select
                            value={selectedKOLs[page.id] || ''}
                            onChange={(e) => handleKOLSelection(page.id, e.target.value)}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                          >
                            <option value="">-- Chọn KOL --</option>
                            {kols.map(kol => (
                              <option key={kol.id} value={kol.id}>
                                {kol.name} ({kol.personality.tone})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleLinkKOL(page.id)}
                            disabled={!selectedKOLs[page.id]}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Link KOL
                          </button>
                        </div>
                      </div>
                    )}

                    {!page.linkedKOL && kols.length === 0 && (
                      <div className="bg-yellow-50 rounded-xl p-4 text-center">
                        <p className="text-yellow-800 text-sm">
                          Không có KOL nào. Vui lòng tạo KOL trước!
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-3">🎉 Hoàn Tất!</h3>
              <p className="text-indigo-100 mb-6">
                Bot của bạn đã sẵn sàng tự động trả lời comments và messages
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => window.location.href = '/dashboard/kols'}
                  className="bg-white text-indigo-600 px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors font-semibold"
                >
                  Quản Lý KOL
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard/kols/create'}
                  className="bg-indigo-800 text-white px-6 py-3 rounded-xl hover:bg-indigo-900 transition-colors font-semibold"
                >
                  Tạo KOL Mới
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
