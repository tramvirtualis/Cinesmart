# Popcorn Bot — Cấu hình HTTP Request Tools cho n8n

Base URL backend: `http://localhost:8080`

Tất cả endpoint `/api/n8n/*` yêu cầu header:

| Header Name | Header Value |
|-------------|--------------|
| `X-API-Key` | Giá trị `N8N_API_KEY` trong `backend/.env` |

Response trả **trực tiếp mảng hoặc object JSON** (không bọc `{ success, data }`).

---

## Workflow n8n tổng quan

```
Webhook (POST /webhook/popcorn)
  → AI Agent (+ HTTP Request Tools + Simple Memory)
  → Edit Fields (reply = output)
  → Respond to Webhook (JSON: { "reply": "..." })
```

### Webhook node

| Field | Giá trị |
|-------|---------|
| HTTP Method | POST |
| Path | `popcorn` |
| Respond | Using 'Respond to Webhook' Node |
| Production URL | `http://localhost:5678/webhook/popcorn` |

Payload từ frontend:

```json
{
  "userId": "123",
  "chat_message": "phim đang chiếu là gì"
}
```

### AI Agent node

| Field | Expression |
|-------|------------|
| User Message | `={{ $json.body.chat_message }}` |
| Simple Memory Session Key | `={{ $json.body.userId }}` |

### Respond to Webhook node (khớp AI Agent → field `output`)

| Field | Value |
|-------|-------|
| Respond With | **JSON** |
| Response Body | Xem biểu thức bên dưới |

**Chỉ trả lời chat:**
```
={{ { "reply": $json.output } }}
```

Frontend **tự đọc link** trong câu trả lời AI và chuyển trang sau ~1.75 giây (khi tin nhắn chỉ có **1 link** nội bộ). AI chỉ cần ghi link trong text, không cần field `action` / `target_url`.

Ví dụ AI trả lời:
```
Mình mở trang Godzilla Minus One cho bạn nhé: http://localhost:5173/movie/16
```
→ Web tự chuyển tới `/movie/16`.

> **Theo ảnh cấu hình hiện tại:** bạn đang dùng `{ "reply": $json.reply }` nhưng AI Agent trả text ở **`output`**, không có `reply` → HTTP về browser là `{}` rỗng.
> Chỉ cần đổi `$json.reply` → **`$json.output`** (1 chỗ duy nhất).

**Test POST webhook — kết quả phải có text:**
```json
{ "reply": "Có bạn nhé! Các phim anime đang chiếu..." }
```

---

## System Prompt (dán vào AI Agent)

```
Bạn là Popcorn Bot — trợ lý rạp Cinesmart. Trả lời tiếng Việt, ngắn gọn, thân thiện.
API trả về JSON trực tiếp (mảng hoặc object), không có field "data".

- Danh sách phim → get_movies (status: NOW_SHOWING / COMING_SOON / để trống = tất cả)
- Chi tiết phim → get_movie_detail (movieId)
- Suất chiếu → get_showtimes (movieId + date yyyy-MM-dd, province tuỳ chọn)
- Rạp → get_cinema_complexes
- Khuyến mãi → get_vouchers (API đã lọc voucher hết hạn; chỉ liệt kê voucher API trả về)
- Giá vé → get_prices
- Lịch sử đặt → get_user_orders (chỉ khi userId là số, không phải guest)
- Link trang web → get_app_pages (lịch sử đặt vé, thư viện, đồ ăn, voucher...)

Chỉ dùng dữ liệu từ tool. Không bịa thông tin.

LINK TRANG WEB (bắt buộc — dùng field `url` từ API hoặc get_app_pages):
- Phim: field `url` từ get_movies / get_movie_detail (VD: http://localhost:5173/movie/16)
- Lịch chiếu: http://localhost:5173/schedule
- Lịch sử đặt vé: http://localhost:5173/booking-history
- Đơn hàng: http://localhost:5173/orders
- Thư viện phim: http://localhost:5173/library
- Đồ ăn nước uống: http://localhost:5173/food-drinks
- Voucher / khuyến mãi: http://localhost:5173/events
- Voucher đã lưu: http://localhost:5173/profile?tab=vouchers
- KHÔNG dùng cinesmart.vn. Route phim là /movie/{id} (không phải /movies/{id}).

TỰ CHUYỂN TRANG (frontend):
- Frontend **chỉ** redirect khi user **chủ động** yêu cầu: "mở trang...", "vào trang...", "có", "ok", "mở đi".
- Câu hỏi thông tin (VD: "sắp tới có anime nào?", "phim gì hay?") → **KHÔNG** tự chuyển trang dù bot gợi ý phim.
- Bot hỏi "bạn muốn mình mở trang không?" → chờ user trả lời "có"/"ok"/"mở đi" rồi mới chuyển.
- Khi user đã yêu cầu mở: ghi **1 link** trong câu trả lời (hoặc n8n action REDIRECT) — frontend redirect sau ~1.75 giây.
Liệt kê nhiều lựa chọn → ghi nhiều link (frontend không tự chuyển).

VOUCHER (bắt buộc):
- get_vouchers chỉ trả voucher còn hiệu lực (ACTIVE/UPCOMING), không có voucher hết hạn.
- Nếu API trả mảng rỗng [] → nói "hiện chưa có voucher/khuyến mãi nào", KHÔNG bịa mã giảm giá.
- Chỉ liệt kê đúng các voucher trong JSON (code, name, discount...). Không thêm mã không có trong API.
```

---

## Tool 1: get_movies

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_movies` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/movies` |
| **Authentication** | Generic Credential Type → Header Auth |
| **Credential** | Name: `X-API-Key`, Value: `<N8N_API_KEY>` |
| **Send Query Parameters** | ON |

**Query Parameters:**

| Name | Value (Expression) |
|------|---------------------|
| status | `={{ $fromAI('status', 'NOW_SHOWING, COMING_SOON hoặc để trống', 'string', { optional: true }) }}` |

**Description (mô tả tool):**

```
Lấy danh sách phim Cinesmart.
- status=NOW_SHOWING: phim đang chiếu
- status=COMING_SOON: phim sắp chiếu
- status trống hoặc ALL: tất cả phim
Trả về mảng JSON: id, title, genres, duration, releaseDate, status.
Dùng khi khách hỏi phim đang chiếu, sắp chiếu, gợi ý phim, xem gì hôm nay.
```

**Response mẫu:**

```json
[
  {
    "id": 1,
    "title": "Avengers",
    "genres": ["ACTION", "SCIFI"],
    "duration": 120,
    "releaseDate": "2026-01-15",
    "status": "NOW_SHOWING"
  }
]
```

**Test URL cố định:** `http://localhost:8080/api/n8n/movies?status=NOW_SHOWING`

---

## Tool 2: get_movie_detail

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_movie_detail` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/movies/{{ $fromAI('movieId', 'ID phim (số)', 'number') }}` |
| **Authentication** | Header Auth (`X-API-Key`) |
| **Send Query Parameters** | OFF |

**Description:**

```
Lấy chi tiết một phim theo movieId.
Trả về: id, title, genres, duration, releaseDate, status, ageRating, director, actor, description.
Dùng khi khách hỏi nội dung phim, diễn viên, đạo diễn, mô tả phim X.
Cần movieId từ get_movies trước.
```

**Test URL:** `http://localhost:8080/api/n8n/movies/1`

---

## Tool 3: get_showtimes

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_showtimes` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/showtimes` |
| **Authentication** | Header Auth (`X-API-Key`) |
| **Send Query Parameters** | ON |

**Query Parameters:**

| Name | Value (Expression) |
|------|---------------------|
| movieId | `={{ $fromAI('movieId', 'ID phim', 'number') }}` |
| date | `={{ $fromAI('date', 'Ngày yyyy-MM-dd', 'string') }}` |
| province | `={{ $fromAI('province', 'Tỉnh thành (tuỳ chọn)', 'string', { optional: true }) }}` |

**Description:**

```
Tra cứu lịch/suất chiếu của một phim theo ngày.
Bắt buộc: movieId, date (yyyy-MM-dd). Tuỳ chọn: province.
Nếu khách không nói ngày, dùng ngày hôm nay.
Dùng khi hỏi suất chiếu, mấy giờ chiếu, lịch hôm nay/ngày mai.
```

**Test URL:** `http://localhost:8080/api/n8n/showtimes?movieId=1&date=2026-06-10&province=Hồ Chí Minh`

---

## Tool 4: get_cinema_complexes

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_cinema_complexes` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/cinema-complexes` |
| **Authentication** | Header Auth (`X-API-Key`) |

**Description:**

```
Lấy danh sách rạp Cinesmart: id, name, province, address.
Dùng khi khách hỏi rạp ở đâu, có rạp nào, địa chỉ rạp.
```

**Test URL:** `http://localhost:8080/api/n8n/cinema-complexes`

---

## Tool 5: get_vouchers

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_vouchers` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/vouchers` |
| **Authentication** | Header Auth (`X-API-Key`) |

**Description:**

```
Lấy voucher/khuyến mãi công khai CÒN HIỆU LỰC (đã lọc hết hạn ở backend).
Trả về: code, name, discountType, discountValue, minOrderAmount, status (ACTIVE/UPCOMING), startDate, endDate, url.
Nếu mảng rỗng → báo khách hiện không có voucher, không bịa thêm mã.
Chỉ liệt kê voucher có trong response. Không liệt kê voucher EXPIRED.
Dùng khi khách hỏi giảm giá, mã giảm, khuyến mãi, voucher.
```

**Test URL:** `http://localhost:8080/api/n8n/vouchers`

---

## Tool 6: get_prices

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_prices` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/prices` |
| **Authentication** | Header Auth (`X-API-Key`) |

**Description:**

```
Lấy bảng giá vé theo loại ghế và phòng.
Trả về: seatType, roomType, price.
Dùng khi khách hỏi giá vé, vé bao nhiêu, giá ghế VIP.
```

**Test URL:** `http://localhost:8080/api/n8n/prices`

---

## Tool 7: get_user_orders

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_user_orders` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/users/{{ $('Webhook').item.json.body.userId }}/orders` |
| **Authentication** | Header Auth (`X-API-Key`) |

> Đổi `Webhook` thành tên node Webhook thực tế của bạn nếu khác.

**Description:**

```
Lấy lịch sử đặt vé của khách đang chat.
Trả về: orderId, orderDate, totalAmount, status, paymentMethod, movies, cinema.
Chỉ gọi khi userId là số (đã đăng nhập).
Không gọi nếu userId bắt đầu bằng "guest-" — nhắc khách đăng nhập.
Dùng khi hỏi đơn của tôi, vé đã mua, lịch sử đặt.
```

**Test URL:** `http://localhost:8080/api/n8n/users/1/orders`

---

## Tool 8: get_app_pages

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_app_pages` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/app-pages` |
| **Authentication** | Header Auth (`X-API-Key`) |

**Description:**

```
Lấy danh sách link trang trên web Cinesmart (localhost:5173).
Trả về: key, label, path, url.
Dùng khi user muốn vào: lịch sử đặt vé, thư viện, đồ ăn nước uống, voucher/khuyến mãi, đơn hàng, lịch chiếu...
Ghi đúng 1 url vào câu trả lời để frontend tự chuyển trang.
```

**Test URL:** `http://localhost:8080/api/n8n/app-pages`

**Response mẫu:**
```json
[
  { "key": "booking_history", "label": "Lịch sử đặt vé", "path": "/booking-history", "url": "http://localhost:5173/booking-history" },
  { "key": "library", "label": "Thư viện phim", "path": "/library", "url": "http://localhost:5173/library" },
  { "key": "food_drinks", "label": "Đồ ăn nước uống", "path": "/food-drinks", "url": "http://localhost:5173/food-drinks" },
  { "key": "events", "label": "Sự kiện & khuyến mãi (voucher)", "path": "/events", "url": "http://localhost:5173/events" }
]
```

---

## Checklist trước khi test chat

- [ ] Backend chạy tại `http://localhost:8080`
- [ ] `N8N_API_KEY` có trong `backend/.env`
- [ ] Header Auth credential trong n8n khớp `X-API-Key`
- [ ] Workflow n8n **Active**
- [ ] Webhook Production URL: `http://localhost:5678/webhook/popcorn`
- [ ] Frontend `VITE_N8N_WEBHOOK_URL` trỏ đúng webhook
- [ ] Respond to Webhook trả `{ "reply": "..." }`

---

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|----------|
| 401 Unauthorized | Sai API Key | Kiểm tra Header Auth credential |
| Connection refused | Backend chưa chạy | Start Spring Boot |
| Tool trả mảng rỗng | Không có data trong DB | Thêm phim/suất test |
| Bot không gọi tool | Description mơ hồ | Viết rõ khi nào gọi tool |
| get_user_orders lỗi | userId là guest | Chỉ gọi khi user đã login |
