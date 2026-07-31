"use client";

import React from "react";
import { EditOutlined } from "@ant-design/icons";
import type { UserProfileDetail } from "../../services/user";

interface PersonalInfoTabProps {
  user: UserProfileDetail;
  onEditClick: () => void;
}

export function PersonalInfoTab({ user, onEditClick }: PersonalInfoTabProps) {
  const details = [
    ["Họ và tên", user.fullName || "Chưa cập nhật"],
    ["Username", `@${user.username}`],
    ["Email", user.email || "Chưa cập nhật"],
    ["Trạng thái xác thực", user.isVerified ? "Đã xác thực" : "Chưa xác thực"],
  ];

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Thông tin cơ bản</h2>
          <p className="mt-1 text-sm text-gray-500">
            Thông tin nhận diện và liên hệ của tài khoản.
          </p>
        </div>
        <button
          type="button"
          onClick={onEditClick}
          className="inline-flex  w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-md transition-colors duration-150 ease-out hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] sm:w-auto motion-reduce:transform-none motion-reduce:transition-none"
        >
          <EditOutlined aria-hidden="true" /> Sửa thông tin
        </button>
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <dt className="text-xs font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 break-all text-sm font-semibold text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
      {!user.isVerified && (
        <p className="mt-4 text-sm text-gray-500">
          Email chưa được xác thực. Chức năng gửi lại email xác thực chưa khả dụng.
        </p>
      )}
    </section>
  );
}
