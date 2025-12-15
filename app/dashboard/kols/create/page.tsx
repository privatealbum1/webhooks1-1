// app/dashboard/kols/create/page.tsx
'use client';

import { useState } from 'react';
import { ArrowLeft, Sparkles, Save } from 'lucide-react';

export default function CreateKOLForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    avatar: '',
    personality: {
      tone: 'friendly',
      writing_style: 'casual',
      expertise: [],
      forbidden_topics: ['politics', 'religion'],
      language: 'vi',
      signature_phrases: []
    },
    voice_characteristics: {
      catchphrases: [],
      emoji_usage: 'medium',
      hashtag_style: [],
      greeting_style: 'Chào bạn!',
      closing_style: 'Hẹn gặp lại nhé!'
    },
    demographic: {
      age_range: '25-35',
      gender: 'neutral',
      target_audience: '',
      location: 'Vietnam'
    },
    engagement_rules: {
      auto_reply_comments: true,
      auto_reply_messages: true,
      reply_delay_seconds: 15,
      max_replies_per_hour: 50,
      working_hours: {
        enabled: true,
        start: '09:00',
        end: '22:00',
        timezone: 'Asia/Ho_Chi_Minh'
      },
      response_probability: 0.9
    },
    status: 'draft',
    connected_pages: []
  });

  const [currentExpertise, setCurrentExpertise] = useState('');
  const [currentPhrase, setCurrentPhrase] = useState('');

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên KOL');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/kols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        alert('Tạo KOL thành công!');
        window.location.href = '/dashboard/kols';
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      alert('Lỗi kết nối server');
    } finally {
      setLoading(false);
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
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles size={32} />
              <h1 className="text-3xl font-bold">Tạo KOL Profile Mới</h1>
            </div>
            <p className="text-indigo-100">Thiết lập tính cách và phong cách cho AI KOL của bạn</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Basic Info */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-indigo-200">
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    placeholder="VD: Sarah Fitness Coach"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mô Tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    rows={3}
                    placeholder="Mô tả ngắn về KOL này..."
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Personality */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-indigo-200">
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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    >
                      <option value="friendly">😊 Friendly (Thân thiện)</option>
                      <option value="professional">💼 Professional (Chuyên nghiệp)</option>
                      <option value="humorous">😄 Humorous (Hài hước)</option>
                      <option value="motivational">💪 Motivational (Động viên)</option>
                      <option value="storyteller">📖 Storyteller (Kể chuyện)</option>
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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
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
                    Chuyên Môn (Lĩnh vực)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={currentExpertise}
                      onChange={(e) => setCurrentExpertise(e.target.value)}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                      placeholder="VD: Fitness, Nutrition..."
                    />
                    <button
                      type="button"
                      onClick={addExpertise}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      Thêm
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.personality.expertise.map((item, index) => (
                      <span
                        key={index}
                        className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeExpertise(index)}
                          className="text-indigo-500 hover:text-indigo-700 font-bold"
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
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                      placeholder="VD: Let's get stronger together!"
                    />
                    <button
                      type="button"
                      onClick={addPhrase}
                      className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      Thêm
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.personality.signature_phrases.map((phrase, index) => (
                      <span
                        key={index}
                        className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {phrase}
                        <button
                          type="button"
                          onClick={() => removePhrase(index)}
                          className="text-purple-500 hover:text-purple-700 font-bold"
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
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-indigo-200">
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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
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
              <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b-2 border-indigo-200">
                Quy Tắc Tương Tác
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
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

                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
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
                    Độ Trễ Trả Lời (giây): {formData.engagement_rules.reply_delay_seconds}s
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
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold disabled:opacity-50"
              >
                <Save size={20} />
                {loading ? 'Đang Lưu...' : 'Tạo KOL'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
      }
