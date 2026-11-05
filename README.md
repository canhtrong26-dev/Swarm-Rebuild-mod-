# Swarm Rebuild — Phiên bản AI Cursors (mod bởi Võ Trọng Cảnh)

## Giới thiệu

Swarm Rebuild là một extension (tiện ích) cho Chrome. Khi bật lên, nó xoá trắng trang web bạn đang xem, rồi cho một đàn con trỏ chuột vẽ lại trang đó ngay trước mắt bạn. Các con trỏ kéo khung, gõ chữ, vẽ đường và nhân bản thành phần, giống như cả nhóm đang cùng làm việc trên Figma.

Bản mod này biến đàn con trỏ thành các AI nổi tiếng. Mỗi con trỏ mang logo và tên của một AI như ChatGPT, Claude hay Gemini, nên trông như các AI đang cùng nhau dựng lại trang web.

## Demo

Mở tab bất kỳ → nhấn `Alt+Shift+S` → xem đàn cursor AI vẽ lại trang.

## Tính năng mod

- **Cursor có logo AI:** 12 AI thay cho mũi tên màu kiểu Figma.
- **Có nhãn tên:** tên AI hiện cạnh con trỏ, nền theo màu của con trỏ đó.
- **Phóng to, nhìn rõ:** con trỏ to hơn khoảng 43% và không còn bị mờ.
- **Có mũi tên dự phòng:** nếu logo không tải được, con trỏ vẫn hiện mũi tên màu.
- **Sửa lỗi NaN:** số không hợp lệ không còn lọt vào hình SVG và gây lỗi nữa.

## Cấu trúc thư mục

```text
swarm-cursors/
├── README.md               Tài liệu bạn đang đọc.
├── PRIVACY.md              Chính sách quyền riêng tư của bản gốc.
├── .gitignore              Danh sách file Git bỏ qua, ví dụ khoá ký *.pem.
└── swarm-rebuild/          Toàn bộ extension. Đây là folder cần nạp vào Chrome.
    ├── manifest.json       "Giấy khai sinh" của extension: tên, quyền, phím tắt.
    ├── background.js       Chạy nền, nghe lệnh bấm icon rồi đưa swarm.js vào trang.
    ├── swarm.js            Phần chính: chụp trang, vẽ, điều khiển đàn con trỏ, âm thanh.
    └── icons/
        ├── icon16.png ...  Icon của extension trên thanh công cụ (4 kích thước).
        └── ai/             Logo của 12 AI, mỗi AI một file .svg.
```

`icons/ai/anthropic.svg` hiện không được dùng. File này chỉ để dự phòng, xoá cũng không sao.

## Giải thích chi tiết các file quan trọng

### manifest.json

Chrome đọc file này đầu tiên để biết extension là gì và được phép làm gì.

JSON thật không cho phép viết comment. Comment dưới đây chỉ để giải thích, đừng chép vào file:

```jsonc
{
  "manifest_version": 3,                   // Dùng chuẩn extension mới nhất của Chrome (MV3)
  "permissions": ["activeTab", "scripting"], // activeTab: chỉ đụng vào tab bạn vừa bấm
                                           // scripting: được đưa code vào tab đó
  "action": { "default_title": "..." },    // Icon trên thanh công cụ và chữ hiện khi rê chuột
  "commands": { "_execute_action": {} },   // Gán phím tắt Alt+Shift+S cho việc bấm icon
  "web_accessible_resources": [{           // Những file trang web được phép tải từ extension
    "resources": ["icons/ai/*.svg"],       // Thiếu dòng này thì Chrome chặn logo AI
    "matches": ["<all_urls>"]              // Cho phép trên mọi trang
  }]
}
```

Trong file thật, `resources` còn có `*.webp` và `*.png`. Hai mục này còn lại từ lúc dùng logo cũ, hiện không cần nhưng cũng không gây hại.

### background.js

Đây là **service worker**, tức một đoạn code chạy ngầm và chỉ thức dậy khi có việc. Khi bạn bấm icon, nó làm 3 bước:

1. Kiểm tra trang có canvas, video hay iframe không, và swarm đã chạy chưa.
2. Nếu có, nó chụp màn hình để lấy hình của những phần đó, vì code không tự đọc được.
3. Đưa `swarm.js` vào trang. Nếu trang cấm chạy script, icon hiện dấu × đỏ.

### swarm.js

File này khoảng 3.800 dòng, gồm 5 phần chính. Số dòng dưới đây có thể lệch một chút nếu bạn sửa file.

| Phần | Dòng | Việc làm |
| --- | --- | --- |
| Hằng số | 20 | Tên AI, bảng màu, giới hạn số con trỏ, hàm tiện ích |
| Chụp trang | 149 | Đọc **DOM** (cây các phần tử của trang) thành bản thiết kế |
| Hiển thị | 1620 | Vẽ mọi thứ lên màn hình, trong **shadow DOM** |
| Bộ máy | 2104 | Chuyển động của đàn con trỏ và các thao tác dựng trang |
| Âm thanh | 3063 | Tạo tiếng gõ phím, tiếng click, tiếng piano bằng code |

**Shadow DOM** giống một căn phòng riêng: CSS của trang web không lọt vào làm lệch giao diện của extension. **SVG** là ảnh vẽ bằng mã, phóng to bao nhiêu cũng không vỡ.

Các phần do bản mod thêm vào:

- **Logo AI:** hàm `cursorSVG` (dòng 91) và phần xử lý logo trong `renderCursors` (dòng 1943).
- **Nhãn tên:** CSS `.cursor-label` (dòng 1514).
- **Sửa NaN:** hàm `f1` (dòng 50).

```js
// Làm tròn số tới 1 chữ số thập phân.
// Nếu n không phải số hợp lệ (NaN, undefined...) thì trả về 0 để SVG không bị lỗi.
const f1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : 0);
```

## Cách cài đặt extension vào Chrome

### Bước 1: Mở trang quản lý extension

Mở Chrome, gõ `chrome://extensions` vào thanh địa chỉ rồi nhấn Enter.

### Bước 2: Bật Developer mode

Nhìn lên góc trên bên phải, bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển). Sau khi bật, sẽ có thêm một hàng nút ở phía trên.

### Bước 3: Load extension

Bấm **Load unpacked** (Tải tiện ích đã giải nén), rồi chọn folder `swarm-rebuild`. Chọn đúng folder có file `manifest.json` bên trong, không chọn folder `swarm-cursors` bên ngoài.

Thẻ "Swarm Rebuild" sẽ hiện trong danh sách là thành công.

### Bước 4: Test

Mở một trang web bình thường rồi nhấn `Alt+Shift+S`, hoặc bấm icon extension. Trang sẽ mờ đi và đàn con trỏ AI bắt đầu vẽ.

Trong lúc chạy:

- **Cuộn trang:** đàn con trỏ đi theo bạn.
- **Tour:** tự cuộn trang cho bạn.
- **Nút tốc độ:** đổi giữa `0.5×`, `1×`, `2×`, `3×`. Mặc định là `0.5×`.
- **Phím M:** bật hoặc tắt âm thanh.
- **Esc:** thoát.

## Cách tuỳ chỉnh logo AI

### Đổi phong cách logo (Color/Mono/Avatar)

1. Vào [lobehub.com/icons](https://lobehub.com/icons) và tìm AI bạn muốn.
2. Chọn kiểu logo (Color, Mono hoặc Avatar) rồi tải file SVG.
3. Đổi tên file cho đúng quy tắc, ví dụ `claude-color.svg` thành `claude.svg`.
4. Chép vào `swarm-rebuild/icons/ai/`, ghi đè file cũ.
5. Reload extension ở `chrome://extensions`.

Logo Mono thường dùng màu đen mặc định, nên sẽ khó thấy trên trang nền tối. Hiện `chatgpt.svg`, `grok.svg` và `llama.svg` đang là dạng này.

### Thêm/bớt AI trong danh sách

Mở `swarm-rebuild/swarm.js`, tìm mảng `NAMES` ở dòng 22:

```js
// Danh sách tên AI. Mỗi con trỏ lấy một tên theo thứ tự, hết danh sách thì quay lại đầu.
const NAMES = [
  "ChatGPT", "Claude", "Gemini", "Copilot", "Grok", "DeepSeek",
  "Llama", "Mistral", "Perplexity", "Qwen", "Kimi", "DALL-E",
  "Tên AI mới", // Thêm tên ở đây. Muốn bớt thì xoá tên đó đi.
];
```

Mỗi tên cần một file `.svg` trong `icons/ai/`. Tên file được tính từ tên AI: đổi thành chữ thường, rồi bỏ mọi ký tự không phải chữ `a-z` hoặc số.

| Tên trong `NAMES` | Tên file |
| --- | --- |
| `ChatGPT` | `chatgpt.svg` |
| `DALL-E` | `dalle.svg` |
| `Tên AI mới` | `tnaimi.svg` (chữ có dấu bị bỏ nên nên tránh) |

Vì vậy, chỉ nên đặt tên AI không dấu. Nếu thiếu file, con trỏ sẽ hiện mũi tên màu.

## Khắc phục sự cố thường gặp

### Lỗi "Lỗi" đỏ khi load extension

Ở thẻ Swarm Rebuild trong `chrome://extensions`, bấm nút **Lỗi** (Errors) để xem chi tiết. Hãy chụp màn hình phần đó để nhờ người khác xem giúp.

Lỗi lúc đang chạy thì mở trang web đó, nhấn `F12`, chọn tab **Console** và chụp lại các dòng đỏ.

### Cursor hiện ô trống không có logo

Thử nhìn kỹ xem con trỏ đang hiện gì:

- **Hiện mũi tên màu:** logo không tải được. File `.svg` có thể sai tên hoặc chưa có trong `icons/ai/`. Cũng nên kiểm tra `web_accessible_resources` trong `manifest.json`.
- **Trông như trống:** logo có thể đã hiện, nhưng là logo đen trên trang nền tối. Thử trên trang nền trắng, hoặc đổi sang logo Color.

### Extension không chạy khi nhấn Alt+Shift+S

Chrome cấm extension chạy trên các trang `chrome://`, Chrome Web Store và trình xem PDF. Khi đó icon hiện dấu × đỏ. Hãy thử trên một trang web bình thường.

Nếu vẫn không được, phím tắt có thể bị trùng. Vào `chrome://extensions/shortcuts` để kiểm tra, hoặc bấm trực tiếp vào icon.

### Code đã sửa nhưng không thấy thay đổi

Chrome không tự cập nhật khi bạn sửa file. Sau mỗi lần sửa code:

1. Vào `chrome://extensions`, bấm nút reload (mũi tên vòng tròn) ở thẻ Swarm Rebuild.
2. Tải lại trang web đang test (`F5`).
3. Nhấn `Alt+Shift+S` lại.

## Lịch sử phát triển

Toàn bộ bản mod được thực hiện ngày **05/11/2026**, dựa trên bản gốc v1.1.0.

**Tính năng đã thêm**

- Đổi 32 tên lập trình viên thành 12 tên AI.
- Thêm logo AI và nhãn tên cho con trỏ.
- Phóng to con trỏ từ 28px lên 40px, tăng độ rõ lên 100%.
- Tăng cỡ chữ nhãn tên lên 13px.
- Thay logo ảnh bằng logo SVG cho cả 12 AI.
- Thêm tốc độ `0.5×` và đặt làm mặc định.

**Lỗi đã sửa**

- Lỗi `<rect> attribute height: Expected length, 'NaN'` khi vẽ khung chọn.
- Lỗi mũi tên dự phòng không hoạt động khi logo tải hỏng.

**Dọn dẹp**

- Dịch comment sang tiếng Việt.
- Xoá các folder không dùng: `demo/`, `media/`, `scripts/`, `store/`. Có thể lấy lại từ repo gốc.

## Credit

- Bản gốc: [Joel Califa](https://joelcalifa.com) ([swarm-site](https://github.com/califa/swarm-site)) + Dhvanil Patel ([swarm-cursors](https://github.com/DhvanilPatel/swarm-cursors) extension)
- Mod bởi: Võ Trọng Cảnh (fsdev7.com)

Thiết kế chuyển động, vật lý đàn con trỏ và cách dàn dựng là của Joel Califa. Nhiều phần của bộ máy animation được chuyển thể trực tiếp từ trang của anh ấy.

**Giấy phép:** dự án gốc chưa có giấy phép. Vì vậy, đừng dùng lại code này khi chưa hỏi ý kiến Joel Califa. Logo trong `icons/ai/` thuộc về các công ty sở hữu từng AI.
