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
  const [showGuide, setShowGuide] = useState(true);
  const [userToken, setUserToken] = useState('');
  const [extendedToken, setExtendedToken] = useState('');
  const [extending, setExtending] = useState(false);

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

  const handleExtendToken = async () => {
    if (!userToken.trim()) {
      alert('Vui lòng nhập User Access Token');
      return;
    }

    setExtending(true);
    try {
      const res = await fetch('/api/facebook/extend-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_token: userToken }),
      });
      const data = await res.json();

      if (data.success && data.access_token) {
        setExtendedToken(data.access_token);
        const days = Math.floor(data.expires_in / 86400);
        setStatus(`✅ Đã extend token thành ${days} ngày! Copy token bên dưới.`);
      } else {
        setStatus('❌ Lỗi: ' + (data.error || 'Không thể extend token'));
      }
    } catch (error) {
      setStatus('❌ Lỗi: ' + String(error));
    } finally {
      setExtending(false);
    }
  };

  const handleManualConnect = async () => {
    if (!extendedToken.trim()) {
      alert('Vui lòng extend token trước!');
      return;
    }

    setLoading(true);
    setStatus("Đang lấy danh sách Pages...");

    try {
      const res = await fetch('/api/connect-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAccessToken: extendedToken }),
      });

      const data = await res.json();

      if (data.success) {
        setPages(data.pages);
        setStatus(`✅ Thành công! Đã kết nối ${data.pages.length} Fanpage với token vĩnh viễn.`);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Kết Nối Facebook Page
          </h1>
          <p className="text-gray-600 text-lg">
            Kết nối Fanpage với Token Vĩnh Viễn để tự động hóa
          </p>
        </div>

        {/* HƯỚNG DẪN LẤY TOKEN VĨNH VIỄN */}
        {showGuide && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-8 mb-8">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                🔑 Hướng Dẫn Lấy Token Vĩnh Viễn
              </h2>
              <button
                onClick={() => setShowGuide(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="bg-white rounded-xl p-6 mb-6">
              <p className="text-red-600 font-semibold mb-4">
                ⚠️ Token từ Login Button chỉ tồn tại 1 giờ! Hãy làm theo các bước sau để có token vĩnh viễn:
              </p>

              {/* BƯỚC 1 */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                  Generate User Token với đủ quyền
                </h3>
                <div className="ml-10 space-y-3">
                  <p className="text-gray-700">
                    Vào <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">Graph API Explorer</a>
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">✅ Cần có đủ <strong>7 quyền</strong> sau:</p>
                    <ul className="text-sm text-gray-700 space-y-1 ml-4">
                      <li>✓ pages_show_list</li>
                      <li>✓ pages_read_engagement</li>
                      <li>✓ pages_manage_posts</li>
                      <li>✓ pages_manage_metadata</li>
                      <li>✓ pages_messaging</li>
                      <li>✓ read_insights</li>
                      <li>✓ pages_read_user_content</li>
                    </ul>
                  </div>
                  <p className="text-gray-700">
                    Nhấn <strong>"Generate Access Token"</strong> → Copy token (token này chỉ sống 1 giờ)
                  </p>
                  <input
                    type="text"
                    value={userToken}
                    onChange={(e) => setUserToken(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-mono text-sm"
                    placeholder="Paste User Access Token (1 giờ) vào đây..."
                  />
                </div>
              </div>

              {/* BƯỚC 2 */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                  Extend Token thành 60 ngày
                </h3>
                <div className="ml-10 space-y-3">
                  <p className="text-gray-700 mb-3">
                    Dùng <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">Access Token Debugger</a> hoặc click nút bên dưới:
                  </p>
                  <button
                    onClick={handleExtendToken}
                    disabled={extending || !userToken}
                    className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                      extending || !userToken
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {extending ? '⏳ Đang extend...' : '🔄 Extend Token (60 ngày)'}
                  </button>
                  {extendedToken && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-green-700 mb-2">✅ Token 60 ngày:</p>
                      <textarea
                        value={extendedToken}
                        readOnly
                        className="w-full px-4 py-3 border-2 border-green-500 rounded-lg font-mono text-sm bg-green-50"
                        rows={3}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(extendedToken);
                          alert('✅ Đã copy!');
                        }}
                        className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        📋 Copy Token
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* BƯỚC 3 */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                  Lấy Token Page Vĩnh Viễn
                </h3>
                <div className="ml-10 space-y-3">
                  <p className="text-gray-700">
                    Quay lại <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">Graph API Explorer</a>, dán token 60 ngày vào
                  </p>
                  <p className="text-gray-700">
                    Gọi endpoint: <code className="bg-gray-100 px-2 py-1 rounded">me/accounts?fields=name,access_token</code>
                  </p>
                  <p className="text-gray-700">
                    → Lấy <strong>access_token</strong> của từng Page (đây là token vĩnh viễn!)
                  </p>
                  <p className="text-sm text-gray-600 italic">
                    💡 Hoặc click nút bên dưới để hệ thống tự động lấy:
                  </p>
                  <button
                    onClick={handleManualConnect}
                    disabled={loading || !extendedToken}
                    className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                      loading || !extendedToken
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {loading ? '⏳ Đang kết nối...' : '🚀 Kết Nối Pages (Token Vĩnh Viễn)'}
                  </button>
                </div>
              </div>
            </div>

            {status && (
              <div className={`mt-4 p-4 rounded-lg ${
                status.includes('✅') ? 'bg-green-100 text-green-800' :
                status.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {status}
              </div>
            )}
          </div>
        )}

        {!showGuide && (
          <button
            onClick={() => setShowGuide(true)}
            className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            📖 Xem hướng dẫn lấy Token Vĩnh Viễn
          </button>
        )}

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
