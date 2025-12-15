// app/dashboard/kols/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, TrendingUp, MessageCircle, User } from 'lucide-react';

export default function KOLDashboard() {
  const [kols, setKols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchKOLs();
  }, []);

  const fetchKOLs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kols');
      const data = await res.json();
      if (data.success) {
        setKols(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch KOL profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Xóa KOL "${name}"? Hành động này không thể hoàn tác.`)) return;
    
    try {
      const res = await fetch(`/api/kols/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        setKols(kols.filter(k => k.id !== id));
        alert('Đã xóa thành công!');
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi kết nối server');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      paused: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.draft;
  };

  const getToneEmoji = (tone) => {
    const emojis = {
      friendly: '😊',
      professional: '💼',
      humorous: '😄',
      motivational: '💪',
      storyteller: '📖'
    };
    return emojis[tone] || '👤';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">KOL Profiles</h1>
            <p className="text-gray-600">Quản lý danh sách AI KOL của bạn</p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard/kols/create'}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            Tạo KOL Mới
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Tổng KOL</p>
                <p className="text-3xl font-bold text-gray-800">{kols.length}</p>
              </div>
              <User className="text-indigo-500" size={40} />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Đang Hoạt Động</p>
                <p className="text-3xl font-bold text-green-600">
                  {kols.filter(k => k.status === 'active').length}
                </p>
              </div>
              <TrendingUp className="text-green-500" size={40} />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Comments Replied</p>
                <p className="text-3xl font-bold text-blue-600">
                  {kols.reduce((sum, k) => sum + (k.stats?.total_comments_replied || 0), 0)}
                </p>
              </div>
              <MessageCircle className="text-blue-500" size={40} />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Messages Replied</p>
                <p className="text-3xl font-bold text-purple-600">
                  {kols.reduce((sum, k) => sum + (k.stats?.total_messages_replied || 0), 0)}
                </p>
              </div>
              <MessageCircle className="text-purple-500" size={40} />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* KOL List */}
        {kols.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md">
            <User size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có KOL nào</h3>
            <p className="text-gray-500 mb-6">Bắt đầu bằng cách tạo KOL profile đầu tiên của bạn</p>
            <button
              onClick={() => window.location.href = '/dashboard/kols/create'}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all"
            >
              Tạo KOL Đầu Tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kols.map((kol) => (
              <div key={kol.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden">
                {/* Avatar & Status */}
                <div className="relative h-48 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                  {kol.avatar ? (
                    <img src={kol.avatar} alt={kol.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-8xl">{getToneEmoji(kol.personality?.tone)}</span>
                  )}
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(kol.status)}`}>
                    {kol.status}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{kol.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {kol.description || 'Không có mô tả'}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Comments</p>
                      <p className="text-lg font-bold text-blue-600">
                        {kol.stats?.total_comments_replied || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-500">Messages</p>
                      <p className="text-lg font-bold text-purple-600">
                        {kol.stats?.total_messages_replied || 0}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
                      {kol.personality?.tone || 'N/A'}
                    </span>
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                      {kol.personality?.language || 'N/A'}
                    </span>
                    {kol.connected_pages?.length > 0 && (
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                        {kol.connected_pages.length} Pages
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.location.href = `/dashboard/kols/${kol.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit size={16} />
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => handleDelete(kol.id, kol.name)}
                      className="flex items-center justify-center bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
