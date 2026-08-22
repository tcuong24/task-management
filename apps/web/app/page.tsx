"use client";

import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Link from "next/link";

const primaryHref = "/register";
const primaryLabel = "Tạo tài khoản";

const features = [
  {
    icon: AppstoreOutlined,
    title: "Công việc rõ ràng",
    description:
      "Sắp xếp đầu việc theo Kanban, danh sách, lịch và dòng thời gian trong cùng một dự án.",
  },
  {
    icon: TeamOutlined,
    title: "Cộng tác theo thời gian thực",
    description:
      "Theo dõi thay đổi và cập nhật công việc cùng đội nhóm mà không cần tải lại trang.",
  },
  {
    icon: BellOutlined,
    title: "Không bỏ lỡ cập nhật",
    description:
      "Thông báo tập trung giúp mỗi thành viên biết việc nào cần chú ý và ai đang phụ trách.",
  },
];

const workflow = [
  [
    "01",
    "Tạo không gian làm việc",
    "Thiết lập tổ chức và mời đúng người vào nhóm.",
  ],
  [
    "02",
    "Lập kế hoạch dự án",
    "Chia mục tiêu thành công việc, ưu tiên và thời hạn rõ ràng.",
  ],
  [
    "03",
    "Theo dõi tiến độ",
    "Cập nhật trạng thái và xử lý điểm nghẽn từ một nơi.",
  ],
  [
    "04",
    "Hoàn thành đúng hạn",
    "Nhận thông báo, rà soát kết quả và giữ cả đội đi đúng mục tiêu.",
  ],
];

const trustPoints = [
  ["4 góc nhìn", "Kanban, danh sách, lịch, timeline"],
  ["Phân quyền", "Owner / Admin / Member theo tổ chức"],
  ["Realtime", "cập nhật tức thời không cần tải lại"],
];

export default function RootPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900!">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-gray-50/80 shadow-sm backdrop-blur-sm">
        <nav
          className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
          aria-label="Điều hướng chính"
        >
          <Link
            href="/"
            className="focus-ring font-brand rounded-md text-xl font-bold tracking-tight text-gray-900!"
          >
            TaskFlow
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="focus-ring inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-gray-600! transition-colors duration-150 ease-out hover:bg-gray-100 hover:text-gray-900! motion-reduce:transition-none"
            >
              Đăng nhập
            </Link>
            <Link
              href={primaryHref}
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl !bg-blue-600 px-4 text-sm font-semibold !text-white shadow-md transition-colors duration-150 ease-out hover:!bg-blue-700 motion-reduce:transition-none"
            >
              {primaryLabel}
              <ArrowRightOutlined aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      <section className="px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-16">
          <div className="max-w-4xl text-center">
            <p className="mb-5 inline-flex rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-gray-600!">
              Quản lý công việc cho đội nhóm
            </p>
            <h1 className="font-brand text-4xl font-bold tracking-tight text-gray-900! sm:text-5xl lg:text-6xl">
              Một nơi để tổ chức, giao việc và theo dõi tiến độ cả nhóm
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600!">
              Quản lý dự án theo Kanban, danh sách, lịch hoặc timeline; phân
              công rõ người phụ trách và cập nhật thay đổi theo thời gian thực.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl !bg-blue-600 px-6 font-semibold !text-white shadow-md transition-colors duration-150 ease-out hover:!bg-blue-700 motion-reduce:transition-none"
              >
                {primaryLabel}
                <ArrowRightOutlined aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 font-semibold text-gray-700! transition-colors duration-150 ease-out hover:bg-gray-50 motion-reduce:transition-none"
              >
                Khám phá tính năng
              </a>
            </div>
            <ul className="mt-8 flex flex-col justify-center gap-3 text-sm text-gray-600! sm:flex-row sm:flex-wrap sm:gap-6">
              {[
                "Thiết lập nhanh",
                "Phân quyền theo vai trò",
                "Cập nhật thời gian thực",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircleFilled
                    className="text-blue-600!"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <dl className="mx-auto grid max-w-5xl gap-6 text-center sm:grid-cols-3">
          {trustPoints.map(([value, label]) => (
            <div key={value}>
              <dt className="font-brand text-xl font-bold text-gray-900!">{value}</dt>
              <dd className="mt-1 text-sm text-gray-500!">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        id="features"
        className="scroll-mt-24 bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500!">
              Các chức năng chính
            </p>
            <h2 className="font-brand mt-3 text-3xl font-bold tracking-tight text-gray-900! sm:text-4xl">
              Quản lý công việc từ lúc tạo đến khi hoàn thành
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600!">
              Mỗi công việc có trạng thái, người phụ trách và thời hạn rõ ràng.
              Thành viên theo dõi thay đổi và trao đổi trong cùng hệ thống.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl bg-white p-6 shadow-md md:p-8"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl text-gray-700!">
                  <Icon aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900!">
                  {title}
                </h3>
                <p className="mt-3 leading-7 text-gray-600!">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500!">
              Cách sử dụng
            </p>
            <h2 className="font-brand mt-3 text-3xl font-bold tracking-tight text-gray-900! sm:text-4xl">
              Thiết lập quy trình làm việc trong bốn bước
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600!">
              Tạo tổ chức, lập dự án, phân công công việc và theo dõi kết quả.
            </p>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-2">
            {workflow.map(([number, title, description]) => (
              <li
                key={number}
                className="flex gap-4 rounded-2xl bg-white p-6 shadow-md"
              >
                <span className="font-brand flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 font-bold text-gray-700!">
                  {number}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900!">{title}</h3>
                  <p className="mt-2 leading-7 text-gray-600!">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-6 rounded-2xl bg-gray-50 p-6 shadow-md md:grid-cols-2 md:p-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500!">
              Phù hợp với nhóm nhỏ
            </p>
            <h2 className="font-brand mt-3 text-3xl font-bold tracking-tight text-gray-900!">
              Theo dõi dự án minh bạch mà không cần quy trình phức tạp
            </h2>
          </div>
          <ul className="space-y-4 text-gray-600!">
            {[
              "Nhóm dự án cần biết rõ ai đang phụ trách từng đầu việc.",
              "Quản lý cần theo dõi tiến độ và các công việc sắp đến hạn.",
              "Thành viên cần cập nhật và trao đổi ngay trên công việc liên quan.",
            ].map((useCase) => (
              <li key={useCase} className="flex gap-3">
                <CheckCircleFilled
                  className="mt-1 shrink-0 text-blue-600!"
                  aria-hidden="true"
                />
                <span>{useCase}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center rounded-2xl bg-gray-50 p-6 text-center shadow-md md:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500!">
            Bắt đầu sử dụng
          </p>
          <h2 className="font-brand mt-3 max-w-2xl text-3xl font-bold tracking-tight text-gray-900! sm:text-4xl">
            Tạo không gian làm việc đầu tiên trên TaskFlow
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-gray-600!">
            Đăng ký tài khoản để tạo tổ chức, thêm thành viên và bắt đầu quản lý dự án.
          </p>
          <Link
            href={primaryHref}
            className="focus-ring mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl !bg-blue-600 px-6 font-semibold !text-white shadow-md transition-colors duration-150 ease-out hover:!bg-blue-700 motion-reduce:transition-none"
          >
            {primaryLabel}
            <ArrowRightOutlined aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-gray-500! sm:flex-row sm:items-center sm:justify-between">
          <p className="font-brand font-semibold text-gray-900!">TaskFlow</p>
          <p>Hệ thống quản lý dự án và công việc theo nhóm.</p>
          <nav className="flex gap-4" aria-label="Điều hướng chân trang">
            <Link
              className="focus-ring rounded-md hover:text-gray-900!"
              href="/login"
            >
              Đăng nhập
            </Link>
            <Link
              className="focus-ring rounded-md hover:text-gray-900!"
              href="/register"
            >
              Đăng ký
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  const columns = [
    {
      title: "Cần làm",
      count: 3,
      tasks: [
        ["Hoàn thiện nội dung trang chủ", "Hôm nay"],
        ["Kiểm tra luồng đăng ký", "Ngày mai"],
      ],
    },
    {
      title: "Đang thực hiện",
      count: 2,
      tasks: [
        ["Tối ưu API dự án", "Đang xử lý"],
        ["Chuẩn bị bản phát hành", "Thứ sáu"],
      ],
    },
    {
      title: "Hoàn thành",
      count: 4,
      tasks: [["Thiết lập không gian nhóm", "Đã xong"]],
    },
  ];

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white shadow-xl"
      aria-label="Bản minh họa giao diện bảng công việc TaskFlow"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500!">
            Dự án sản phẩm
          </p>
          <p className="mt-1 font-semibold text-gray-900!">Kế hoạch phát hành</p>
          <p className="mt-1 text-xs text-gray-500!">Dữ liệu minh họa</p>
        </div>
        <div className="flex -space-x-2" aria-label="Ba thành viên minh họa">
          {["AN", "BM", "CT"].map((initials) => (
            <span
              key={initials}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-semibold text-gray-700!"
            >
              {initials}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-4 bg-gray-50 p-4 sm:p-6 md:grid-cols-3">
        {columns.map((column) => (
          <section key={column.title} aria-label={column.title}>
            <div className="mb-3 flex items-center justify-between text-sm">
              <h3 className="font-semibold text-gray-700!">{column.title}</h3>
              <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600!">
                {column.count}
              </span>
            </div>
            <div className="space-y-3">
              {column.tasks.map(([title, meta]) => (
                <article
                  key={title}
                  className="rounded-xl bg-white p-4 shadow-md"
                >
                  <p className="text-sm font-semibold leading-6 text-gray-900!">
                    {title}
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-xs text-gray-500!">
                    {meta === "Đã xong" ? (
                      <CheckCircleFilled
                        className="text-green-600!"
                        aria-hidden="true"
                      />
                    ) : meta === "Đang xử lý" ? (
                      <ClockCircleOutlined aria-hidden="true" />
                    ) : (
                      <CalendarOutlined aria-hidden="true" />
                    )}
                    {meta}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
