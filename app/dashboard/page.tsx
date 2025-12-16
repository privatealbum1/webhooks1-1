// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Users, MessageCircle, TrendingUp, Zap, ArrowRight } from 'lucide-react';

export default function MainDashboard() {
  const [stats, setStats] = useState({
    totalKOLs: 0,
    activeKOLs: 0,
    totalComments: 0,
    totalMessages: 0,
    totalEngagement: 0,
    totalFollowers: 0,
    totalLikes: 0,
    totalShares: 0,
    totalReach: 0,
    avgEngagementRate: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kols');
      const data = await res.json();
      
      if (data.success) {
        const kols = data.data;
        const totalComments = kols.reduce((sum, k) => sum + (k.stats?.total_comments_replied || 0), 0);
        const totalMessages = kols.reduce((sum, k) => sum + (k.stats?.total_messages_replied || 0), 0);
        const totalFollowers = kols.reduce((sum, k) => sum + (k.stats?.followers_count || 0), 0);
        const totalLikes = kols.reduce((sum, k) => sum + (k.stats?.total_likes || 0), 0);
        const totalShares = kols.reduce((sum, k) => sum + (k.stats?.total_shares || 0), 0);
        const totalReach = kols.reduce((sum, k) => sum + (k.stats?.reach || 0), 0);
        const avgEngagementRate = kols.length > 0
          ? kols.reduce((sum, k) => sum + (k.stats?.engagement_rate || 0), 0) / kols.length
          : 0;

        setStats({
          totalKOLs: kols.length,
          activeKOLs: kols.filter(k => k.status === 'active').length,
          totalComments,
          totalMessages,
          totalEngagement: totalComments + totalMessages,
          totalFollowers,
          totalLikes,
          totalShares,
          totalReach,
          avgEngagementRate
        });

        setRecentActivity([
          { kol: kols[0]?.name || 'KOL 1', action: 'Replied to comment', time: '2 phút trước', type: 'comment' },
          { kol: kols[0]?.name || 'KOL 1', action: 'Sent message', time: '5 phút trước', type: 'message' },
          { kol: kols[1]?.name || 'KOL 2', action: 'Replied to comment', time: '10 phút trước', type: 'comment' },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            KOL AI Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Quản lý và theo dõi hoạt động của các KOL AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users className="text-indigo-600" size={24} />
              </div>
              <span className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                {stats.activeKOLs}/{stats.totalKOLs} Active
              </span>
            </div>
            <p className="text-gray-500 text-sm mb-1">Tổng KOL</p>
            <p className="text-4xl font-bold text-gray-800">{stats.totalKOLs}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="text-blue-600" size={24} />
              </div>
              <Zap className="text-yellow-500" size={20} />
            </div>
            <p className="text-gray-500 text-sm mb-1">Total Followers</p>
            <p className="text-4xl font-bold text-gray-800">{stats.totalFollowers.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-purple-600" size={24} />
              </div>
              <Zap className="text-yellow-500" size={20} />
            </div>
            <p className="text-gray-500 text-sm mb-1">Avg Engagement</p>
            <p className="text-4xl font-bold text-gray-800">{stats.avgEngagementRate.toFixed(1)}%</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <MessageCircle size={24} />
              </div>
              <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
                Total
              </span>
            </div>
            <p className="text-indigo-100 text-sm mb-1">Total Interactions</p>
            <p className="text-4xl font-bold">{stats.totalEngagement.toLocaleString()}</p>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border-2 border-pink-200">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">❤️</span>
              <div>
                <p className="text-sm text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold text-pink-600">{stats.totalLikes.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🔄</span>
              <div>
                <p className="text-sm text-gray-600">Total Shares</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalShares.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">📊</span>
              <div>
                <p className="text-sm text-gray-600">Total Reach</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalReach.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Hoạt Động Gần Đây</h2>
              <button className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm">
                Xem tất cả →
              </button>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500">Chưa có hoạt động nào</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'comment' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      <MessageCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-semibold">
                        {activity.kol}
                      </p>
                      <p className="text-gray-600 text-sm">{activity.action}</p>
                    </div>
                    <span className="text-gray-400 text-sm">{activity.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/dashboard/kols/create'}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <span className="font-semibold">Tạo KOL Mới</span>
                <ArrowRight size={20} />
              </button>

              <button
                onClick={() => window.location.href = '/dashboard/kols'}
                className="w-full flex items-center justify-between p-4 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-all"
              >
                <span className="font-semibold">Quản Lý KOL</span>
                <Users size={20} />
              </button>

              <button
                onClick={() => window.location.href = '/connect'}
                className="w-full flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all"
              >
                <span className="font-semibold">Kết Nối Facebook</span>
                <ArrowRight size={20} />
              </button>

              <button
                onClick={() => window.location.href = '/studio'}
                className="w-full flex items-center justify-between p-4 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-all"
              >
                <span className="font-semibold">🎨 Content Studio</span>
                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">NEW</span>
              </button>

              <button
                onClick={() => window.location.href = '/calendar'}
                className="w-full flex items-center justify-between p-4 bg-pink-50 text-pink-700 rounded-xl hover:bg-pink-100 transition-all"
              >
                <span className="font-semibold">📅 Content Calendar</span>
                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">NEW</span>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t-2 border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">System Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Webhook</span>
                  <span className="flex items-center gap-2 text-green-600 font-semibold">
                    <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">AI Engine</span>
                  <span className="flex items-center gap-2 text-green-600 font-semibold">
                    <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Database</span>
                  <span className="flex items-center gap-2 text-green-600 font-semibold">
                    <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {stats.totalKOLs === 0 && (
          <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">🚀 Bắt Đầu Nào!</h2>
            <p className="text-indigo-100 mb-6">
              Làm theo 3 bước đơn giản để kích hoạt hệ thống KOL AI của bạn
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="text-4xl font-bold mb-3">1</div>
                <h3 className="font-bold mb-2">Tạo KOL Profile</h3>
                <p className="text-indigo-100 text-sm mb-4">
                  Thiết lập tính cách và phong cách cho AI KOL
                </p>
                <button
                  onClick={() => window.location.href = '/dashboard/kols/create'}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors font-semibold text-sm"
                >
                  Tạo Ngay
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="text-4xl font-bold mb-3">2</div>
                <h3 className="font-bold mb-2">Kết Nối Facebook</h3>
                <p className="text-indigo-100 text-sm mb-4">
                  Link Fanpage với KOL profile
                </p>
                <button
                  onClick={() => window.location.href = '/connect'}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors font-semibold text-sm"
                >
                  Kết Nối
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <div className="text-4xl font-bold mb-3">3</div>
                <h3 className="font-bold mb-2">Bắt Đầu Tự Động</h3>
                <p className="text-indigo-100 text-sm mb-4">
                  Bot sẽ tự động trả lời comments & messages
                </p>
                <div className="bg-white/20 text-white px-4 py-2 rounded-lg text-center font-semibold text-sm">
                  Sẵn sàng!
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
