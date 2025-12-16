'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, TrendingUp, MessageCircle, Users, Heart, Share2, Eye } from 'lucide-react';

export default function KOLDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kolId = params.id as string;

  const [kol, setKol] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (kolId) {
      fetchKOLDetail();
    }
  }, [kolId]);

  const fetchKOLDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/kols/${kolId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setKol(data.data);
      } else {
        alert('KOL không tồn tại');
        router.push('/dashboard/kols');
      }
    } catch (error) {
      console.error('Error fetching KOL:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncStats = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/facebook/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kol_id: kolId,
          sync_type: 'stats'
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('✅ Đã đồng bộ stats thành công!');
        fetchKOLDetail(); // Refresh data
      } else {
        alert('❌ Lỗi: ' + result.error);
      }
    } catch (error) {
      console.error('Error syncing stats:', error);
      alert('❌ Lỗi khi đồng bộ stats');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin KOL...</p>
        </div>
      </div>
    );
  }

  if (!kol) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">KOL không tồn tại</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/kols')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft size={20} />
            Quay lại danh sách KOL
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{kol.name}</h1>
              <p className="text-gray-600">{kol.description || 'Không có mô tả'}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSyncStats}
                disabled={syncing}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  syncing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {syncing ? '🔄 Đang đồng bộ...' : '🔄 Đồng bộ Stats'}
              </button>
              <button
                onClick={() => router.push(`/dashboard/kols/${kolId}/edit`)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                <Edit size={20} />
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Comments */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="text-blue-600" size={24} />
              </div>
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">Comments Replied</p>
            <p className="text-3xl font-bold text-gray-900">
              {(kol.stats?.total_comments_replied || 0).toLocaleString()}
            </p>
          </div>

          {/* Total Messages */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="text-purple-600" size={24} />
              </div>
              <span className="text-2xl">✉️</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">Messages Replied</p>
            <p className="text-3xl font-bold text-gray-900">
              {(kol.stats?.total_messages_replied || 0).toLocaleString()}
            </p>
          </div>

          {/* Followers */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="text-green-600" size={24} />
              </div>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">Total Followers</p>
            <p className="text-3xl font-bold text-gray-900">
              {(kol.stats?.followers_count || 0).toLocaleString()}
            </p>
          </div>

          {/* Engagement Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-orange-600" size={24} />
              </div>
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-gray-500 text-sm mb-1">Engagement Rate</p>
            <p className="text-3xl font-bold text-gray-900">
              {(kol.stats?.engagement_rate || 0).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Likes */}
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-6 border border-pink-200">
            <div className="flex items-center gap-3">
              <span className="text-4xl">❤️</span>
              <div>
                <p className="text-sm text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold text-pink-600">
                  {(kol.stats?.total_likes || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Total Shares */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🔄</span>
              <div>
                <p className="text-sm text-gray-600">Total Shares</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(kol.stats?.total_shares || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Reach */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center gap-3">
              <span className="text-4xl">📊</span>
              <div>
                <p className="text-sm text-gray-600">Total Reach</p>
                <p className="text-2xl font-bold text-green-600">
                  {(kol.stats?.reach || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Impressions */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center gap-3">
              <span className="text-4xl">👁️</span>
              <div>
                <p className="text-sm text-gray-600">Impressions</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(kol.stats?.impressions || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Facebook Pages Connected */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📘 Connected Facebook Pages</h2>
          {kol.facebook_pages && kol.facebook_pages.length > 0 ? (
            <div className="space-y-3">
              {kol.facebook_pages.map((page: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{page.page_name || 'Unnamed Page'}</p>
                    <p className="text-sm text-gray-600 font-mono">{page.page_id}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/analytics?kolId=${kolId}&pageId=${page.page_id}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    View Analytics
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Chưa có Facebook Page nào được kết nối</p>
              <button
                onClick={() => router.push(`/dashboard/kols/${kolId}/edit`)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Kết nối Facebook Page
              </button>
            </div>
          )}
        </div>

        {/* Personality Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🎭 Personality Traits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Tone</h3>
              <p className="text-gray-600">{kol.personality?.tone || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Language</h3>
              <p className="text-gray-600">{kol.personality?.language || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Emoji Usage</h3>
              <p className="text-gray-600">{kol.voice_characteristics?.emoji_usage || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
              <p className="text-gray-600 capitalize">{kol.status || 'N/A'}</p>
            </div>
          </div>

          {kol.voice_characteristics?.catchphrases && kol.voice_characteristics.catchphrases.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Catchphrases</h3>
              <div className="flex flex-wrap gap-2">
                {kol.voice_characteristics.catchphrases.map((phrase: string, idx: number) => (
                  <span
                    key={idx}
                    className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
