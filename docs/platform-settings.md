# TaskFlow Platform Settings

## Phạm vi đã triển khai

Nhóm **Chung** có các key:

| Key | Mặc định | Tác dụng hiện tại |
|---|---|---|
| `platform_name` | `TaskFlow` | Tên hiển thị ở login, sidebar chính và Admin |
| `support_email` | rỗng | Hiện liên kết email hỗ trợ trong menu tài khoản |
| `default_language` | `vi` | Lưu ngôn ngữ mặc định; hiện hệ thống chỉ hỗ trợ tiếng Việt |
| `default_timezone` | `Asia/Bangkok` | Lưu múi giờ mặc định; hiện hệ thống chỉ hỗ trợ GMT+7 |
| `date_format` | `DD/MM/YYYY` | Lưu định dạng ngày mặc định |
| `registration_enabled` | `true` | Backend từ chối đăng ký mới khi tắt |
| `organization_creation_enabled` | `true` | Backend từ chối tạo tổ chức và frontend ẩn nút tạo khi tắt |
| `default_project_view` | `summary` | Chọn tab mặc định khi mở dự án |
| `announcement_enabled` | `false` | Bật/tắt banner trên dashboard |
| `announcement_message` | rỗng | Nội dung banner toàn hệ thống |

Các key vận hành cũ vẫn được giữ:

- `invitation_expiry_days`
- `max_upload_size_mb`
- `allowed_file_types`
- `maintenance_mode`

## Lưu trữ

Setting được lưu trong bảng `platform_settings`, mỗi key là một record và `value` là JSON. Khi Admin cập nhật, API dùng `upsert`:

- Chưa có key: tạo record.
- Đã có key: cập nhật value và `updatedBy`.
- Mọi thay đổi được ghi vào `platform_audit_logs` với giá trị trước/sau.

Nếu DB chưa có record, hệ thống dùng giá trị trong `PLATFORM_SETTING_DEFAULTS`.

## Luồng dữ liệu

```text
Admin Settings form
  -> PATCH /admin/settings
  -> validateSetting()
  -> platform_settings
  -> platform_audit_logs
  -> reloadSettings()
  -> GET /platform/settings
  -> PlatformSettingsContext
  -> UI và module nghiệp vụ
```

## API

### Admin

- `GET /admin/settings`: lấy tất cả setting và quyền chỉnh sửa.
- `PATCH /admin/settings`: cập nhật từng `{ key, value }`.

Hai endpoint này yêu cầu Platform Admin.

### Public

- `GET /platform/settings`: chỉ trả các setting an toàn cần cho giao diện và đăng ký.

Endpoint public không trả secret. `DATABASE_URL`, `JWT_SECRET`, mật khẩu SMTP và access key vẫn phải nằm trong environment variables.

## Các file chính

### Backend

- `apps/api/src/common/services/platformSetting.service.ts`: defaults, type và hàm đọc setting.
- `apps/api/src/modules/admin/admin.service.ts`: validation, lưu DB và audit.
- `apps/api/src/modules/platform/platform.controller.ts`: response setting an toàn.
- `apps/api/src/modules/platform/platform.routes.ts`: public route.
- `apps/api/src/modules/auth/auth.service.ts`: áp dụng `registration_enabled`.
- `apps/api/src/modules/organization/org.service.ts`: áp dụng `organization_creation_enabled`.

### Frontend

- `apps/web/services/platform.ts`: type, defaults và public API client.
- `apps/web/contexts/PlatformSettingsContext.tsx`: tải và chia sẻ setting toàn ứng dụng.
- `apps/web/app/admin/settings/page.tsx`: form cấu hình.
- `apps/web/components/dashboard/DashboardShell.tsx`: announcement và support email.
- `apps/web/components/project/ProjectDashboard.tsx`: tab dự án mặc định.
- `apps/web/components/profile/OrganizationsTab.tsx`: ẩn thao tác tạo tổ chức khi bị tắt.
- `apps/web/contexts/OrgContext.tsx`: chặn thao tác tạo tổ chức từ context.
- `apps/web/components/sidebar/Sidebar.tsx`, `apps/web/components/admin/AdminShell.tsx`, `apps/web/app/login/page.tsx`: tên nền tảng động.

## Kiểm thử thủ công

1. Mở `/admin/settings` và thay đổi tên nền tảng.
2. Lưu, kiểm tra login/sidebar/Admin hiển thị tên mới.
3. Bật announcement, nhập nội dung và kiểm tra banner dashboard.
4. Đặt `default_project_view = board`, mở mới trang dự án và kiểm tra tab Kanban.
5. Tắt tạo tổ chức, kiểm tra nút tạo bị ẩn và `POST /organizations` trả `ORGANIZATION_CREATION_DISABLED`.
6. Tắt đăng ký, kiểm tra `POST /auth/register` trả `REGISTRATION_DISABLED`.
7. Kiểm tra `/admin/audit-logs` có action `UPDATE_SETTING`.

## Ghi chú giới hạn

- Frontend hiện chưa có trang `/register`; `registration_enabled` đã được bảo vệ ở API.
- `default_language` hiện chỉ nhận `vi` và `default_timezone` chỉ nhận `Asia/Bangkok` vì ứng dụng chưa có i18n/múi giờ đa vùng.
- `date_format` đã được lưu và public qua context, nhưng các màn hình cũ vẫn còn nhiều chỗ format ngày trực tiếp bằng `dayjs`; cần migrate dần sang formatter dùng chung để áp dụng tuyệt đối toàn hệ thống.
- Các setting vận hành cũ về invitation, upload và maintenance vẫn cần được nối riêng vào từng middleware/service nếu muốn chúng thay đổi hành vi runtime.
