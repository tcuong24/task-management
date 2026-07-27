---
name: taskflow-design-tokens
description: Design token rules, styling specifications, and UI enforcer for TaskFlow. Defines flat colors, elevation shadows, spacing scales, and accessibility guardrails.
---

# TaskFlow — Design Tokens Skill

This skill ensures that all code modifications in the TaskFlow application strictly adhere to the designated Design System tokens. No custom background colors, borders, heights, padding, or text styles should be introduced outside of these guidelines.

---

## 1. Màu nền (Background)
* **Rule**: Toàn bộ app dùng một kiểu nền phẳng (solid background) duy nhất cho giao diện dashboard — không sử dụng màu nền gradient động.

| Token | Giá trị (Tailwind) | Dùng cho |
|---|---|---|
| `bg-app` | `bg-[#f9fafb]` hoặc `bg-gray-50` | Nền toàn bộ trang (mọi route, kể cả Settings, Members, v.v.) |
| `bg-surface` | `bg-white` | Nền Card, Modal, bảng dữ liệu — luôn nổi trên `bg-app` bằng shadow, không dùng viền |
| `bg-surface-muted` | `bg-slate-50/50` hoặc `bg-gray-50/50` | Nền hàng zebra-stripe trong bảng, nền field bị khóa (locked field) |

---

## 2. Menu Điều hướng Sidebar & Branding (Unified Indigo Theme)
* **Rule**: Không chia màu nền hoặc màu active của sidebar theo vai trò người dùng (MEMBER/ADMIN/OWNER). Tất cả đều dùng chung một hệ màu Indigo thanh lịch:

| Thành phần | Token | Giá trị (Tailwind) |
|---|---|---|
| **Nền Sidebar** | `sidebar-bg` | `bg-slate-50/80` hoặc `bg-gray-50/80` (backdrop-blur-sm) |
| **Active Item** | `active-item` | `bg-indigo-50 text-indigo-700 border border-indigo-100/30` |
| **Logo & Brand text** | `brand-color` | `text-indigo-600` (font-brand) |

---

## 3. Màu nút và mức độ hành động (Action Severity)
* **Rule**: Chỉ định rõ mức độ ưu tiên của hành động. Không dùng các màu gradient.

| Mức độ | Token | Style (Tailwind) | Ví dụ hành động |
|---|---|---|---|
| **Primary** | `action-primary` | `bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-all active:scale-[0.98]` | Đăng nhập, Tạo Task, Tạo Project, Mời Thành viên |
| **Secondary** | `action-secondary` | `bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all` | Cancel, Đóng modal, Xem chi tiết |
| **Neutral-caution** | `action-caution` | `bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 transition-all` | Transfer Ownership, Archive Project |
| **Destructive** | `action-destructive` | `bg-red-600 text-white hover:bg-red-700 shadow-md transition-all active:scale-[0.98]` | Delete Organization, Delete Project, Xóa thành viên |
| **Ghost/Text** | `action-ghost` | `text-gray-500 hover:text-gray-700 transition-colors` | Logout (trong header), Resend invite |

---

## 4. Shadow theo lớp (Elevation Shadows)
* **Rule**: Mức độ nguy hiểm của hành động tỷ lệ thuận với elevation của modal hoặc card chứa nó.

| Lớp | Token | Giá trị (Tailwind) | Dùng cho |
|---|---|---|---|
| **Lớp 0** | `elevation-0` | Không shadow, chỉ dùng `border border-gray-100` | Row trong bảng, item trong list |
| **Lớp 1** | `elevation-1` | `shadow-sm` | Header, thanh điều hướng |
| **Lớp 2** | `elevation-2` | `shadow-md` | Card thường (task card, project card) |
| **Lớp 3** | `elevation-3` | `shadow-xl` | Card nổi bật (Login card), Dropdown menu |
| **Lớp 4** | `elevation-4` | `shadow-2xl` | Modal xác nhận hành động nguy hiểm (Delete confirm) |

---

## 5. Bo góc (Border Radius)

| Phân loại | Token | Giá trị (Tailwind) | Dùng cho |
|---|---|---|---|
| **Nhỏ** | `radius-sm` | `rounded-md` | Input, Tag, Badge |
| **Vừa** | `radius-md` | `rounded-xl` | Button, Card nhỏ |
| **Lớn** | `radius-lg` | `rounded-2xl` | Card lớn (Login card, Modal) |

---

## 6. Khoảng cách (Spacing & Paddings)
* **Rule**: Container ngoài cùng luôn dùng `space-loose`.

| Phân loại | Token | Giá trị (Tailwind) | Dùng cho |
|---|---|---|---|
| **Chặt** | `space-tight` | `p-4 gap-3` | Bên trong Card nhỏ (như task card trên board) |
| **Thường** | `space-normal` | `p-6 gap-4` | Bên trong Card thường, Form |
| **Rộng** | `space-loose` | `p-8 gap-6` | Login card, trang Settings, khu vực content chính |

---

## 7. Bảng dữ liệu (Tables)
* Hàng chẵn dùng `bg-surface-muted` (zebra striping). Hàng lẻ dùng `bg-surface`.
* Hiệu ứng hover hàng: `hover:bg-blue-50/70 transition-colors`.
* Header bảng: `bg-gray-50 text-gray-500 text-xs uppercase tracking-wide` (không viết đậm màu đen).
* Chỉ phân tách hàng bằng `border-b border-gray-100`. Không dùng viền kẻ dọc phân chia cột.

---

## 8. Trường dữ liệu bị khóa (Locked Fields)
* **Style**: `bg-gray-50 border border-gray-200 text-gray-400`, hiển thị thêm một icon ổ khóa màu xám bên phải.
* **Quyền yêu cầu**: Nếu có thể yêu cầu truy cập, hiển thị dòng text link nhỏ bên dưới: `text-blue-600 hover:underline` "Yêu cầu quyền truy cập".

---

## 9. Biểu đồ (Charts)
* **Color**: Đường vẽ hoặc cột biểu đồ chính dùng màu `blue-500` (đồng nhất với primary color). Tránh dùng các màu đối lập như hồng hoặc tím.
* **Gridlines**: Luôn hiển thị đường lưới ngang `stroke-gray-100`. Không để trống.
* **Nền**: Nền của biểu đồ phải để trong suốt (`transparent`), không đặt màu nền khác với `bg-surface`.

---

## Pre-Flight Check List (Bắt buộc chạy trước khi hoàn thành bất kỳ tính năng UI nào)

- [ ] Nền trang có sử dụng đúng `bg-app` màu phẳng (solid background) và thống nhất trong mọi màn hình chưa?
- [ ] Có tối đa duy nhất 1 nút `action-primary` phẳng nổi bật trên màn hình chưa?
- [ ] Sự khác biệt giữa Archive (`action-caution`) và Delete (`action-destructive`) có được phân định đúng màu sắc chưa?
- [ ] Modal xác nhận hành động nguy hiểm không thể đảo ngược đã dùng `elevation-4` + `action-destructive` chưa?
- [ ] Bảng dữ liệu đã áp dụng đúng quy tắc Zebra Stripe, hover row, và border chỉ kẻ ngang chưa?
- [ ] Giao diện sidebar có đồng nhất màu Indigo phẳng cho mọi tài khoản mà không phân chia theo role chưa?
