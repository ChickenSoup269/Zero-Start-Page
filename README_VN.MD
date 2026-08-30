<img src="https://github.com/ChickenSoup269/imagesForRepo/blob/main/zero_extension/zero%20colab.png?raw=true" width="1200px" />

# <img src="./icon/logo.png" width="50px" /> Startpage - Trang chủ trình duyệt cá nhân hóa của bạn

Startpage là một tiện ích mở rộng trình duyệt (Manifest V3) cho phép tùy biến sâu, thay thế trang tab mới bằng một giao diện gọn gàng, đa dạng tính năng và đẹp mắt. Toàn bộ dữ liệu được lưu cục bộ — không tài khoản, không theo dõi.

<p align="center">
  <a href="https://github.com/ChickenSoup269/Zero-Start-Page/releases/tag/v2.0.0" target="_blank">
    <img src="https://img.shields.io/badge/B%E1%BA%A3n_ph%C3%A1t_h%C3%A0nh-v2.0.0-6366f1?style=for-the-badge&logo=github" alt="Phiên bản 2.0.0" height="32" />
  </a>
  &nbsp;
  <a href="https://chromewebstore.google.com/detail/zero-startpage-newtab-rep/ogdbkgoionmjnlinbmmjncnhafhaenck?authuser=0&hl=vi" target="_blank">
    <img src="https://img.shields.io/badge/Chrome_Web_Store-Kh%E1%BA%A3_d%E1%BB%A5ng-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Chrome Web Store" height="32" />
  </a>
  &nbsp;
  <a href="https://addons.mozilla.org/en-US/firefox/addon/zero-startpage-newtab/" target="_blank">
    <img src="https://img.shields.io/badge/Firefox_Add--ons-Kh%E1%BA%A3_d%E1%BB%A5ng-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white" alt="Firefox Add-ons" height="32" />
  </a>
</p>

<p align="center">
  <a href="https://unikorn.vn/p/zero-startpage?ref=embed-zero-startpage" target="_blank">
    <img src="https://unikorn.vn/api/widgets/badge/zero-startpage/rank?theme=light&type=daily" alt="Zero Startpage - Hàng ngày" style="width: 250px; height: 64px;" width="250" height="64" />
  </a>
  &nbsp;
  <a href="https://launch.j2team.dev/products/zero-startpage-newtab-replacement?utm_source=badge-launched&utm_medium=badge&utm_campaign=badge-zero-startpage-newtab-replacement" target="_blank">
    <img src="https://launch.j2team.dev/badge/zero-startpage-newtab-replacement/light" height="64" />
  </a>
</p>

---

<table width="100%">
  <tr>
    <td align="left">
      <a href="./README.md">English</a> | <strong>Tiếng Việt</strong>
    </td>
    <td align="right">
      <a href="https://extension-changelogs.vercel.app/changelog?ext=Zero+Startpage+-+Newtab+Replacement" target="_blank">Xem nhật ký thay đổi (Changelog v2.0.0)</a>
    </td>
  </tr>
</table>

---

## Bản cập nhật 2.0.0 có gì mới?

- **Nâng cấp Settings & Nút Vi Bước (Micro-Steppers)**: Bổ sung các nút bấm vi bước `(- / +)` và hỗ trợ cuộn con lăn chuột (Mouse Wheel) cho tất cả thanh trượt cài đặt, giúp tùy chỉnh chính xác từng pixel.
- **Khung xem trước trực tiếp (Live Previews)**: Xem trước tức thì giao diện Dấu trang (Bookmark Item), Thẻ thư mục (Group Tab) và Custom Title Studio ngay trong bảng cài đặt.
- **Nút Khôi phục Mặc định (Reset to Defaults)**: Bổ sung các nút Reset riêng biệt cho từng phân mục (Kích thước, Giao diện, Thẻ tab, Bố cục, Kiểu chữ, Hiệu ứng).
- **Widget Theo dõi Thói quen (Habit Tracker)**: Theo dõi tiến độ thói quen hàng ngày, đếm chuỗi ngày liên tiếp (streaks) với 3 chế độ màu (Màu riêng từng thói quen, Gradient Đỏ-Xanh, M3 Accent).
- **Widget Đọc tin tức RSS (RSS Reader)**: Tích hợp trình đọc RSS feed tùy chỉnh, cập nhật tin tức trực tiếp từ các nguồn bạn yêu thích kèm popup đọc gọn gàng.
- **Widget Thời tiết Thông minh**: Dự báo thời tiết thời gian thực qua Open-Meteo, hỗ trợ tùy chỉnh Endpoint & Geocoding và nút kiểm tra kết nối API trực tiếp.
- **Widget Danh ngôn Mỗi ngày (Daily Quotes)**: Tuyển tập các câu danh ngôn ý nghĩa với tùy chọn tần suất đổi (mỗi tab mới, theo giờ, hoặc theo ngày).
- **Âm thanh Tương tác Thời gian thực (Real-time Audio Reactive - Beta)**: Bắt luồng âm thanh tab (`tabCapture`) để sóng nhạc visualizer đập chuẩn xác theo điệu bass và nhịp beat bài hát.
- **Đồng hồ 3D Floating Glass Cubes**: Phong cách đồng hồ số 3D khối kính trong suốt với bệ Voxel, Volumetric Extrusion và hiệu ứng nghiêng tương tác theo góc nhìn.
- **Bộ hiệu ứng Shaders WebGL Đỉnh cao**: Mô phỏng Chất lỏng tương tác (Interactive Fluid), Quả cầu sương mờ (Frosted Glass Orbs), Hố đen vũ trụ (Black Hole) và Lưới Neon 3D (Neon Grid 3D).
- **Thanh công cụ Dấu trang Hàng loạt (Multi-Select)**: Chọn nhiều bookmark cùng lúc để xóa hàng loạt, gom nhóm vào thư mục mới hoặc di chuyển nhanh.
- **Bắt dính lưới khi kéo thả (Snap to Grid)**: Căn chỉnh widget thẳng hàng hoàn hảo với bước lưới tùy chọn từ 20px đến 100px.

---

## Tính năng

<table align="center">
<tr>
<th>Đồng hồ & Ngày tháng</th>
<th>Tìm kiếm thông minh</th>
</tr>

<tr>

<td>

- Đồng hồ thời gian thực cập nhật theo giây
- **Đồng hồ 3D Floating Glass Cubes** với bệ Voxel và hiệu ứng xoay nghiêng tương tác
- Nhiều định dạng ngày: Đầy đủ, Ngắn (DD/MM/YYYY), Mỹ (MM/DD/YYYY), ISO (YYYY-MM-DD)
- **Chế độ Đếm ngược (Countdown Mode)** — hiển thị thời gian của Timer trực tiếp trên mọi kiểu đồng hồ (Fliqlo, Analog, v.v.)
- Tùy chọn ẩn/hiển thị giây
- Tùy chỉnh kích thước và màu sắc đồng hồ linh hoạt
- Bật/tắt riêng biệt cho đồng hồ, ngày tháng và lịch Dương
- Hiển thị **lịch Âm** (tùy chọn)

</td>

<td>

- Tìm kiếm Google với gợi ý theo thời gian thực (tối đa 6 gợi ý kèm favicon)
- **Tích hợp Google Apps** — menu truy cập nhanh các dịch vụ của Google (tối ưu tải icon lazy-load để mở siêu tốc)
- **Hỗ trợ Google Lens** — tìm kiếm bằng hình ảnh qua tải file hoặc URL
- Tìm kiếm bằng hình ảnh: tải file lên, dán từ clipboard hoặc nhập URL ảnh
- Đa dạng công cụ tìm kiếm: Google, DuckDuckGo, Bing, Brave, Perplexity, Gemini, YouTube, GitHub...
- Gợi ý tìm kiếm nhanh với độ trễ 250 ms

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Quản lý dấu trang</th>
<th>Lịch đầy đủ</th>
</tr>

<tr>

<td>

- Thêm, sửa, xóa và sắp xếp lại dấu trang
- **Thao tác hàng loạt (Multi-Select)** — chọn nhiều bookmark để xóa, di chuyển hoặc tạo nhóm
- **Nhóm dấu trang** — tạo nhiều tab, đổi tên, sắp xếp lại và xóa nhóm
- **Tùy chỉnh phong cách riêng** — chỉnh màu nền, màu chữ và cỡ chữ riêng biệt cho từng nhóm
- **Live Preview trong Settings** — xem trước ngay tức thì kiểu card và tab khi tùy chỉnh
- Tự động lấy favicon qua Google Favicon API với fallback
- Nhập dấu trang trực tiếp từ bookmark của Chrome
- Menu chuột phải để thao tác nhanh

</td>

<td>

- Lịch xem theo tháng với điều hướng tháng trước/sau
- **Thêm, sửa, xóa sự kiện** với tiêu đề, giờ và mô tả
- Hỗ trợ nhiều sự kiện mỗi ngày (hiển thị "+X sự kiện")
- Hiển thị ngày **Âm lịch** và phát hiện **ngày lễ Việt Nam**
- Đa chế độ hiển thị: Lịch Dương, Lịch Âm, hoặc Song song cả hai
- Menu chuột phải trên ngày và sự kiện

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Công việc & Thói quen</th>
<th>Notepad</th>
</tr>

<tr>

<td>

- **Theo dõi Thói quen (Habit Tracker)** với thống kê chuỗi ngày liên tiếp, 3 chế độ màu tùy chọn (Từng mục, Gradient, M3)
- **Danh sách Công việc (Todo List)** thêm, hoàn thành và xóa việc nhanh chóng
- **Ẩn hiện Checkbox** — tùy chọn ẩn ô tích để danh sách trông tối giản hơn
- Chỉnh sửa trực tiếp qua menu chuột phải
- Tự động lưu trữ cục bộ vào localStorage

</td>

<td>

- Tạo nhiều ghi chú với màu sắc tùy chỉnh (8 màu có sẵn)
- **Trình soạn thảo văn bản phong phú**: in đậm, in nghiêng, gạch chân, gạch ngang, danh sách, xử lý link và chèn ảnh
- **Cửa sổ nổi** — kéo thả, thay đổi kích thước và gắn lại
- Ghi chú nổi có thể thu gọn/mở rộng, bật/tắt thanh edit và hiển thị trạng thái active của nút định dạng
- Ảnh trong note có chiều rộng cố định, không tràn khi ở cửa sổ nổi hoặc trong preview của notepad
- Ctrl/Cmd + click để mở link trong nội dung note
- Nền nội dung sáng/tối với màu nút chữ tự đổi tương phản
- Lưu toàn bộ nội dung, màu sắc và trạng thái cửa sổ

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Thời tiết & Danh ngôn</th>
<th>Trình đọc tin RSS</th>
</tr>

<tr>

<td>

- **Dự báo thời tiết thời gian thực** tích hợp nền tảng Open-Meteo
- Hỗ trợ tùy chỉnh API Endpoint dự báo & Geocoding kèm kiểm tra kết nối trực tiếp
- Chuyển đổi đơn vị nhiệt độ Celsius (°C) / Fahrenheit (°F)
- **Danh ngôn truyền cảm hứng mỗi ngày** tuyển chọn từ nhiều danh nhân
- Tùy chỉnh tần suất đổi danh ngôn (Mỗi Tab mới, Mỗi Giờ, Mỗi Ngày)

</td>

<td>

- Trình đọc tin RSS tích hợp dung lượng siêu nhẹ
- Thêm, quản lý và duyệt nhiều kênh tin tức RSS ưa thích
- Modal đọc tin tức gọn gàng, mở nhanh bài viết gốc
- Tự động lưu bộ nhớ đệm (cache) để xem tin nhanh không cần tải lại

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Hẹn giờ & Thông báo</th>
<th>Trình phát nhạc</th>
</tr>

<tr>

<td>

- Đồng hồ đếm ngược với nút Bắt đầu / Tạm dừng / Đặt lại
- **Nhập liệu thông minh**: `30` → 30s · `130` → 1:30 · `13000` → 1:30:00
- **Thông báo cập nhật bền vững** — popup và biểu tượng sidebar thông báo tính năng mới, không mất khi F5
- Chuông báo khi hết giờ kèm tính năng tải lên file âm thanh tùy chỉnh
- Lưu trạng thái khi tải lại trang (tự tiếp tục đếm)

</td>

<td>

- Phát hiện media đang phát trong **mọi tab trình duyệt** qua Media Session API
- Hiển thị tên bài, nghệ sĩ, ảnh album và nền tảng (YouTube / Spotify / SoundCloud / Apple Music...)
- **Real-Time Audio Reactive (Beta)** — bắt âm thanh tab để sóng nhạc đập chuẩn theo nhịp beat
- Điều khiển Phát / Dừng / Trước / Tiếp theo
- **18+ Phong cách hiển thị** — Vinyl, Pixel, Spotify, Apple Music, Cassette, Pill, Terminal...
- Mini-player kéo thả, thu gọn với hiệu ứng đĩa than vinyl

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Trực quan hóa âm nhạc</th>
<th>Hình nền động</th>
</tr>

<tr>

<td>

- Nhiều kiểu visualizer: **Vinyl**, **Pixel (EQ bars)**, **Bars**
- Chế độ pixel Canvas với hiệu ứng peak-hold
- Tự động đồng bộ với trình phát nhạc và âm thanh tab thời gian thực

</td>

<td>

- Chủ đề / gradient có sẵn & Bộ chọn màu đơn sắc
- Hình ảnh tùy chỉnh qua URL & **Tải ảnh lên** lưu cục bộ
- **Tích hợp Unsplash** với API key riêng
- Hỗ trợ **video nền** (MP4, WebM, MOV)
- **Độ hiển thị & Làm mờ nền** — làm mờ định hướng hoặc làm tối hình nền để tập trung vào widget
- Trình tạo gradient (màu đầu, màu cuối, góc) và lưu vào thư viện cá nhân

</td>

</tr>
</table>

---

### Hiệu ứng hình ảnh (57+ Hoạt ảnh & WebGL Shaders + Bộ tạo sóng SVG)

Chọn từ hơn 57 hiệu ứng canvas và WebGL shaders, cùng với Bộ tạo sóng SVG, với bộ chọn màu riêng cho các hiệu ứng được hỗ trợ:

| Thiên nhiên & Vũ trụ | Kỹ thuật số & Công nghệ | Thời tiết & Mùa | Trừu tượng, Họa tiết & WebGL |
| :--- | :--- | :--- | :--- |
| • Đom đóm / HD | • Network | • Mưa / HD / Bão | • Aura |
| • Mưa sao băng | • Mưa Ma Trận (Matrix) | • Thời tiết Pixel | • Bong bóng |
| • Tia nắng | • Hacker Terminal | • Pixel Snow HQ | • Sóng ký tự / Họa tiết sóng |
| • Đèn hoa đăng | • Khối Pixel | • Tuyết / Tuyết HD | • Họa tiết chéo |
| • Sóng biển | • Pixel chạy | • Gió | • Đường kẻ nổi |
| • Cá đại dương | • Vụ nổ Pixel | • Hoa anh đào | • Lấp lánh / Tia sáng |
| • Mây trôi | • Terminal Retro | • Lá mùa thu | • Cầu vồng |
| • Cây phát triển | • Trò chơi Retro | • Lá xanh | • Vệt chuột tương tác (Cursor) |
| • Sứa biển | • Quét dòng CRT | • Lá rụng | • Quả cầu sương mờ *(Mới)* |
| • Sóng cực quang | • Quét lưới | • Mưa Galaxy | • Chất lỏng tương tác *(Mới)* |
| • Cực quang mềm | • Đèn pin | • Halloween | • Cinematic Bokeh *(Mới)* |
| • Cực quang phương Bắc | • Bước nhảy không gian | • Pháo hoa Tết | • Hố đen vũ trụ *(Mới)* |
| • Cột ánh sáng | • DVD Bounce | • Ngày thống nhất | • Lưới Neon 3D *(Mới)* |
| • Nintendo Pixel | • Thanh nhạc (Bars) | | • Nền Liquid Ether / Silk |

### Bộ tạo sóng SVG

- Tùy chỉnh sóng nền: số đường, biên độ X/Y, độ lệch, góc, độ mượt, chế độ tô màu
- Gradient màu HSL (bắt đầu → kết thúc)
- Lưu sóng tùy chỉnh vào thư viện cá nhân

### Cá nhân hóa nâng cao

- **Tiêu đề nổi tùy chỉnh (Custom Title)** — thêm văn bản của riêng bạn, di chuyển tự do (Free Move) và tùy chỉnh mọi thứ: phông chữ, kích thước, khoảng cách chữ, đổ bóng (X/Y/Blur/Màu) và viền với **khung xem trước trực tiếp**.
- **Nâng cấp Cài đặt & Micro-steppers** — nút vi bước `(- / +)` và cuộn con lăn chuột trên tất cả các thanh trượt.
- **Nút Khôi phục mặc định riêng lẻ** — khôi phục từng mục Kích thước, Giao diện, Thẻ tab, Bố cục, Kiểu chữ và Hiệu ứng.
- **Bắt dính lưới (Snap to Grid)** — định vị widget thẳng thớm với các bước lưới từ 20px đến 100px.
- **Hệ thống đa màu sắc (Multi-color)** — tự động thay đổi màu nhấn giao diện với nhiều chế độ (Gradient, Chuyển màu theo thời gian, hoặc Đồng bộ với hình nền).
- **Menu truy cập nhanh (LCP)** — bật/tắt các thành phần và điều chỉnh bố cục (Độ rộng, Vị trí) trực tiếp.
- **Khóa Widgets** — cố định tất cả các thành phần để tránh vô tình kéo nhầm.
- **Context menu đa phong cách** — Kính tối, Kính sáng, Trong suốt, macOS và Material 3.
- **Giao diện Glassmorphism** — phong cách kính mờ chất lượng cao, đồng nhất trên toàn bộ giao diện.

### Cài đặt & Hệ thống

- **Chọn phông chữ** với hỗ trợ Google Fonts hoặc **phông chữ cài sẵn trên máy tính** (Local Font Access API)
- **Đa ngôn ngữ**: Tiếng Anh, Tiếng Việt, Tiếng Đức, Tiếng Thụy Điển (i18n), hỗ trợ thêm file ngôn ngữ JSON tùy biến
- **Sao lưu Đám mây (Cloud Sync)** — sao lưu và khôi phục cài đặt qua tài khoản Chrome Sync
- **Bố cục Dấu trang** — dạng Lưới mặc định, Thanh bên, và nhiều chế độ Thanh taskbar (**Dưới giữa, Trên giữa, Dưới trái**)
- **Xuất / Nhập** cài đặt dạng file JSON
- **Mục lục & Tìm kiếm Cài đặt** — tìm kiếm và điều hướng tức thì trong bảng cài đặt

---

## Cài đặt

1. Tải hoặc clone repository này.
2. Mở `chrome://extensions/` (trên Chrome/Brave/Edge) hoặc `about:debugging#/runtime/this-firefox` (trên Firefox).
3. Bật **Chế độ nhà phát triển** (Developer mode).
4. Nhấn **Tải tiện ích chưa đóng gói** (Load unpacked) và chọn thư mục dự án.
5. Mở tab mới — tận hưởng Startpage của bạn!

---

## Công nghệ

- **Vanilla JavaScript (ES Modules)** — tốc độ tối đa, không cần bước build, không phụ thuộc framework
- **Chrome Extension Manifest V3** (tương thích cả Firefox Add-ons)
- **Canvas API & WebGL Shaders** cho các hoạt ảnh mượt mà và trực quan hóa âm thanh
- **Chrome Media Session API & Tab Capture** để phát hiện nhạc và bắt nhịp sóng âm thanh thời gian thực
- **LocalStorage & IndexedDB** để lưu trữ dữ liệu nhanh chóng và an toàn tại máy
- **Chrome Storage Sync** để đồng bộ hóa cấu hình giữa các thiết bị
- **Local Font Access API** để tích hợp trực tiếp phông chữ hệ thống
- **Open-Meteo API** cho tính năng thời tiết bảo mật, không cần API key phức tạp

---

<!-- sound credit -->
<!-- https://pixabay.com/sound-effects/household-bedside-clock-alarm-95792/ -->
