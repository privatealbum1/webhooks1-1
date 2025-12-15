// app/dashboard/kols/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader } from 'lucide-react';

export default function EditKOLPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kolId, setKolId] = useState('');
  const [formData, setFormData] = useState(null);
  const [currentExpertise, setCurrentExpertise] = useState('');
  const [currentPhrase, setCurrentPhrase] = useState('');

  useEffect(() => {
    // Get KOL ID from URL
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 2];
    setKolId(id);
    fetchKOL(id);
  }, []);

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
