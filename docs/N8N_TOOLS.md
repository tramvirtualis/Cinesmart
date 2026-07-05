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
API trả JSON field tiếng Anh; giá trị status/genres là tiếng Việt. Response có id để gọi tool tiếp theo.

QUAN TRỌNG — PHÂN BIỆT 2 LOẠI PHIM:
1. **Phim đang chiếu (danh mục)** → get_movies (status: NOW_SHOWING hoặc COMING_SOON)
   - Phim có trong hệ thống rạp, có thể CHƯA có suất vào ngày/thành phố cụ thể.
   - Dùng khi: "phim gì đang chiếu", "có phim gì", "gợi ý phim", "phim hay".
2. **Phim đang CÓ SUẤT CHIẾU (đặt vé được)** → get_movies_with_showtimes (date + province tuỳ chọn)
   - Chỉ phim còn suất trong tương lai vào ngày đã chọn.
   - Dùng khi: "phim gì chiếu hôm nay", "có suất nào", "đặt vé phim gì", "ở HCM chiếu gì".
   - Khách không nói ngày → để trống date (API dùng hôm nay).
   - Khách nói thành phố → truyền province.

CÔNG CỤ:
- Danh mục phim → get_movies
- Phim có suất theo ngày/địa phương → get_movies_with_showtimes
- Chi tiết phim → get_movie_detail (movieId từ get_movies)
- Suất chiếu một phim → get_showtimes (movieId + date, province tuỳ chọn)
- Rạp → get_cinema_complexes | Đồ ăn/nước uống → get_food_combos (cinemaId từ get_cinema_complexes, hoặc province)
- Khuyến mãi → get_vouchers | Giá vé → get_prices
- Lịch sử đặt → get_user_orders (chỉ khi userId là số) | Link trang → get_app_pages

Chỉ dùng dữ liệu từ tool. Không bịa thông tin.

CÁCH TRẢ LỜI (bắt buộc — tránh lộ jargon):
- Dùng id/movieId/cinemaId CHỈ khi gọi tool nội bộ. KHÔNG BAO GIỜ nói số id với khách.
- KHÔNG nói: movieId, showtimeId, cinemaId, NOW_SHOWING, COMING_SOON, ACTION, tên field JSON, tên tool.
- Nói tự nhiên: "tên phim", "giờ chiếu", "rạp", "đang chiếu" — KHÔNG đọc nguyên key API.
- Liệt kê phim bằng bullet (•) hoặc số, KHÔNG dồn hết vào 1 đoạn dài.
- Đọc field description trong response để biết loại danh sách trước khi trả lời.

LINK: dùng field url từ API hoặc get_app_pages. Route phim: /movie/{id}. KHÔNG dùng cinesmart.vn.

TỰ CHUYỂN TRANG: chỉ khi user chủ động "mở trang...", "mở phim...", "có", "ok", "mở đi".

VOUCHER: mảng rỗng → nói chưa có khuyến mãi, không bịa mã.

ĐỒ ĂN/NƯỚC UỐNG:
- Gọi get_cinema_complexes lấy id rạp → get_food_combos(cinemaId=...).
- Hoặc get_food_combos(province=...) để xem menu theo thành phố.
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
Lấy DANH MỤC phim Cinesmart (KHÔNG phải phim có suất cụ thể).
- status=NOW_SHOWING: phim đang chiếu trong hệ thống (có thể chưa có suất hôm nay)
- status=COMING_SOON: phim sắp chiếu
- status trống: tất cả phim
Trả về object: listType, description, movies[] (id, title, genres, status, url...).
Giá trị status/genres là tiếng Việt. Dùng id khi gọi get_movie_detail / get_showtimes.
Dùng khi: "phim đang chiếu", "gợi ý phim", "có phim gì".
KHÔNG dùng khi khách hỏi suất hôm nay / đặt vé / phim chiếu ở HCM → dùng get_movies_with_showtimes.
```

**Response mẫu:**

```json
{
  "listType": "Phim đang chiếu (danh mục rạp)",
  "description": "Phim đang chiếu trong danh mục...",
  "movies": [
    {
      "id": 1,
      "title": "Inception",
      "genres": ["Khoa học viễn tưởng", "Hành động"],
      "duration": 120,
      "status": "Đang chiếu",
      "url": "http://localhost:5173/movie/1"
    }
  ]
}
```

**Test URL cố định:** `http://localhost:8080/api/n8n/movies?status=NOW_SHOWING`

---

## Tool 1b: get_movies_with_showtimes

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_movies_with_showtimes` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/movies-with-showtimes` |
| **Authentication** | Header Auth (`X-API-Key`) |
| **Send Query Parameters** | ON |

**Query Parameters:**

| Name | Value (Expression) |
|------|---------------------|
| date | `={{ $fromAI('date', 'Ngày yyyy-MM-dd, mặc định hôm nay', 'string', { optional: true }) }}` |
| province | `={{ $fromAI('province', 'Tỉnh/thành phố (tuỳ chọn)', 'string', { optional: true }) }}` |

**Description:**

```
Lấy phim ĐANG CÓ SUẤT CHIẾU còn vé (có thể đặt) theo ngày và địa phương.
Trả về: listType, description, date, province, movies[].
Dùng khi: "phim gì chiếu hôm nay", "ở HCM có suất gì", "đặt vé phim nào".
Nếu khách không nói ngày → để trống date (API dùng hôm nay).
```

**Test URL:** `http://localhost:8080/api/n8n/movies-with-showtimes?date=2026-06-10&province=Hồ Chí Minh`

---

## Tool 2: get_movie_detail

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_movie_detail` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/movies/detail` |
| **Authentication** | Header Auth (`X-API-Key`) |
| **Send Query Parameters** | ON |

**Query Parameters:**

| Name | Value (Expression) |
|------|---------------------|
| movieId | `={{ $fromAI('movieId', 'ID phim (số) từ get_movies', 'number', { optional: true }) }}` |
| movieTitle | `={{ $fromAI('movieTitle', 'Tên phim cần tìm', 'string', { optional: true }) }}` |

**Description:**

```
Lấy chi tiết một phim. Có thể truyền movieId (số) HOẶC movieTitle (chữ).
Trả về: id, title, genres, description, director, actor, ageRating, url...
Ưu tiên truyền movieTitle trực tiếp từ câu hỏi của khách (VD: "Trốn Chạy Tử Thần").
```

**Test URL:** `http://localhost:8080/api/n8n/movies/detail?movieId=1`

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
| movieId | `={{ $fromAI('movieId', 'ID phim từ get_movies', 'number', { optional: true }) }}` |
| movieTitle | `={{ $fromAI('movieTitle', 'Tên phim cần tra cứu', 'string', { optional: true }) }}` |
| date | `={{ $fromAI('date', 'Ngày yyyy-MM-dd', 'string') }}` |
| province | `={{ $fromAI('province', 'Tỉnh thành (tuỳ chọn)', 'string', { optional: true }) }}` |

**Description:**

```
Tra cứu suất chiếu của một phim theo ngày.
Bắt buộc: date (yyyy-MM-dd) và một trong hai (movieId HOẶC movieTitle). Tuỳ chọn: province.
Ưu tiên truyền thẳng movieTitle nếu khách gọi tên phim rõ ràng.
Trả về: movieTitle, date, description, showtimes[] (showtimeLabel, cinemaName, roomType, price...).
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
Dùng id rạp cho get_food_combos(cinemaId).
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
Trả về: code, name, discountType, discountValue, minOrderAmount, status, startDate, endDate, url.
Giá trị status/discountType là tiếng Việt. Mảng rỗng → báo chưa có khuyến mãi, không bịa mã.
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
Trả về: orderDate, totalAmount, status, paymentMethod, movies, cinema (không có orderId).
Giá trị status/paymentMethod là tiếng Việt. Chỉ gọi khi userId là số (đã đăng nhập).
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

## Tool 9: get_food_combos

| Field | Giá trị |
|-------|---------|
| **Tool Name** | `get_food_combos` |
| **Method** | GET |
| **URL** | `http://localhost:8080/api/n8n/food-combos` |
| **Authentication** | Header Auth (`X-API-Key`) |
| **Send Query Parameters** | ON |

**Query Parameters:**

| Name | Value (Expression) |
|------|---------------------|
| cinemaId | `={{ $fromAI('cinemaId', 'ID rạp từ get_cinema_complexes', 'number', { optional: true }) }}` |
| province | `={{ $fromAI('province', 'Tỉnh/thành phố (tuỳ chọn)', 'string', { optional: true }) }}` |

**Description:**

```
Lấy menu đồ ăn/nước uống theo rạp.
- cinemaId: menu một rạp (lấy id từ get_cinema_complexes)
- province: menu tất cả rạp trong thành phố
- Cả hai để trống: gọi get_cinema_complexes trước để lấy cinemaId
Trả về: description, url, menus[] (cinemaId, cinemaName, province, items[]).
```

**Response mẫu:**

```json
{
  "description": "Menu đồ ăn/nước uống tại rạp CGV Vincom...",
  "url": "http://localhost:5173/food-drinks",
  "menus": [
    {
      "cinemaId": 1,
      "cinemaName": "CGV Vincom Center",
      "province": "Hồ Chí Minh",
      "address": "72 Lê Thánh Tôn, Hồ Chí Minh",
      "items": [
        {
          "name": "Combo Couple",
          "price": 89000,
          "description": "1 bắp lớn + 2 nước"
        }
      ]
    }
  ]
}
```

**Test URL:** `http://localhost:8080/api/n8n/food-combos?cinemaId=1`

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
