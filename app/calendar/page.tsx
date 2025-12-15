'use client';

import { useState, useEffect } from 'react';
import { ScheduledContent } from '../types/content';

export default function ContentCalendar() {
  const [contents, setContents] = useState<ScheduledContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ScheduledContent | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchScheduledContents();
  }, []);

  const fetchScheduledContents = async () => {
    try {
      const response = await fetch('/api/content/schedule');
      const data = await response.json();
      setContents(data.contents || []);
    } catch (error) {
      console.error('Error fetching scheduled contents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostNow = async (contentId: string) => {
    if (!confirm('Đăng bài ngay bây giờ?')) return;

    try {
      const response = await fetch('/api/content/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: contentId })
      });

      const data = await response.json();

      if (data.success) {
        alert('Đã đăng bài thành công! Post ID: ' + data.post_id);
        fetchScheduledContents();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error posting content:', error);
      alert('Lỗi khi đăng bài');
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm('Xóa bài này?')) return;

    try {
      const response = await fetch(`/api/content/schedule?id=${contentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Đã xóa thành công!');
        fetchScheduledContents();
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Lỗi khi xóa');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'posted':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return '📘';
      case 'instagram':
        return '📷';
      case 'twitter':
        return '🐦';
      case 'tiktok':
        return '🎵';
      default:
        return '📱';
    }
  };

  const formatDate = (timestamp: any) => {
    try {
      if (!timestamp) return 'N/A';

      // Handle Firestore Timestamp
      let date;
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }

      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const filteredContents = contents.filter((content) => {
    if (filterStatus === 'all') return true;
    return content.status === filterStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            📅 Content Calendar
          </h1>

          <div className="flex gap-3">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              📋 List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg font-medium ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              📆 Calendar
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex gap-3">
            <span className="font-medium text-gray-700 py-2">Trạng thái:</span>
            {['all', 'draft', 'scheduled', 'posted', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Tất cả' : status.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl font-bold text-gray-900">
              {contents.length}
            </div>
            <div className="text-sm text-gray-600">Tổng số bài</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl font-bold text-blue-600">
              {contents.filter((c) => c.status === 'scheduled').length}
            </div>
            <div className="text-sm text-gray-600">Đã lên lịch</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {contents.filter((c) => c.status === 'posted').length}
            </div>
            <div className="text-sm text-gray-600">Đã đăng</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl font-bold text-red-600">
              {contents.filter((c) => c.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-600">Thất bại</div>
          </div>
        </div>

        {/* Content List */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {filteredContents.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-xl mb-2">📭</p>
                <p>Chưa có nội dung nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredContents.map((content) => (
                  <div
                    key={content.id}
                    className="p-6 hover:bg-gray-50 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {getPlatformIcon(content.platform)}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              content.status
                            )}`}
                          >
                            {content.status.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            📅 {formatDate(content.scheduled_time)}
                          </span>
                        </div>

                        <p className="text-gray-700 line-clamp-3 mb-3">
                          {content.content}
                        </p>

                        {content.media.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {content.media.map((media, idx) => (
                              <div
                                key={idx}
                                className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden"
                              >
                                {media.type === 'image' && (
                                  <img
                                    src={media.url}
                                    alt="Media"
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {content.error_message && (
                          <div className="text-sm text-red-600 mb-2">
                            ⚠️ {content.error_message}
                          </div>
                        )}

                        {content.post_id && (
                          <div className="text-sm text-green-600 mb-2">
                            ✅ Post ID: {content.post_id}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setSelectedContent(content)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                        >
                          👁️ Xem
                        </button>

                        {content.status === 'scheduled' && (
                          <button
                            onClick={() => handlePostNow(content.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                          >
                            🚀 Đăng ngay
                          </button>
                        )}

                        {(content.status === 'draft' ||
                          content.status === 'failed') && (
                          <button
                            onClick={() => handleDelete(content.id)}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium"
                          >
                            🗑️ Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar View (Simple Grid) */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-500 text-center py-12">
              📆 Calendar view - Coming soon! <br />
              (Drag & drop scheduling sẽ được implement với thư viện như FullCalendar hoặc
              React Big Calendar)
            </p>
          </div>
        )}

        {/* Detail Modal */}
        {selectedContent && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedContent(null)}
          >
            <div
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Chi tiết Content</h3>
                <button
                  onClick={() => setSelectedContent(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Platform
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl">
                      {getPlatformIcon(selectedContent.platform)}
                    </span>
                    <span className="font-medium">
                      {selectedContent.platform.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Trạng thái
                  </label>
                  <div className="mt-1">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                        selectedContent.status
                      )}`}
                    >
                      {selectedContent.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Thời gian đăng
                  </label>
                  <div className="mt-1 text-gray-900">
                    {formatDate(selectedContent.scheduled_time)}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Nội dung
                  </label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                    <p className="whitespace-pre-wrap text-gray-900">
                      {selectedContent.content}
                    </p>
                  </div>
                </div>

                {selectedContent.media.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Media
                    </label>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {selectedContent.media.map((media, idx) => (
                        <div
                          key={idx}
                          className="aspect-square bg-gray-200 rounded-lg overflow-hidden"
                        >
                          {media.type === 'image' && (
                            <img
                              src={media.url}
                              alt="Media"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedContent.post_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Post ID
                    </label>
                    <div className="mt-1 text-green-600 font-mono">
                      {selectedContent.post_id}
                    </div>
                  </div>
                )}

                {selectedContent.error_message && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Lỗi
                    </label>
                    <div className="mt-1 text-red-600">
                      {selectedContent.error_message}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                {selectedContent.status === 'scheduled' && (
                  <button
                    onClick={() => {
                      handlePostNow(selectedContent.id);
                      setSelectedContent(null);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
                  >
                    🚀 Đăng ngay
                  </button>
                )}
                <button
                  onClick={() => setSelectedContent(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-medium"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
