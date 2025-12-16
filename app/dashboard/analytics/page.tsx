'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface KOLProfile {
  id: string;
  name: string;
  facebook_pages?: Array<{
    page_id: string;
    page_name: string;
    page_access_token: string;
  }>;
}

interface PageInsights {
  page_id: string;
  followers_count: number;
  page_impressions: number;
  page_engaged_users: number;
  page_post_engagements: number;
  page_posts_impressions: number;
}

interface PageAnalytics {
  page_id: string;
  page_name: string;
  followers: number;
  insights: PageInsights;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [kols, setKols] = useState<KOLProfile[]>([]);
  const [selectedKol, setSelectedKol] = useState<string>('');
  const [dateRange, setDateRange] = useState<'7d' | '28d' | '90d'>('7d');
  const [analytics, setAnalytics] = useState<PageAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchKOLs();
  }, []);

  const fetchKOLs = async () => {
    try {
      const response = await fetch('/api/kols');
      const data = await response.json();
      if (data.success && data.data) {
        setKols(data.data);
        if (data.data.length > 0) {
          setSelectedKol(data.data[0].id);
          fetchAnalytics(data.data[0].id, dateRange);
        }
      }
    } catch (error) {
      console.error('Error fetching KOLs:', error);
    }
  };

  const fetchAnalytics = async (kolId: string, range: string) => {
    if (!kolId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/facebook/analytics?kolId=${kolId}&dateRange=${range}`);
      const data = await response.json();

      if (data.success && data.pages) {
        setAnalytics(data.pages);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncStats = async () => {
    if (!selectedKol) return;

    setSyncing(true);
    try {
      const response = await fetch('/api/facebook/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kol_id: selectedKol,
          sync_type: 'stats'
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('✅ Đã đồng bộ stats thành công!');
        // Refresh analytics
        fetchAnalytics(selectedKol, dateRange);
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

  const handleKolChange = (kolId: string) => {
    setSelectedKol(kolId);
    fetchAnalytics(kolId, dateRange);
  };

  const handleDateRangeChange = (range: '7d' | '28d' | '90d') => {
    setDateRange(range);
    if (selectedKol) {
      fetchAnalytics(selectedKol, range);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const calculateEngagementRate = (engagements: number, impressions: number) => {
    if (impressions === 0) return '0.00';
    return ((engagements / impressions) * 100).toFixed(2);
  };

  const selectedKolData = kols.find(k => k.id === selectedKol);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← Quay lại Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">📊 Facebook Analytics</h1>
          <p className="text-gray-600 mt-2">Xem chi tiết số liệu từng KOL và Facebook Page</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KOL Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn KOL
              </label>
              <select
                value={selectedKol}
                onChange={(e) => handleKolChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {kols.map(kol => (
                  <option key={kol.id} value={kol.id}>
                    {kol.name} ({kol.facebook_pages?.length || 0} pages)
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khoảng thời gian
              </label>
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value as '7d' | '28d' | '90d')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">7 ngày qua</option>
                <option value="28d">28 ngày qua</option>
                <option value="90d">90 ngày qua</option>
              </select>
            </div>

            {/* Sync Button */}
            <div className="flex items-end">
              <button
                onClick={handleSyncStats}
                disabled={syncing || !selectedKol}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  syncing || !selectedKol
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {syncing ? '🔄 Đang đồng bộ...' : '🔄 Đồng bộ Stats'}
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Đang tải analytics...</p>
          </div>
        )}

        {/* Analytics Cards */}
        {!loading && analytics.length === 0 && selectedKol && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">
              📭 KOL này chưa có Facebook pages được kết nối
            </p>
            <button
              onClick={() => router.push(`/dashboard/kols/${selectedKol}/edit`)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Kết nối Facebook Page
            </button>
          </div>
        )}

        {!loading && analytics.length > 0 && (
          <div className="space-y-6">
            {analytics.map((page) => (
              <div key={page.page_id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Page Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
                  <h2 className="text-2xl font-bold">{page.page_name}</h2>
                  <p className="text-blue-100 mt-1">Page ID: {page.page_id}</p>
                </div>

                {/* Stats Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Followers */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-600 text-sm font-medium">👥 Followers</p>
                        <p className="text-3xl font-bold text-purple-900 mt-1">
                          {formatNumber(page.followers)}
                        </p>
                      </div>
                      <div className="text-4xl">👥</div>
                    </div>
                  </div>

                  {/* Impressions */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-600 text-sm font-medium">👁️ Impressions</p>
                        <p className="text-3xl font-bold text-blue-900 mt-1">
                          {formatNumber(page.insights.page_impressions)}
                        </p>
                      </div>
                      <div className="text-4xl">👁️</div>
                    </div>
                  </div>

                  {/* Engaged Users */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-sm font-medium">💬 Engaged Users</p>
                        <p className="text-3xl font-bold text-green-900 mt-1">
                          {formatNumber(page.insights.page_engaged_users)}
                        </p>
                      </div>
                      <div className="text-4xl">💬</div>
                    </div>
                  </div>

                  {/* Engagement Rate */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-600 text-sm font-medium">📈 Engagement Rate</p>
                        <p className="text-3xl font-bold text-orange-900 mt-1">
                          {calculateEngagementRate(
                            page.insights.page_post_engagements,
                            page.insights.page_posts_impressions
                          )}%
                        </p>
                      </div>
                      <div className="text-4xl">📈</div>
                    </div>
                  </div>

                  {/* Post Engagements */}
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-pink-600 text-sm font-medium">❤️ Post Engagements</p>
                        <p className="text-3xl font-bold text-pink-900 mt-1">
                          {formatNumber(page.insights.page_post_engagements)}
                        </p>
                      </div>
                      <div className="text-4xl">❤️</div>
                    </div>
                  </div>

                  {/* Post Impressions */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-indigo-600 text-sm font-medium">📊 Post Impressions</p>
                        <p className="text-3xl font-bold text-indigo-900 mt-1">
                          {formatNumber(page.insights.page_posts_impressions)}
                        </p>
                      </div>
                      <div className="text-4xl">📊</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary for KOL */}
        {!loading && analytics.length > 0 && selectedKolData && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              📊 Tổng quan KOL: {selectedKolData.name}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-gray-600 text-sm">Tổng Pages</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm">Tổng Followers</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(analytics.reduce((sum, p) => sum + p.followers, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm">Tổng Impressions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(analytics.reduce((sum, p) => sum + p.insights.page_impressions, 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm">Tổng Engagements</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(analytics.reduce((sum, p) => sum + p.insights.page_post_engagements, 0))}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
