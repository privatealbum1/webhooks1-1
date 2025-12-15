# Tài liệu Tính Năng Mới

## TÍNH NĂNG 2: Content Generator Đa Phương Tiện

### 🎨 Content Studio (`/studio`)

Công cụ tạo content AI với khả năng:
- **Multi-Platform Support**: Facebook, Instagram, Twitter, TikTok
- **AI-Powered Generation**: Sử dụng Gemini AI để tạo nội dung theo phong cách KOL
- **Multi-Variant System**: Tạo nhiều phiên bản (variants) cùng lúc
- **Preview System**: Xem trước nội dung trên từng platform

#### Cách sử dụng:

1. Truy cập `/studio`
2. Chọn KOL profile
3. Chọn nền tảng mục tiêu
4. Nhập custom prompt (hoặc dùng template)
5. Chọn số lượng variants muốn tạo
6. Click "Generate Content"
7. Preview và chọn variant phù hợp
8. Schedule hoặc copy để sử dụng

#### API Endpoints:

**POST `/api/content/generate`**
```json
{
  "kol_id": "string",
  "platforms": ["facebook", "instagram"],
  "content_type": "post",
  "custom_prompt": "Viết bài về...",
  "variants_count": 3,
  "media_generation": {
    "enabled": true,
    "type": "dalle",
    "prompt": "..."
  }
}
```

### 🖼️ Media Generator Integration

Tích hợp AI tạo media:
- **Text-to-Image**: DALL-E, Midjourney, Stable Diffusion
- **Text-to-Video**: Runway, Pika
- **Carousel Maker**: Tạo carousel posts

#### Sử dụng:

Media generation được tích hợp vào Content Studio. Bật option "Generate Media" và nhập prompt mô tả hình ảnh/video muốn tạo.

### 📅 Content Calendar (`/calendar`)

Quản lý và lên lịch nội dung:
- **List & Calendar Views**: Xem dạng danh sách hoặc lịch
- **Schedule Management**: Lên lịch đăng bài tự động
- **Bulk Operations**: Xử lý nhiều bài viết cùng lúc
- **Analytics Overlay**: Xem thống kê engagement

#### Tính năng chính:

- 📋 **List View**: Danh sách tất cả content đã lên lịch
- 📊 **Stats Dashboard**: Thống kê tổng quan
- 🔍 **Filter by Status**: Lọc theo draft/scheduled/posted/failed
- 🚀 **Quick Post**: Đăng ngay lập tức
- 🗑️ **Delete**: Xóa bài đã lên lịch

#### API Endpoints:

**GET `/api/content/schedule`**
- Query params: `kol_id` (optional)
- Returns: List of scheduled contents

**POST `/api/content/schedule`**
```json
{
  "kol_id": "string",
  "content": "Nội dung bài viết...",
  "platform": "facebook",
  "content_type": "post",
  "scheduled_time": "2025-12-20T10:00:00Z",
  "media": [],
  "created_by": "user_id",
  "status": "scheduled"
}
```

**PATCH `/api/content/schedule`**
- Update scheduled content

**DELETE `/api/content/schedule?id=xxx`**
- Delete scheduled content

**POST `/api/content/post`**
```json
{
  "content_id": "string"
}
```
- Đăng bài lên Facebook ngay lập tức

---

## TÍNH NĂNG 3: Facebook Integration Nâng Cao

### 🔄 Upgraded Webhook Handler

Cải tiến webhook xử lý comment và message với KOL personality:

#### `handleCommentWithKOL()` Function

Function nâng cao xử lý comment tự động:

```typescript
async function handleCommentWithKOL(
  commentId: string,
  userMessage: string,
  pageId: string,
  senderId: string
): Promise<void>
```

**Các bước xử lý:**

1. **Load KOL Profile**: Tìm KOL theo `pageId`
2. **Load Personality & History**:
   - Lấy system prompt từ personality
   - Load conversation history với user
3. **Apply Human-like Delays**: Giả lập typing time
4. **Generate Reply**:
   - Sử dụng Gemini AI với context
   - Apply personality characteristics
   - Thêm catchphrases (20% chance)
5. **Post-process**: Thêm emoji theo style
6. **Send Reply**: Trả lời comment
7. **Track**: Save history & update stats

#### Tính năng nổi bật:

- ✅ **Context-Aware**: Nhớ conversation history
- ✅ **Natural Delays**: Delay ngẫu nhiên để tự nhiên
- ✅ **Style Consistency**: Giữ đúng phong cách KOL
- ✅ **Smart Filtering**: Bỏ qua comment của chính page
- ✅ **Duplicate Prevention**: Không reply lại comment đã xử lý
- ✅ **Stats Tracking**: Theo dõi số lượng reply

### 🤖 Auto Posting

Tự động đăng bài theo lịch:

**Workflow:**

1. Tạo scheduled content trong Calendar
2. Set thời gian đăng bài
3. Hệ thống tự động đăng lúc đã lên lịch (cần implement cron job/scheduler)
4. Track post ID và analytics

**Manual Posting:**

Từ Calendar, click "Đăng ngay" để post ngay lập tức mà không cần đợi đến giờ đã lên lịch.

---

## Cấu trúc File

```
app/
├── types/
│   ├── kol.ts          # KOL types
│   └── content.ts      # Content generator types (NEW)
├── lib/
│   ├── kol-manager.ts  # KOL management
│   └── content-manager.ts  # Content management (NEW)
├── api/
│   ├── webhook/route.ts    # Facebook webhook (UPGRADED)
│   └── content/
│       ├── generate/route.ts  # Content generation (NEW)
│       ├── schedule/route.ts  # Schedule management (NEW)
│       └── post/route.ts      # Auto posting (NEW)
├── studio/
│   └── page.tsx        # Content Studio UI (NEW)
└── calendar/
    └── page.tsx        # Content Calendar UI (NEW)
```

---

## Biến môi trường cần thiết

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Facebook
FB_PAGE_ACCESS_TOKEN=
FB_VERIFY_TOKEN=

# AI
GEMINI_API_KEY=

# Optional: Media Generation APIs
OPENAI_API_KEY=          # For DALL-E
MIDJOURNEY_API_KEY=      # For Midjourney
RUNWAY_API_KEY=          # For Runway video
```

---

## Roadmap

### Tính năng sẽ bổ sung:

- [ ] **Drag & Drop Calendar**: Implement với FullCalendar hoặc React Big Calendar
- [ ] **Template Library**: Thư viện templates có sẵn
- [ ] **A/B Testing**: Test nhiều variants và chọn best performer
- [ ] **Analytics Dashboard**: Dashboard theo dõi performance
- [ ] **Image Editor**: Edit ảnh trực tiếp trong Studio
- [ ] **Video Generator**: Tích hợp Runway/Pika API thực tế
- [ ] **Bulk Upload**: Upload nhiều bài cùng lúc từ CSV/Excel
- [ ] **Smart Scheduling**: AI suggest best time to post
- [ ] **Cron Job**: Auto post scheduled content

---

## Hướng dẫn Deploy

### Vercel (Recommended)

```bash
# Clone repo
git clone <repo-url>

# Install dependencies
npm install

# Setup environment variables trong Vercel Dashboard

# Deploy
vercel --prod
```

### Facebook Webhook Setup

1. Tạo Facebook App tại developers.facebook.com
2. Add "Webhooks" product
3. Setup webhook URL: `https://your-domain.com/api/webhook`
4. Verify token: Dùng giá trị `FB_VERIFY_TOKEN`
5. Subscribe to:
   - `messages`
   - `feed` (for comments)
   - `messaging_postbacks`

---

## Support

Nếu gặp vấn đề, hãy check:
1. Logs trong Vercel Dashboard
2. Firebase Console
3. Facebook App Dashboard > Webhooks

---

**Version**: 2.0
**Last Updated**: December 2025
**Author**: AI KOL Manager Team
