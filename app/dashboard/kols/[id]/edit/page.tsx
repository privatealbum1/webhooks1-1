// app/dashboard/kols/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader, Facebook, MessageSquare, Send, X, TestTube } from 'lucide-react';

export default function EditKOLPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kolId, setKolId] = useState('');
  const [formData, setFormData] = useState(null);
  const [currentExpertise, setCurrentExpertise] = useState('');
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [newPageId, setNewPageId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [testing, setTesting] = useState(false);
  const [availablePages, setAvailablePages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedPage, setSelectedPage] = useState('');

  useEffect(() => {
    // Get KOL ID from URL
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 2];
    setKolId(id);
    fetchKOL(id);
    fetchAvailablePages();
  }, []);

  const fetchAvailablePages = async () => {
    setLoadingPages(true);
    try {
      const res = await fetch('/api/pages/available');
      const data = await res.json();
      if (data.success) {
        setAvailablePages(data.pages);
      }
    } catch (err) {
      console.error('Error fetching available pages:', err);
    } finally {
      setLoadingPages(false);
    }
  };

  const fetchKOL = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kols/${id}`);
      const data = await res.json();
      if (data.success) {
        setFormData(data.data);
      } else {
        alert('Lỗi: ' + data.error);
        window.location.href = '/dashboard/kols';
      }
    } catch (err) {
      alert('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên KOL');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/kols/${kolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        alert('Cập nhật thành công!');
        window.location.href = '/dashboard/kols';
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi kết nối server');
    } finally {
      setSaving(false);
    }
  };

  const addExpertise = () => {
    if (currentExpertise.trim()) {
      setFormData({
        ...formData,
        personality: {
          ...formData.personality,
          expertise: [...formData.personality.expertise, currentExpertise.trim()]
        }
      });
      setCurrentExpertise('');
    }
  };

  const removeExpertise = (index) => {
    setFormData({
      ...formData,
      personality: {
        ...formData.personality,
        expertise: formData.personality.expertise.filter((_, i) => i !== index)
      }
    });
  };

  const addPhrase = () => {
    if (currentPhrase.trim()) {
      setFormData({
        ...formData,
        personality: {
          ...formData.personality,
          signature_phrases: [...formData.personality.signature_phrases, currentPhrase.trim()]
        }
      });
      setCurrentPhrase('');
    }
  };

  const removePhrase = (index) => {
    setFormData({
      ...formData,
      personality: {
        ...formData.personality,
        signature_phrases: formData.personality.signature_phrases.filter((_, i) => i !== index)
      }
    });
  };

  const addPageFromDropdown = () => {
    if (!selectedPage) {
      alert('Vui lòng chọn Facebook Page');
      return;
    }

    const page = availablePages.find(p => p.page_id === selectedPage);
    if (!page) return;

    // Check if page already added
    const existingPages = formData.facebook_pages || [];
    if (existingPages.find(p => p.page_id === page.page_id)) {
      alert('Page này đã được kết nối rồi');
      return;
    }

    // Add to facebook_pages
    setFormData({
      ...formData,
      facebook_pages: [...existingPages, {
        page_id: page.page_id,
        page_name: page.page_name,
        page_access_token: page.page_access_token
      }],
      connected_pages: [...(formData.connected_pages || []), page.page_id]
    });

    setSelectedPage('');
    alert(`✅ Đã kết nối với ${page.page_name}`);
  };

  const addPage = () => {
    if (newPageId.trim() && !formData.connected_pages.includes(newPageId.trim())) {
      setFormData({
        ...formData,
        connected_pages: [...formData.connected_pages, newPageId.trim()]
      });
      setNewPageId('');
    }
  };

  const removePage = (pageId) => {
    setFormData({
      ...formData,
      facebook_pages: (formData.facebook_pages || []).filter(p => p.page_id !== pageId),
      connected_pages: formData.connected_pages.filter(p => p !== pageId)
    });
  };

  const testPersonality = async () => {
    if (!testMessage.trim()) {
      alert('Vui lòng nhập tin nhắn test');
      return;
    }

    setTesting(true);
    setTestResponse('');

    try {
      const res = await fetch('/api/kols/test-personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kol_profile: formData,
          message: testMessage
        })
      });

      const data = await res.json();

      if (data.success) {
        setTestResponse(data.response);
      } else {
        setTestResponse('Lỗi: ' + data.error);
      }
    } catch (err) {
      setTestResponse('Lỗi kết nối server');
    } finally {
      setTesting(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => window.location.href = '/dashboard/kols'}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Quay lại
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Chỉnh Sửa KOL Profile</h1>
            <p className="text-purple-100">Cập nhật thông tin cho {formData.name}</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Basic Info */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-purple-200">
                Thông Tin Cơ Bản
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tên KOL *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mô Tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Trạng Thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Personality */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-purple-200">
                Tính Cách
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Giọng Điệu
                    </label>
                    <select
                      value={formData.personality.tone}
                      onChange={(e) => setFormData({
                        ...formData,
                        personality: { ...formData.personality, tone: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="friendly">😊 Friendly</option>
                      <option value="professional">💼 Professional</option>
                      <option value="humorous">😄 Humorous</option>
                      <option value="motivational">💪 Motivational</option>
                      <option value="storyteller">📖 Storyteller</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phong Cách Viết
                    </label>
                    <select
                      value={formData.personality.writing_style}
                      onChange={(e) => setFormData({
                        ...formData,
                        personality: { ...formData.personality, writing_style: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    >
                      <option value="concise">Ngắn gọn</option>
                      <option value="detailed">Chi tiết</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ngôn Ngữ
                  </label>
                  <select
                    value={formData.personality.language}
                    onChange={(e) => setFormData({
                      ...formData,
                      personality: { ...formData.personality, language: e.target.value }
                    })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                    <option value="both">Cả hai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Chuyên Môn
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentExpertise}
                      onChange={(e) => setCurrentExpertise(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                      placeholder="Thêm lĩnh vực chuyên môn..."
                    />
                    <button
                      type="button"
                      onClick={addExpertise}
                      className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      Thêm
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.personality.expertise.map((item, index) => (
                      <span
                        key={index}
                        className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeExpertise(index)}
                          className="text-purple-500 hover:text-purple-700 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Câu Nói Đặc Trưng
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentPhrase}
                      onChange={(e) => setCurrentPhrase(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPhrase())}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                      placeholder="Thêm câu nói đặc trưng..."
                    />
                    <button
                      type="button"
                      onClick={addPhrase}
                      className="px-6 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors"
                    >
                      Thêm
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.personality.signature_phrases.map((phrase, index) => (
                      <span
                        key={index}
                        className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {phrase}
                        <button
                          type="button"
                          onClick={() => removePhrase(index)}
                          className="text-pink-500 hover:text-pink-700 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Characteristics */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-purple-200">
                Phong Cách Giao Tiếp
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Câu Chào
                    </label>
                    <input
                      type="text"
                      value={formData.voice_characteristics.greeting_style}
                      onChange={(e) => setFormData({
                        ...formData,
                        voice_characteristics: {
                          ...formData.voice_characteristics,
                          greeting_style: e.target.value
                        }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Câu Kết
                    </label>
                    <input
                      type="text"
                      value={formData.voice_characteristics.closing_style}
                      onChange={(e) => setFormData({
                        ...formData,
                        voice_characteristics: {
                          ...formData.voice_characteristics,
                          closing_style: e.target.value
                        }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mức Độ Dùng Emoji
                  </label>
                  <select
                    value={formData.voice_characteristics.emoji_usage}
                    onChange={(e) => setFormData({
                      ...formData,
                      voice_characteristics: {
                        ...formData.voice_characteristics,
                        emoji_usage: e.target.value
                      }
                    })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                  >
                    <option value="none">Không dùng</option>
                    <option value="low">Ít (1 emoji)</option>
                    <option value="medium">Vừa (2 emojis)</option>
                    <option value="high">Nhiều (3+ emojis)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Engagement Rules */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-purple-200">
                Quy Tắc Tương Tác
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.engagement_rules.auto_reply_comments}
                      onChange={(e) => setFormData({
                        ...formData,
                        engagement_rules: {
                          ...formData.engagement_rules,
                          auto_reply_comments: e.target.checked
                        }
                      })}
                      className="w-5 h-5"
                    />
                    <span className="font-semibold">Auto Reply Comments</span>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.engagement_rules.auto_reply_messages}
                      onChange={(e) => setFormData({
                        ...formData,
                        engagement_rules: {
                          ...formData.engagement_rules,
                          auto_reply_messages: e.target.checked
                        }
                      })}
                      className="w-5 h-5"
                    />
                    <span className="font-semibold">Auto Reply Messages</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Độ Trễ Trả Lời: {formData.engagement_rules.reply_delay_seconds}s
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    value={formData.engagement_rules.reply_delay_seconds}
                    onChange={(e) => setFormData({
                      ...formData,
                      engagement_rules: {
                        ...formData.engagement_rules,
                        reply_delay_seconds: parseInt(e.target.value)
                      }
                    })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Xác Suất Trả Lời: {(formData.engagement_rules.response_probability * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.engagement_rules.response_probability}
                    onChange={(e) => setFormData({
                      ...formData,
                      engagement_rules: {
                        ...formData.engagement_rules,
                        response_probability: parseFloat(e.target.value)
                      }
                    })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Giới Hạn Reply/Giờ: {formData.engagement_rules.max_replies_per_hour}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={formData.engagement_rules.max_replies_per_hour}
                    onChange={(e) => setFormData({
                      ...formData,
                      engagement_rules: {
                        ...formData.engagement_rules,
                        max_replies_per_hour: parseInt(e.target.value)
                      }
                    })}
                    className="w-full"
                  />
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      checked={formData.engagement_rules.working_hours.enabled}
                      onChange={(e) => setFormData({
                        ...formData,
                        engagement_rules: {
                          ...formData.engagement_rules,
                          working_hours: {
                            ...formData.engagement_rules.working_hours,
                            enabled: e.target.checked
                          }
                        }
                      })}
                      className="w-5 h-5"
                    />
                    <span className="font-semibold">Bật Giờ Làm Việc</span>
                  </label>

                  {formData.engagement_rules.working_hours.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Bắt Đầu
                        </label>
                        <input
                          type="time"
                          value={formData.engagement_rules.working_hours.start}
                          onChange={(e) => setFormData({
                            ...formData,
                            engagement_rules: {
                              ...formData.engagement_rules,
                              working_hours: {
                                ...formData.engagement_rules.working_hours,
                                start: e.target.value
                              }
                            }
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Kết Thúc
                        </label>
                        <input
                          type="time"
                          value={formData.engagement_rules.working_hours.end}
                          onChange={(e) => setFormData({
                            ...formData,
                            engagement_rules: {
                              ...formData.engagement_rules,
                              working_hours: {
                                ...formData.engagement_rules.working_hours,
                                end: e.target.value
                              }
                            }
                          })}
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Connected Facebook Pages */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-purple-200 flex items-center gap-2">
                <Facebook size={24} className="text-blue-600" />
                Facebook Pages Kết Nối
              </h2>

              {/* Dropdown to select from available pages */}
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  ✨ Chọn từ Pages đã kết nối với hệ thống
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedPage}
                    onChange={(e) => setSelectedPage(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white"
                    disabled={loadingPages}
                  >
                    <option value="">-- Chọn Facebook Page --</option>
                    {availablePages.map((page) => (
                      <option key={page.page_id} value={page.page_id}>
                        {page.page_name} ({page.page_id}) - Token: {page.token_status === 'valid' ? '✅ Valid' : page.token_status === 'invalid' ? '❌ Invalid' : '⚠️ Unknown'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addPageFromDropdown}
                    disabled={!selectedPage || loadingPages}
                    className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                      !selectedPage || loadingPages
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Facebook size={16} />
                    Kết nối
                  </button>
                </div>
                {loadingPages && (
                  <p className="text-xs text-gray-500 mt-2">Đang tải danh sách pages...</p>
                )}
                {!loadingPages && availablePages.length === 0 && (
                  <p className="text-xs text-orange-600 mt-2">
                    ⚠️ Chưa có page nào được kết nối. Vui lòng vào <a href="/connect" className="underline">trang Connect</a> để kết nối Facebook Page trước.
                  </p>
                )}
                {!loadingPages && availablePages.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Các page được kết nối qua <a href="/connect" className="underline">/connect</a> sẽ tự động có access token
                  </p>
                )}
              </div>

              {/* Manual Page ID input (fallback) */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔧 Hoặc thêm Page ID thủ công
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPageId}
                    onChange={(e) => setNewPageId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPage())}
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    placeholder="Nhập Page ID hoặc Page URL..."
                  />
                  <button
                    type="button"
                    onClick={addPage}
                    className="px-6 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Facebook size={16} />
                    Thêm
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ Chỉ dùng khi page chưa có trong danh sách. Token sẽ cần thêm sau.
                </p>
              </div>

              {/* Connected Pages List */}
              {(!formData.facebook_pages || formData.facebook_pages.length === 0) && formData.connected_pages.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <Facebook size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Chưa kết nối Page nào</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Thêm Page để KOL này có thể trả lời tự động
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Show facebook_pages first (with full info) */}
                  {(formData.facebook_pages || []).map((page, index) => (
                    <div
                      key={`fb-${index}`}
                      className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border-2 border-blue-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <Facebook size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{page.page_name}</p>
                          <p className="text-xs text-gray-600 font-mono">{page.page_id}</p>
                          <p className="text-xs text-green-600 mt-1">✅ Token có sẵn</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePage(page.page_id)}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Xóa kết nối"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}

                  {/* Show connected_pages without full info */}
                  {formData.connected_pages
                    .filter(pageId => !(formData.facebook_pages || []).find(p => p.page_id === pageId))
                    .map((pageId, index) => (
                      <div
                        key={`cp-${index}`}
                        className="flex items-center justify-between bg-yellow-50 rounded-xl p-4 border-2 border-yellow-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                            <Facebook size={20} className="text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{pageId}</p>
                            <p className="text-xs text-gray-500">Facebook Page ID</p>
                            <p className="text-xs text-orange-600 mt-1">⚠️ Cần thêm token</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePage(pageId)}
                          className="text-red-600 hover:text-red-700 p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Xóa kết nối"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Personality Testing */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-purple-200 flex items-center gap-2">
                <TestTube size={24} className="text-green-600" />
                Test Personality
              </h2>

              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Test xem KOL sẽ trả lời như thế nào với một tin nhắn mẫu
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tin nhắn test
                    </label>
                    <textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                      rows={3}
                      placeholder="Ví dụ: Chào bạn, bạn có thể tư vấn cho mình về..."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={testPersonality}
                    disabled={testing || !testMessage.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        Đang test...
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        Test Ngay
                      </>
                    )}
                  </button>

                  {testResponse && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phản hồi từ KOL
                      </label>
                      <div className="bg-white rounded-xl p-4 border-2 border-green-200">
                        <div className="flex items-start gap-3">
                          <MessageSquare size={20} className="text-green-600 mt-1" />
                          <p className="text-gray-800 flex-1">{testResponse}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Display */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-purple-200">
                Thống Kê
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Comments Replied</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formData.stats?.total_comments_replied || 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Messages Replied</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {formData.stats?.total_messages_replied || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={() => window.location.href = '/dashboard/kols'}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold disabled:opacity-50"
              >
                <Save size={20} />
                {saving ? 'Đang Lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
