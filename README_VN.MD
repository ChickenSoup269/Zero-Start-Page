# <img src="./icon/logo.png" width="50px" /> Startpage - Trang chủ trình duyệt cá nhân hóa của bạn

Startpage là một tiện ích mở rộng Chrome thay thế trang tab mới bằng một giao diện gọn gàng, đầy đủ tính năng và đẹp mắt. Toàn bộ dữ liệu được lưu cục bộ — không tài khoản, không theo dõi.

---

<table width="100%">
  <tr>
    <td align="left">
      <a href="https://github.com/ChickenSoup269/Zero-Start-Page/blob/main/README.md">English</a> | Tiếng Việt
    </td>
    <td align="right">
      <a href="">CHANGELOG.md</a>
    </td>
       <td align="right">
      <a href="">Link Extension</a>
    </td>
  </tr>
</table>

## Tính năng

### Đồng hồ & Ngày tháng

- Đồng hồ thời gian thực cập nhật theo giây
- Nhiều định dạng ngày: Đầy đủ, Ngắn (DD/MM/YYYY), Mỹ (MM/DD/YYYY), ISO (YYYY-MM-DD)
- Tùy chỉnh kích thước và màu sắc đồng hồ
- Bật/tắt riêng biệt cho đồng hồ, ngày tháng, và lịch Dương
- Hiển thị **lịch Âm** (tùy chọn)

### Tìm kiếm thông minh

- Tìm kiếm Google với gợi ý theo thời gian thực (tối đa 6 gợi ý kèm favicon)
- Hỗ trợ **Google Images** và **Google Lens**
- Tìm kiếm bằng hình ảnh: tải file lên, dán từ clipboard, hoặc nhập URL ảnh
- Chọn công cụ tìm kiếm với lưu tùy chọn
- Gợi ý tìm kiếm với độ trễ 250 ms

### Quản lý dấu trang

- Thêm, sửa, xóa và sắp xếp lại dấu trang
- **Nhóm dấu trang** — tạo nhiều tab, đổi tên, sắp xếp lại và xóa nhóm
- Tự động lấy favicon qua Google Favicon API với fallback
- Nhập dấu trang trực tiếp từ bookmark của Chrome
- Menu chuột phải để thao tác nhanh

### Lịch đầy đủ

- Lịch xem theo tháng với điều hướng tháng trước/sau
- **Thêm, sửa, xóa sự kiện** với tiêu đề, giờ và mô tả
- Hỗ trợ nhiều sự kiện mỗi ngày (hiển thị "+X sự kiện")
- Hiển thị ngày **Âm lịch** và phát hiện **ngày lễ Việt Nam**
- Menu chuột phải trên ngày và sự kiện

### Danh sách công việc

- Thêm, hoàn thành và xóa công việc
- Chỉnh sửa trực tiếp qua menu chuột phải
- Tự động lưu vào localStorage

### Notepad

- Tạo nhiều ghi chú với màu sắc tùy chỉnh (8 màu có sẵn)
- **Trình soạn thảo văn bản phong phú**: in đậm, in nghiêng, gạch chân, gạch ngang, danh sách gạch đầu dòng & đánh số, chèn ảnh
- **Cửa sổ nổi** — tách ghi chú thành cửa sổ kéo thả, thay đổi kích thước và gắn lại
- Nền nội dung sáng/tối
- Lưu toàn bộ nội dung, màu sắc và trạng thái cửa sổ

### Đồng hồ đếm ngược

- Đồng hồ đếm ngược với nút Bắt đầu / Tạm dừng / Đặt lại
- **Nhập liệu thông minh**: nhập `30` → 30 giây · `130` → 1:30 · `13000` → 1:30:00
- Chuông báo khi hết giờ với nút tắt chuông
- Lưu trạng thái khi tải lại trang (tự tiếp tục đếm)

### Trình phát nhạc

- Phát hiện media đang phát trong **bất kỳ tab Chrome nào** qua Media Session API
- Hiển thị tên bài, nghệ sĩ, ảnh album và nền tảng (YouTube / Spotify / SoundCloud)
- Điều khiển Phát / Dừng / Trước / Tiếp theo
- Mini-player có thể kéo thả, thu gọn với hiệu ứng đĩa vinyl xoay

### Trực quan hóa âm nhạc

- Nhiều kiểu visualizer: **Vinyl**, **Pixel (thanh EQ)**, **Bars**
- Chế độ pixel dựa trên Canvas với hiệu ứng đỉnh (peak-hold)
- Tự động đồng bộ với trạng thái trình phát nhạc

### Hình nền động

- Các chủ đề / gradient có sẵn
- Bộ chọn màu đơn sắc
- Hình ảnh tùy chỉnh qua URL
- **Tải ảnh lên** lưu cục bộ (không cloud)
- **Tích hợp Unsplash** — duyệt 10+ chủ đề với API key của bạn
- Hỗ trợ **video nền** (MP4, WebM, MOV)
- Xây dựng gradient với màu bắt đầu, màu kết thúc và góc xoay
- Lưu gradient tùy chỉnh vào thư viện cá nhân
- Điều chỉnh vị trí (X/Y) và kích thước hình nền

### Hiệu ứng hình ảnh (18 hoạt ảnh)

Chọn từ 18 hiệu ứng canvas với bộ chọn màu riêng:

| Hiệu ứng                                    | Hiệu ứng                              | Hiệu ứng                        |
| ------------------------------------------- | ------------------------------------- | ------------------------------- |
| 1. Rain (Mưa)                               | 8. Sakura (Hoa anh đào)               | 15. Fireflies HD (Đom đóm HD)   |
| 2. Fireflies (Đom đóm)                      | 9. Snowfall (Tuyết rơi)               | 16. Ocean Wave (Sóng đại dương) |
| 3. Network (Mạng lưới)                      | 10. Aurora Wave (Sóng cực quang)      | 17. Cloud Drift (Mây trôi)      |
| 4. Matrix Rain (Mưa ma trận)                | 11. Bubbles (Bong bóng)               | 18. Autumn Leaves (Lá mùa thu)  |
| 5. Gradients Aura (Hào quang chuyển màu)    | 12. Rain on Glass (Mưa trên kính)     |                                 |
| 6. Anime Wind (Gió anime)                   | 13. Rainbow Background (Nền cầu vồng) |                                 |
| 7. Hacker (Mã hacker)                       | 14. Wavy Lines (Đường sóng)           |                                 |
| **SVG Wave Generator (Trình tạo sóng SVG)** |                                       |                                 |

### Bộ tạo sóng SVG

- Tùy chỉnh sóng nền: số đường, biên độ X/Y, độ lệch, góc, độ mượt, chế độ tô màu
- Gradient màu HSL (bắt đầu → kết thúc)
- Lưu sóng tùy chỉnh vào thư viện cá nhân

### Cài đặt & Cá nhân hóa

- **Chọn phông chữ** với hỗ trợ tải font tùy chỉnh
- **Màu nhấn** áp dụng trên toàn bộ giao diện
- **Tiêu đề trang** tùy chỉnh
- **Ngôn ngữ**: Tiếng Anh và Tiếng Việt (i18n)
- **Bật/tắt từng thành phần**: Đồng hồ, Tìm kiếm, Dấu trang, Nhóm dấu trang, Công việc, Hẹn giờ, Notepad, Lịch, Âm lịch, Trình phát nhạc, Truy cập nhanh
- **Chế độ Ghost** cho các điều khiển bên
- **Xuất / Nhập** cài đặt dạng file JSON
- Đặt lại tất cả cài đặt về mặc định
- Lưu vị trí các thành phần có thể kéo thả

---

## Cài đặt

1. Tải hoặc clone repository này.
2. Mở `chrome://extensions/` trong Chrome.
3. Bật **Chế độ nhà phát triển** (góc trên bên phải).
4. Nhấn **Tải tiện ích chưa đóng gói** và chọn thư mục dự án.
5. Mở tab mới — tận hưởng Startpage của bạn!

---

## Công nghệ

- **Vanilla JavaScript** — không framework, không bước build
- Chrome Extension **Manifest V3**
- Canvas API cho hoạt ảnh và visualizer
- LocalStorage cho toàn bộ dữ liệu
- Chrome Bookmarks API để nhập bookmark
- Chrome Media Session API để phát hiện nhạc đang phát
