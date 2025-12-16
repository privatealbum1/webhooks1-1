# 🔑 Hướng Dẫn Lấy Facebook Token Vĩnh Viễn

## ⚠️ Vấn Đề
Token từ Facebook Login Button chỉ tồn tại **1 giờ**. Để hệ thống hoạt động lâu dài, bạn cần:
- **User Token**: 60 ngày
- **Page Token**: Vĩnh viễn (không hết hạn)

---

## 📋 Yêu Cầu

### 1. Facebook App Cần Có 7 Quyền (Permissions)
✅ `pages_show_list`
✅ `pages_read_engagement`
✅ `pages_manage_posts`
✅ `pages_manage_metadata`
✅ `pages_messaging`
✅ `read_insights`
✅ `pages_read_user_content`

### 2. Cấu Hình Biến Môi Trường
Trong Vercel → Settings → Environment Variables:

```env
FB_APP_ID=3918018128495962
FB_APP_SECRET=your_app_secret_here
```

**Lấy FB_APP_SECRET:**
1. Vào [Facebook Developers](https://developers.facebook.com/apps/)
2. Chọn App của bạn
3. Settings → Basic → App Secret → Show → Copy

---

## 🚀 Quy Trình 3 Bước

### **Bước 1: Generate User Token**

1. Vào [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Chọn App của bạn
3. Click "Permissions" → Add các quyền sau:
   - pages_show_list
   - pages_read_engagement
   - pages_manage_posts
   - pages_manage_metadata
   - pages_messaging
   - read_insights
   - pages_read_user_content
4. Click **"Generate Access Token"**
5. Copy token (token này chỉ sống 1 giờ)

---

### **Bước 2: Extend Token Thành 60 Ngày**

#### **Cách 1: Dùng UI (Khuyến nghị)** ✨
1. Vào trang `/connect` trong app
2. Paste token vào ô **"User Access Token (1 giờ)"**
3. Click nút **"🔄 Extend Token (60 ngày)"**
4. Copy token 60 ngày được tạo ra

#### **Cách 2: Dùng Access Token Debugger**
1. Vào [Access Token Tool](https://developers.facebook.com/tools/debug/accesstoken/)
2. Paste token vào
3. Click **"Extend Access Token"**
4. Copy token mới (60 ngày)

#### **Cách 3: Gọi API Trực Tiếp**
```bash
curl -X GET "https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN"
```

---

### **Bước 3: Lấy Page Token Vĩnh Viễn**

#### **Cách 1: Dùng UI (Khuyến nghị)** ✨
1. Trong trang `/connect`, sau khi đã extend token
2. Click nút **"🚀 Kết Nối Pages (Token Vĩnh Viễn)"**
3. Hệ thống tự động lấy page tokens và lưu vào database

#### **Cách 2: Dùng Graph API Explorer**
1. Quay lại [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Dán token 60 ngày vào ô "Access Token"
3. Gọi endpoint: `me/accounts?fields=name,access_token`
4. Trong response, lấy `access_token` của từng Page
5. **Token này vĩnh viễn và không hết hạn!**

#### **Cách 3: Gọi API**
```bash
curl -X GET "https://graph.facebook.com/v24.0/me/accounts?fields=name,access_token&access_token=YOUR_60_DAY_TOKEN"
```

Response:
```json
{
  "data": [
    {
      "access_token": "EAAF...long_lived_page_token...",
      "name": "Your Page Name",
      "id": "123456789"
    }
  ]
}
```

---

## 🎯 Kết Quả

Sau khi hoàn thành 3 bước:
- ✅ Page tokens được lưu vào `registered_pages` collection trong Firestore
- ✅ Tokens không hết hạn (vĩnh viễn)
- ✅ KOL có thể kết nối với pages thông qua dropdown trong KOL Editor
- ✅ Analytics và sync stats hoạt động bình thường

---

## 🔧 Troubleshooting

### Lỗi: "FB_APP_SECRET not configured"
**Nguyên nhân**: Chưa cấu hình FB_APP_SECRET trong Vercel
**Giải pháp**:
1. Vào Vercel → Project → Settings → Environment Variables
2. Add: `FB_APP_SECRET=your_secret`
3. Redeploy app

### Lỗi: "Invalid OAuth access token"
**Nguyên nhân**: Token đã hết hạn
**Giải pháp**: Làm lại từ Bước 1

### Lỗi: "Permission error" (Code 200)
**Nguyên nhân**: Thiếu permissions
**Giải pháp**:
1. Kiểm tra lại 7 quyền trong Bước 1
2. Generate token mới với đủ quyền

### Token Insights bị lỗi (#100)
**Nguyên nhân**: Một số metrics không available cho page
**Giải pháp**: Hệ thống tự động fallback sang basic metrics

---

## 📚 Tham Khảo

- [Facebook Graph API Docs](https://developers.facebook.com/docs/graph-api/)
- [Access Token Types](https://developers.facebook.com/docs/facebook-login/guides/access-tokens)
- [Page Access Tokens](https://developers.facebook.com/docs/pages/access-tokens)
- [Token Expiration](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/expiration-and-extension)

---

## 💡 Tips

1. **Lưu token vĩnh viễn an toàn**: Chỉ lưu trong database, không commit vào code
2. **Backup tokens**: Export registered_pages collection định kỳ
3. **Monitor token health**: Kiểm tra token status trong KOL Editor
4. **Renew khi cần**: Nếu token bị revoke, làm lại từ đầu

---

**Cần trợ giúp?** Mở issue trên GitHub hoặc liên hệ support team.
