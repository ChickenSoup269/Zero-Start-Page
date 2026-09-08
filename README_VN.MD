<img src="https://github.com/ChickenSoup269/imagesForRepo/blob/main/zero_extension/zero%20colab.png?raw=true" width="1200px" alt="Startpage Preview" />

# Startpage - Trang chủ trình duyệt cá nhân hóa của bạn

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
- **Bộ phát âm thanh thư giãn (Ambient Sounds)**: 12 âm thanh môi trường độ nét cao (Mưa, Sóng biển, Cà phê, Tiếng ồn trắng, Lửa trại, Rừng cây...) kèm bàn trộn âm lượng đa kênh, các preset mẫu, visualizer equalizer và hẹn giờ tắt.
- **Widget Theo dõi Thói quen (Habit Tracker)**: Theo dõi tiến độ thói quen hàng ngày, đếm chuỗi ngày liên tiếp (streaks) với 3 chế độ màu (Màu riêng từng thói quen, Gradient Đỏ-Xanh, M3 Accent).
- **Widget Đọc tin tức RSS (RSS Reader)**: Tích hợp trình đọc RSS feed tùy chỉnh, cập nhật tin tức trực tiếp từ các nguồn bạn yêu thích kèm popup đọc gọn gàng.
- **Widget Thời tiết Thông minh**: Dự báo thời tiết thời gian thực qua Open-Meteo, hỗ trợ tùy chỉnh Endpoint & Geocoding và nút kiểm tra kết nối API trực tiếp.
- **Widget Danh ngôn Mỗi ngày (Daily Quotes)**: Tuyển tập các câu danh ngôn ý nghĩa với tùy chọn tần suất đổi (mỗi tab mới, theo giờ, hoặc theo ngày).
- **Âm thanh Tương tác Thời gian thực (Real-time Audio Reactive - Beta)**: Bắt luồng âm thanh tab (`tabCapture`) để sóng nhạc visualizer đập chuẩn xác theo điệu bass và nhịp beat bài hát.
- **Đồng hồ 3D Floating Glass Cubes**: Phong cách đồng hồ số 3D khối kính trong suốt với bệ Voxel, Volumetric Extrusion và hiệu ứng nghiêng tương tác theo góc nhìn.
- **Bộ hiệu ứng Shaders WebGL Đỉnh cao**: Mô phỏng Chất lỏng tương tác (Interactive Fluid), Quả cầu sương mờ (Frosted Glass Orbs), Hố đen vũ trụ (Black Hole) và Lưới Neon 3D (Neon Grid 3D).
- **Thanh công cụ Dấu trang Hàng loạt (Multi-Select)**: Chọn nhiều bookmark cùng lúc để xóa hàng loạt, gom nhóm vào thư mục mới hoặc di chuyển nhanh. Nhập bookmark từ trình duyệt hỗ trợ tạo nhóm theo thư mục và chọn dải bằng Shift/Ctrl.
- **Giao diện Trong suốt & Ẩn viền (Transparent Skin & Borderless)**: Hỗ trợ chuyển đổi skin trong suốt và ẩn viền trên toàn bộ các widget thông qua menu chuột phải.
- **Kho ảnh miễn phí LoremFlickr & Thư viện Cục bộ**: Thưởng thức kho hình nền sắc nét tuyển chọn từ LoremFlickr & Lorem Picsum kèm lưu trữ tức thì về máy tính (IndexedDB).
- **Bắt dính lưới khi kéo thả (Snap to Grid)**: Căn chỉnh widget thẳng hàng hoàn hảo với bước lưới tùy chọn từ 20px đến 100px.
- **Cờ quốc gia Vector SVG**: Bộ chọn ngôn ngữ và tùy chọn ngôn ngữ ngày tháng tích hợp cờ vector SVG sắc nét cho Tiếng Việt, Tiếng Anh, Tiếng Đức và Tiếng Thụy Điển.

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
- **14+ Kiểu dáng Đồng hồ**: Đồng hồ lật Fliqlo, Đồng hồ kim Analog, Glass Float, Pixel HUD, Satellite, Tối giản, Dòng lệnh Terminal...
- **Đồng hồ Pixel HUD & Satellite** với khả năng tùy biến bảng màu giao diện mượt mà
- **Đồng hồ Glass Float** được tối ưu hóa hiển thị phần cứng GPU 60 FPS không gây nặng CPU
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
<th>Quản lý Dấu trang (Bookmarks)</th>
<th>Lịch đầy đủ (Calendar)</th>
</tr>

<tr>

<td>

- Thêm, sửa, xóa và sắp xếp thứ tự dấu trang
- **Thanh công cụ chọn hàng loạt** — xóa nhiều bookmark, di chuyển thư mục hoặc gom nhóm chỉ bằng một lần bấm
- **Nhóm dấu trang** — tạo nhiều tab, đổi tên, sắp xếp và xóa nhóm
- **Kiểu dáng độc lập** — tùy biến màu nền, màu chữ và cỡ chữ cho từng nhóm riêng biệt
- **Xem trước trực tiếp trong Cài đặt** — xem nhanh giao diện thẻ bookmark và tab nhóm
- **Nhập Dấu trang Thông minh** — chọn từng thư mục trình duyệt để tự động tạo nhóm riêng, hỗ trợ chọn dải phím Shift/Ctrl
- Tự động lấy favicon trang web với giải pháp dự phòng an toàn
- 4 bố cục linh hoạt: Lưới truyền thống (Grid), Thanh ngăn kéo cạnh bên (Sidebar), Thanh tác vụ Taskbar (Dưới giữa, Trên giữa, Dưới trái) và Thanh Bookmark Bar
- Tự động định vị cửa sổ chỉnh sửa dấu trang trong khung nhìn màn hình

</td>

<td>

- Xem lịch cả tháng với nút chuyển tháng nhanh chóng
- **Thêm, sửa và xóa sự kiện** với tiêu đề, thời gian và mô tả
- Hỗ trợ hiển thị nhiều sự kiện trong một ngày (chỉ báo "+X sự kiện")
- Ngày **Âm lịch Việt Nam** và tự động nhận diện **ngày nghỉ lễ lớn của Việt Nam**
- Ba chế độ xem: Dương lịch, Âm lịch hoặc Lịch kép song song
- Menu chuột phải trên từng ngày và sự kiện

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Thói quen & Công việc</th>
<th>Sổ tay ghi chú (Notepad)</th>
</tr>

<tr>

<td>

- **Theo dõi Thói quen (Habit Tracker)** với ghi nhận hàng ngày, chuỗi ngày liên tiếp (streaks) và 3 bảng màu tùy chọn (Mỗi mục, Gradient, M3 Accent)
- **Danh sách công việc (Todo List)** thêm, hoàn thành và xóa tác vụ
- **Ẩn/Hiện ô tích (Checkbox Toggle)** — chuyển đổi chế độ xem danh sách việc cần làm tối giản
- Chỉnh sửa nội dung nhanh qua menu chuột phải
- Tự động lưu trữ an toàn vào localStorage

</td>

<td>

- Tạo nhiều ghi chú với các màu sắc khác nhau (8 màu mẫu)
- **Trình soạn thảo văn bản phong phú**: in đậm, in nghiêng, gạch chân, gạch ngang, danh sách bullet & số, liên kết và chèn ảnh
- **Cửa sổ nổi độc lập** — tách ghi chú thành cửa sổ kéo thả tự do, thay đổi kích thước và gắn lại bất cứ lúc nào
- Cải tiến vùng kéo thả tiêu đề ghi chú, đổi tên nhanh trực tiếp và tinh chỉnh các nút thao tác
- Thu gọn ghi chú nổi, bật/tắt thanh công cụ soạn thảo
- Tự động căn chỉnh hình ảnh vừa vặn trong ghi chú
- Giữ phím Ctrl/Cmd và click chuột để mở đường link trong ghi chú
- Đổi nền sáng/tối cho ghi chú với màu chữ tương phản rõ nét
- Tự động lưu toàn bộ nội dung, màu sắc và vị trí cửa sổ

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Thời tiết & Danh ngôn</th>
<th>Đọc tin tức RSS</th>
</tr>

<tr>

<td>

- **Dự báo thời tiết thời gian thực** hỗ trợ bởi Open-Meteo
- Tùy chỉnh API endpoint dự báo và tìm kiếm vị trí (geocoding) kèm nút kiểm tra kết nối trực tiếp
- Chuyển đổi đơn vị nhiệt độ (Độ C °C / Độ F °F)
- **Danh ngôn truyền cảm hứng mỗi ngày** từ các tác giả nổi tiếng
- Tùy chọn tần suất làm mới danh ngôn (Mỗi khi mở tab mới, Mỗi giờ, Mỗi ngày)

</td>

<td>

- Trình đọc RSS tích hợp siêu nhẹ
- Thêm, quản lý và theo dõi nhiều kênh RSS cùng lúc
- Giao diện đọc bài viết gọn gàng, hỗ trợ mở nhanh liên kết gốc
- Tự động lưu bộ nhớ đệm (cache) giúp tải nhanh khi xem offline

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Hẹn giờ đồng hồ & Thông báo</th>
<th>Trình phát nhạc & Visualizer</th>
</tr>

<tr>

<td>

- Đồng hồ đếm ngược với các nút Bắt đầu / Tạm dừng / Đặt lại
- **Bộ phân tích nhập thông minh**: gõ `30` → 30 giây · `130` → 1 phút 30 giây · `13000` → 1 giờ 30 phút
- **Thông báo cập nhật liên tục** — luôn nắm bắt các tính năng mới với popup thông báo và huy hiệu thanh bên
- Chuông báo âm thanh khi hết giờ kèm tính năng tải lên chuông riêng
- Tự động duy trì trạng thái đếm ngược khi tải lại trang

</td>

<td>

- Nhận diện bài hát đang phát ở **bất kỳ tab trình duyệt nào** thông qua Media Session API
- Hiển thị tên bài hát, nghệ sĩ, ảnh bìa album và nền tảng (YouTube / Spotify / SoundCloud / Apple Music / v.v.)
- **Âm thanh tương tác thời gian thực (Real-time Audio Reactive - Beta)** — bắt luồng âm thanh tab để sóng nhạc đập chuẩn từng nhịp beat
- Các nút điều khiển Play / Pause / Bài trước / Bài tiếp theo
- Nhiều kiểu visualizer: **Đĩa than Vinyl**, **Hạt Pixel (EQ bars)**, **Thanh sóng nhạc (Bars)**
- Chế độ pixel canvas với hiệu ứng giữ đỉnh (peak-hold)

</td>

</tr>
</table>

<table align="center">
<tr>
<th>Âm thanh thư giãn (Ambient Sounds)</th>
<th>Hình nền động</th>
</tr>

<tr>

<td>

- 12 âm thanh môi trường và thiên nhiên độ nét cao (Mưa rơi, Lửa trại, Sấm sét, Sóng biển, Quán cà phê, Rừng cây, Tiếng ồn trắng, Quạt gió, Thư viện, Lo-Fi...)
- Bàn trộn âm lượng đa luồng với thanh trượt chỉnh âm lượng riêng cho từng âm thanh
- Các preset âm thanh tuyển chọn: Học tập, Thư giãn, Tập trung sâu, Giấc ngủ
- Bộ equalizer hoạt họa trực quan và tính năng hẹn giờ ngủ tự động tắt

</td>

<td>

- Các chủ đề / dải màu gradient có sẵn
- Tùy chọn màu đơn sắc & hình nền từ liên kết URL
- **Tải ảnh lên** lưu trữ trực tiếp trên trình duyệt máy tính (không cần đám mây)
- **Tích hợp LoremFlickr & Lorem Picsum** với bộ lọc chủ đề và tính năng lưu tức thì vào bộ sưu tập (IndexedDB)
- **Tích hợp Unsplash** — khám phá 10+ danh mục ảnh chất lượng cao bằng API key của riêng bạn
- Hỗ trợ **video nền lặp** (MP4, WebM, MOV)
- **Độ mờ & Làm mờ nền** — làm tối hoặc làm mờ nền định hướng giúp các tiện ích dễ đọc hơn
- Bộ tạo dải màu gradient với tùy chỉnh màu bắt đầu, màu kết thúc và góc nghiêng

</td>

</tr>
</table>

---

### Hiệu ứng thị giác (57+ Hoạt ảnh & Shaders WebGL + Bộ tạo sóng SVG)

Lựa chọn từ hơn 57+ hiệu ứng canvas động và shaders WebGL, cùng Bộ tạo sóng nền SVG Wave Generator:

| Thiên nhiên & Vũ trụ   | Kỹ thuật số & Công nghệ     | Thời tiết & Mùa        | Trừu tượng, Hoa văn & WebGL   |
| :--------------------- | :-------------------------- | :--------------------- | :---------------------------- |
| • Đom đóm / Đom đóm HD | • Mạng lưới (Network)       | • Mưa / Mưa HD / Bão   | • Hào quang (Aura)            |
| • Mưa sao băng         | • Mưa Ma Trận (Matrix Rain) | • Thời tiết Pixel      | • Bong bóng                   |
| • Tia nắng mặt trời    | • Hacker Terminal           | • Tuyết rơi Pixel HQ   | • Sóng uốn lượn               |
| • Đèn trời             | • Khối lập phương Pixel     | • Tuyết rơi / Tuyết HD | • Hoa văn chéo                |
| • Sóng biển            | • Chạy Pixel                | • Gió thổi             | • Đường nổi                   |
| • Đàn cá đại dương     | • Nổ hạt Pixel              | • Cánh hoa anh đào     | • Ánh sáng lấp lánh           |
| • Mây trôi             | • Retro Terminal            | • Lá mùa thu           | • Nền cầu vồng                |
| • Mầm cây phát triển   | • Game cổ điển              | • Lá xanh rơi          | • Vệt chuột / Vết loang       |
| • Sứa biển             | • Quét dòng CRT             | • Lá rơi đọng          | • Quả cầu kính mờ _(Mới)_     |
| • Cực quang Aurora     | • Quét lưới (Grid Scan)     | • Thiên hà mưa         | • Chất lỏng tương tác _(Mới)_ |
| • Cực quang êm dịu     | • Đèn pin                   | • Halloween            | • Cinematic Bokeh _(Mới)_     |
| • Bắc cực quang        | • Xuyên không gian          | • Pháo hoa Tết         | • Hố đen vũ trụ _(Mới)_       |
| • Cột ánh sáng         | • Logo nảy DVD              | • Kỷ niệm Giải phóng   | • Lưới Neon 3D _(Mới)_        |
| • Nintendo Pixel       | • Sóng nhạc Bars            |                        | • Dải lụa phát sáng           |

### Bộ tạo sóng nền SVG (SVG Wave Generator)

- Tùy chỉnh đầy đủ hình nền sóng: số lượng đường lượn, biên độ X/Y, độ lệch, góc nghiêng, độ mượt, đổ màu sóng
- Dải chuyển màu HSL (bắt đầu → kết thúc)
- Lưu các mẫu sóng yêu thích vào bộ sưu tập cá nhân

### Tùy biến nâng cao (Advanced Personalization)

- **Giao diện Trong suốt & Ẩn viền (Transparent Skin & Borderless)** — chuyển đổi nền trong suốt và ẩn đường viền trên tất cả widget qua menu chuột phải.
- **Menu chuột phải đa dạng** — 6 phong cách: Kính tối, Kính sáng, Trong suốt hoàn toàn, macOS, Material 3, kèm tùy chọn mở nhanh Tab mới Google mặc định.
- **Tiêu đề chữ nổi tùy chỉnh (Custom Floating Title)** — thêm chữ tùy ý, di chuyển tự do (Free Move), tùy chỉnh phông, kích thước, khoảng cách chữ, đổ bóng 3D và viền với **Xem trước trực tiếp**.
- **Nâng cấp Cài đặt & Nút Vi Bước** — nút vi bước `(- / +)` chuẩn xác và cuộn con lăn chuột trên mọi thanh trượt.
- **Nút Khôi phục Mặc định Riêng biệt** — khôi phục nhanh mặc định theo từng nhóm: Kích thước, Giao diện, Thẻ tab, Bố cục, Kiểu chữ, Hiệu ứng.
- **Bắt dính lưới khi kéo thả (Snap to Grid)** — căn chỉnh các widget ngay ngắn theo bước lưới tùy chỉnh (20px đến 100px).
- **Hệ thống đa màu sắc** — đổi màu chủ đạo giao diện linh hoạt (Gradient, Đổi màu theo chu kỳ hoặc Đồng bộ theo màu nền).
- **Menu điều khiển bố cục nhanh (LCP)** — mở nhanh bảng nhỏ để ẩn/hiện widget và chỉnh bố cục ngay lập tức.
- **Khóa vị trí Widget** — ghim cố định mọi tiện ích trên màn hình để tránh vô tình kéo lệch.
- **Giao diện Kính mờ (Glassmorphism)** — phong cách thiết kế kính mờ cao cấp đồng bộ trên mọi thành phần giao diện.

### Cài đặt & Hệ thống

- **Bộ chọn phông chữ** hỗ trợ phông có sẵn, Google Fonts hoặc **phông chữ cài sẵn trong máy tính** (Local Font Access API)
- **Đa ngôn ngữ**: Tiếng Việt, Tiếng Anh, Tiếng Đức, Tiếng Thụy Điển (i18n) với biểu tượng cờ vector SVG sắc nét
- **Đồng bộ đám mây (Cloud Sync)** — sao lưu và phục hồi cấu hình tiện ích (không bao gồm file media) thông qua tài khoản Chrome Sync
- **Bố cục Dấu trang linh hoạt** — Lưới mặc định, Thanh ngăn kéo bên hông (Sidebar), hoặc Thanh tác vụ Taskbar (**Dưới giữa, Trên giữa, Dưới trái**)
- **Xuất / Nhập cấu hình** tiện ích dưới dạng file JSON tiện lợi
- **Mục lục cài đặt (ToC)** — dễ dàng tìm và chuyển đến các mục cài đặt với công cụ tìm kiếm và thanh điều hướng nhanh
- Nút khôi phục toàn bộ cài đặt về trạng thái ban đầu

---

## Liên kết & Tài nguyên

- **Mã nguồn GitHub**: [https://github.com/ChickenSoup269/Zero-Start-Page](https://github.com/ChickenSoup269/Zero-Start-Page)
- **Xem tất cả phiên bản & Nhật ký thay đổi (Changelogs)**: [https://extension-changelogs.vercel.app/changelog?ext=Zero+Startpage+-+Newtab+Replacement](https://extension-changelogs.vercel.app/changelog?ext=Zero+Startpage+-+Newtab+Replacement)
- **Chrome Web Store**: [Zero Startpage trên Chrome Web Store](https://chromewebstore.google.com/detail/zero-startpage-newtab-rep/ogdbkgoionmjnlinbmmjncnhafhaenck?authuser=0&hl=vi)
- **Firefox Add-ons**: [Zero Startpage trên Firefox AMO](https://addons.mozilla.org/en-US/firefox/addon/zero-startpage-newtab/)

---

## Chính sách Quyền riêng tư & Bảo mật

Sự riêng tư của bạn là ưu tiên cao nhất:

- **Không thu thập hay chia sẻ bất kỳ dữ liệu cá nhân nào.** Không có máy chủ theo dõi, dịch vụ phân tích hay lưu trữ từ xa.
- **Tất cả dữ liệu được lưu trữ cục bộ ngay trong trình duyệt của bạn.** Mọi dấu trang, ghi chú, danh sách công việc, thói quen và cài đặt đều nằm an toàn trên máy tính của bạn qua `IndexedDB` và `localStorage`.
- **Không chứa mã nguồn thực thi từ xa.** Tiện ích tuân thủ đầy đủ các tiêu chuẩn bảo mật khắt khe của Manifest V3.
- **Minh bạch & Mã nguồn mở 100%.** Bạn hoàn toàn có thể tự kiểm tra toàn bộ mã nguồn trên [GitHub](https://github.com/ChickenSoup269/Zero-Start-Page).

---

## Cài đặt

1. Tải về hoặc nhân bản kho mã nguồn này:
   ```bash
   git clone https://github.com/ChickenSoup269/Zero-Start-Page.git
   ```
2. Mở trình duyệt và vào `chrome://extensions/` (Chrome/Brave/Edge) hoặc `about:debugging#/runtime/this-firefox` (Firefox).
3. Bật **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải.
4. Nhấn nút **Tải tiện ích đã giải nén (Load unpacked)** và chọn thư mục của dự án.
5. Mở một tab mới để bắt đầu trải nghiệm Startpage tuyệt đẹp của bạn!

---

## Ngăn xếp công nghệ (Tech Stack)

- **Vanilla JavaScript (ES Modules)** — siêu tốc, không cần build step phức tạp, không phụ thuộc framework cồng kềnh
- **WebExtensions Manifest V3** (tương thích Chrome, Edge, Brave, Opera, Firefox)
- **Canvas API & Shaders WebGL** xử lý đồ họa mượt mà và trực quan hóa sóng nhạc
- **Chrome Media Session API & Tab Capture** để nhận diện nhạc và tương tác âm thanh thời gian thực
- **Web Audio API** phục vụ bộ phát âm thanh môi trường thư giãn đa kênh
- **LocalStorage & IndexedDB** lưu trữ dữ liệu nhanh chóng và an toàn trên thiết bị
- **Chrome Storage Sync** đồng bộ cài đặt đa thiết bị
- **Local Font Access API** tích hợp phông chữ có sẵn trong máy tính
- **Open-Meteo API** cung cấp dự báo thời tiết chuẩn xác và tôn trọng quyền riêng tư

---

## Giấy phép & Tác quyền

Được phát hành theo giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.
Được xây dựng bởi [ChickenSoup269](https://github.com/ChickenSoup269).
