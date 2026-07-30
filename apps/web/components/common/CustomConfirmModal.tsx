"use client";

import React from "react";
import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Modal } from "antd";
import type { ModalFuncProps, ModalProps } from "antd";

export type ConfirmVariant = "default" | "danger" | "warning";

export interface CustomConfirmModalProps
  extends Omit<ModalProps, "children" | "title" | "classNames"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  variant?: ConfirmVariant;
}

const variantConfig = {
  default: {
    icon: <InfoCircleOutlined className="text-blue-600" />,
    okButtonClass:
      "h-11 rounded-xl border-none bg-blue-600 px-5 font-semibold text-white shadow-md transition-colors duration-150 ease-out hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none",
  },
  danger: {
    icon: <ExclamationCircleOutlined className="text-red-600" />,
    okButtonClass:
      "h-11 rounded-xl border-none bg-red-600 px-5 font-semibold text-white shadow-md transition-colors duration-150 ease-out hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 motion-reduce:transition-none",
  },
  warning: {
    icon: <WarningOutlined className="text-amber-600" />,
    okButtonClass:
      "h-11 rounded-xl border border-amber-300 bg-white px-5 font-semibold text-amber-700 transition-colors duration-150 ease-out hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 motion-reduce:transition-none",
  },
} satisfies Record<
  ConfirmVariant,
  { icon: React.ReactNode; okButtonClass: string }
>;

const cancelButtonClass =
  "h-11 rounded-xl border border-gray-200 bg-white px-5 font-semibold text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none";

function ConfirmContent({
  title,
  description,
  icon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 text-left">
      <span className="mt-0.5 text-xl" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-lg font-bold text-gray-900">{title}</div>
        {description ? (
          <div className="mt-2 text-sm leading-6 text-gray-600">
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CustomConfirmModal({
  title,
  description,
  children,
  variant = "default",
  centered = true,
  width = 480,
  okText = "Xác nhận",
  cancelText = "Hủy",
  okButtonProps,
  cancelButtonProps,
  className,
  ...modalProps
}: CustomConfirmModalProps) {
  const config = variantConfig[variant];

  return (
    <Modal
      {...modalProps}
      title={null}
      centered={centered}
      width={width}
      okText={okText}
      cancelText={cancelText}
      keyboard
      maskClosable={false}
      className={`taskflow-confirm-modal ${className ?? ""}`.trim()}
      classNames={{
        container: "rounded-2xl shadow-2xl",
        body: "p-6",
        footer: "px-6 pb-6",
      }}
      okButtonProps={{
        danger: variant === "danger",
        ...okButtonProps,
        className:
          `${config.okButtonClass} ${okButtonProps?.className ?? ""}`.trim(),
      }}
      cancelButtonProps={{
        ...cancelButtonProps,
        className:
          `${cancelButtonClass} ${cancelButtonProps?.className ?? ""}`.trim(),
      }}
    >
      <ConfirmContent
        title={title}
        description={description ?? children}
        icon={config.icon}
      />
    </Modal>
  );
}

export interface CustomConfirmConfig
  extends Omit<ModalFuncProps, "title" | "content" | "type"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  content?: React.ReactNode;
  variant?: ConfirmVariant;
}

/** Imperative API tương tự Modal.confirm của Ant Design. */
export function customConfirm({
  title,
  description,
  content,
  variant = "default",
  okText = "Xác nhận",
  cancelText = "Hủy",
  okButtonProps,
  cancelButtonProps,
  className,
  ...config
}: CustomConfirmConfig) {
  const variantStyle = variantConfig[variant];

  return Modal.confirm({
    ...config,
    title: null,
    icon: null,
    content: (
      <ConfirmContent
        title={title}
        description={description ?? content}
        icon={variantStyle.icon}
      />
    ),
    centered: config.centered ?? true,
    width: config.width ?? 480,
    okText,
    cancelText,
    keyboard: true,
    maskClosable: false,
    className: `taskflow-confirm-modal ${className ?? ""}`.trim(),
    wrapClassName:
      `taskflow-confirm-modal-wrap ${config.wrapClassName ?? ""}`.trim(),
    okButtonProps: {
      danger: variant === "danger",
      ...okButtonProps,
      className:
        `${variantStyle.okButtonClass} ${okButtonProps?.className ?? ""}`.trim(),
    },
    cancelButtonProps: {
      ...cancelButtonProps,
      className:
        `${cancelButtonClass} ${cancelButtonProps?.className ?? ""}`.trim(),
    },
  });
}
