# TaskFlow - Hệ thống Quản lý Công việc & Dự án

TaskFlow là một nền tảng quản lý công việc và dự án hiện đại, hỗ trợ cộng tác nhóm theo thời gian thực (Real-time). Dự án được phát triển dưới dạng **Monorepo** sử dụng **Turborepo** để tối ưu hóa hiệu năng xây dựng (build) và phát triển (development).

---

## 🚀 Các Tính Năng Chính

- **Quản lý Tổ chức & Workspace**: Cho phép tạo các không gian làm việc (Organizations), mời thành viên và quản lý vai trò.
- **Bảng Kanban kéo thả (Drag and Drop)**: Trải nghiệm kéo thả mượt mà để quản lý trạng thái công việc.
- **Chế độ xem Đa dạng**: Xem danh sách công việc dưới dạng Kanban Board, Calendar, List View, và Timeline.
- **Đồng bộ thời gian thực (Real-time Sync)**: Cập nhật thay đổi tức thì giữa các thành viên nhờ Socket.io.
- **Thông báo Real-time**: Nhận thông báo tức thì khi có hoạt động mới liên quan đến công việc hoặc dự án.
- **Phân quyền người dùng (RBAC)**: Hệ thống phân quyền chặt chẽ (Owner, Admin, Member, Guest).
- **Tài liệu API (Swagger Docs)**: Tích hợp sẵn tài liệu tương tác trực quan cho Backend API.

---

## 📁 Cấu Trúc Dự Án (Monorepo)

Dự án được quản lý bằng **pnpm Workspaces** và **Turborepo**:

*   **`apps/web`** (Next.js): Giao diện người dùng frontend hiện đại, xây dựng bằng React 19, TailwindCSS, Ant Design và Framer Motion.
*   **`apps/api`** (Express.js): API server backend viết bằng TypeScript, xử lý logic nghiệp vụ, xác thực JWT, kết nối Socket.io và upload file lên Cloudinary.
*   **`packages/database`** (Prisma & PostgreSQL): Quản lý cơ sở dữ liệu PostgreSQL, định nghĩa Schema Prisma và dữ liệu mẫu (seeding).
*   **`packages/permissions`**: Module chia sẻ logic phân quyền dựa trên vai trò (RBAC) giữa Web và API.

---

## 🛠️ Yêu Cầu Hệ Thống

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:
- **Node.js** >= 18
- **pnpm** >= 9 (Trình quản lý gói chính thức của dự án)
- **PostgreSQL** database đang chạy

---

## ⚙️ Hướng Dẫn Cài Đặt & Cấu Hình

### Bước 1: Clone dự án và Cài đặt thư viện
Tại thư mục gốc của dự án, chạy lệnh sau để tải và cài đặt tất cả các package:
```bash
pnpm install
```

### Bước 2: Cấu hình biến môi trường (Environment Variables)

Bạn cần cấu hình cụ thể cho Backend và Database thông qua file `.env`.

#### 1. Cấu hình Cơ sở dữ liệu (`packages/database/.env`):
Tạo file `.env` trong thư mục `packages/database/` và cấu hình URL kết nối PostgreSQL của bạn:
```env
# URL kết nối cơ sở dữ liệu PostgreSQL của bạn
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<db_name>?schema=public"

# Cấu hình tài khoản Admin mặc định khi chạy seed
ADMIN_EMAIL="admin@taskflow.com"
ADMIN_PASSWORD="superSecretAdminPassword123"
ADMIN_NAME="Super Admin"
```

#### 2. Cấu hình Backend API (`apps/api/.env`):
Tạo file `.env` trong thư mục `apps/api/` với các biến sau:
```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# JWT Secret - Khóa bí mật dùng để mã hóa Access Token (Tối thiểu 64 ký tự hex)
# Bạn có thể tạo ngẫu nhiên bằng lệnh: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=42668c3173fc7c343c549642182571e6d672ceea93686d2716cb27a07962f18d660235e8b6a7668a6765f1e04384e3dad2ef6ad5698d0273ec469c25aa4a9b27

# URL kết nối cơ sở dữ liệu (Trùng khớp với database URL ở trên)
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<db_name>?schema=public"

# Cấu hình lưu trữ ảnh Cloudinary
CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET
```

---

### Bước 3: Khởi tạo Cơ sở dữ liệu (Migrations & Seeding)

Sau khi cấu hình xong các file `.env`, hãy chạy các lệnh sau từ **thư mục gốc** của dự án để chuẩn bị cơ sở dữ liệu:

1. **Khởi chạy migration để đồng bộ Schema vào PostgreSQL:**
   ```bash
   pnpm --filter=@repo/database exec prisma migrate dev
   ```
2. **Nạp dữ liệu mẫu (Seeding) bao gồm vai trò, cấu trúc mẫu và tài khoản Super Admin:**
   ```bash
   pnpm --filter=@repo/database exec prisma db seed
   ```

---

## 🏃 Khởi Chạy Dự Án

Để chạy dự án ở chế độ phát triển (Development Mode), chạy lệnh sau tại thư mục gốc:
```bash
pnpm dev
```

Lệnh trên sẽ đồng thời khởi động cả hai ứng dụng:
- **Frontend App (Next.js)**: chạy tại địa chỉ [http://localhost:3000](http://localhost:3000)
- **Backend API (Express)**: chạy tại địa chỉ [http://localhost:3001](http://localhost:3001)

### 📖 Tài liệu API
Tài liệu hướng dẫn sử dụng API (Swagger UI) có sẵn tại địa chỉ:
👉 [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

---

## 🛠️ Các Lệnh Hữu Ích Khác

- **Xây dựng dự án (Build all apps/packages)**:
  ```bash
  pnpm build
  ```
- **Kiểm tra lỗi Lint**:
  ```bash
  pnpm lint
  ```
- **Tự động định dạng code (Format code with Prettier)**:
  ```bash
  pnpm format
  ```
- **Kiểm tra kiểu dữ liệu (Type check)**:
  ```bash
  pnpm check-types
  ```
