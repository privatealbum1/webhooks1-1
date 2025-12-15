'use client';

import { useState, useEffect } from 'react';
import { KOLProfile } from '../types/kol';
import { ContentVariant, PlatformType, ContentType } from '../types/content';

export default function ContentStudio() {
  const [kols, setKols] = useState<KOLProfile[]>([]);
  const [selectedKol, setSelectedKol] = useState<string>('');
  const [platforms, setPlatforms] = useState<PlatformType[]>(['facebook']);
  const [contentType, setContentType] = useState<ContentType>('post');
  const [customPrompt, setCustomPrompt] = useState('');
  const [variantsCount, setVariantsCount] = useState(3);
  const [variants, setVariants] = useState<ContentVariant[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ContentVariant | null>(null);

  // Load KOLs
  useEffect(() => {
    fetchKOLs();
  }, []);

  const fetchKOLs = async () => {
    try {
      const response = await fetch('/api/kols');
      const data = await response.json();
      setKols(data.kols || []);
    } catch (error) {
      console.error('Error fetching KOLs:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedKol) {
      alert('Vui lòng chọn KOL profile');
      return;
    }

    setIsGenerating(true);
    setVariants([]);

    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kol_id: selectedKol,
          platforms,
          content_type: contentType,
          custom_prompt: customPrompt,
          variants_count: variantsCount
        })
      });

      const data = await response.json();

      if (data.success) {
        setVariants(data.variants);
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Lỗi khi tạo content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSchedule = async (variant: ContentVariant) => {
    const scheduledTime = prompt('Nhập thời gian đăng (YYYY-MM-DD HH:mm):');
    if (!scheduledTime) return;

    try {
      const response = await fetch('/api/content/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kol_id: selectedKol,
          content: variant.content,
          platform: variant.platform,
          content_type: contentType,
          scheduled_time: new Date(scheduledTime).toISOString(),
          media: [],
          created_by: 'user123',
          status: 'scheduled'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Đã lên lịch thành công!');
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('Error scheduling content:', error);
      alert('Lỗi khi lên lịch');
    }
  };

  const togglePlatform = (platform: PlatformType) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">
          🎨 Content Studio
        </h1>

        {/* Configuration Panel */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Cấu hình</h2>

          {/* KOL Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Chọn KOL Profile</label>
            <select
              value={selectedKol}
              onChange={(e) => setSelectedKol(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="">-- Chọn KOL --</option>
              {kols.map((kol) => (
                <option key={kol.id} value={kol.id}>
                  {kol.name} - {kol.personality.tone}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Chọn nền tảng</label>
            <div className="flex gap-3">
              {['facebook', 'instagram', 'twitter', 'tiktok'].map((platform) => (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform as PlatformType)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    platforms.includes(platform as PlatformType)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {platform.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Content Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Loại content</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="post">Post</option>
              <option value="story">Story</option>
              <option value="reel">Reel</option>
              <option value="carousel">Carousel</option>
            </select>
          </div>

          {/* Custom Prompt */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Prompt tùy chỉnh</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ví dụ: Viết một bài post về lợi ích của việc tập gym..."
              className="w-full p-3 border border-gray-300 rounded-lg h-32"
            />
          </div>

          {/* Variants Count */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Số lượng variants: {variantsCount}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={variantsCount}
              onChange={(e) => setVariantsCount(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedKol}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? '🔄 Đang tạo...' : '✨ Generate Content'}
          </button>
        </div>

        {/* Variants Preview */}
        {variants.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              📝 Variants ({variants.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
                  onClick={() => setSelectedVariant(variant)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {variant.platform.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {variant.length} chars
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 line-clamp-6 mb-3">
                    {variant.content}
                  </p>

                  {variant.hashtags.length > 0 && (
                    <div className="mb-2">
                      <div className="flex flex-wrap gap-1">
                        {variant.hashtags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="text-xs text-blue-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(variant.content);
                        alert('Đã copy!');
                      }}
                      className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 py-2 rounded"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSchedule(variant);
                      }}
                      className="flex-1 text-xs bg-green-100 hover:bg-green-200 py-2 rounded"
                    >
                      📅 Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed View Modal */}
        {selectedVariant && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedVariant(null)}
          >
            <div
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Chi tiết Variant</h3>
                <button
                  onClick={() => setSelectedVariant(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <span className="text-sm font-semibold px-3 py-1 bg-blue-100 text-blue-800 rounded">
                  {selectedVariant.platform.toUpperCase()}
                </span>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="whitespace-pre-wrap">{selectedVariant.content}</p>
              </div>

              {selectedVariant.hashtags.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Hashtags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVariant.hashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedVariant.content);
                    alert('Đã copy!');
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2 rounded font-medium"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => handleSchedule(selectedVariant)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium"
                >
                  📅 Schedule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
