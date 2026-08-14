"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
} from "antd";
import {
  LockOutlined,
  LogoutOutlined,
  MailOutlined,
  PlusOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { usePlatformSettings } from "../../contexts/PlatformSettingsContext";
import {
  createOrganization,
  getUserOrganizations,
  type UserOrgInfo,
} from "../../services/organization";

type RestrictedType = "account" | "organization" | "membership";

interface CreateOrganizationForm {
  name: string;
  slug: string;
}

const SELECTED_ORG_KEY = "taskflow_selected_org_id";

const CONTENT: Record<
  RestrictedType,
  { title: string; description: string }
> = {
  account: {
    title: "Tài khoản đã bị khóa",
    description:
      "Tài khoản của bạn hiện không thể truy cập hệ thống. Vui lòng liên hệ bộ phận hỗ trợ để biết thêm thông tin.",
  },
  organization: {
    title: "Tổ chức đã bị khóa",
    description:
      "Tổ chức này hiện không thể truy cập. Bạn có thể chuyển sang một tổ chức khác hoặc liên hệ bộ phận hỗ trợ.",
  },
  membership: {
    title: "Quyền truy cập đã bị khóa",
    description:
      "Quyền truy cập của bạn vào tổ chức này đã bị tạm khóa. Bạn vẫn có thể làm việc trong một tổ chức khác.",
  },
};

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function AccessRestrictedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = AntdApp.useApp();
  const { user, logout } = useAuth();
  const { settings } = usePlatformSettings();
  const [form] = Form.useForm<CreateOrganizationForm>();

  const [organizations, setOrganizations] = useState<UserOrgInfo[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [selectedOrgSlug, setSelectedOrgSlug] = useState<string>();
  const [switchingOrganization, setSwitchingOrganization] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const rawType = searchParams.get("type");
  const type: RestrictedType =
    rawType === "account" ||
    rawType === "organization" ||
    rawType === "membership"
      ? rawType
      : "membership";

  const currentOrgSlug = searchParams.get("org");
  const content = CONTENT[type];

  const accessibleOrganizations = useMemo(
    () =>
      organizations.filter(
        (organization) =>
          organization.slug !== currentOrgSlug &&
          organization.organizationStatus === "ACTIVE" &&
          organization.membershipStatus === "ACTIVE",
      ),
    [organizations, currentOrgSlug],
  );

  useEffect(() => {
    if (type === "account") return;

    let cancelled = false;

    const loadOrganizations = async () => {
      try {
        setLoadingOrganizations(true);
        const response = await getUserOrganizations();
        if (!cancelled) {
          setOrganizations(response.organizations ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load accessible organizations:", error);
          message.error("Không thể tải danh sách tổ chức.");
        }
      } finally {
        if (!cancelled) setLoadingOrganizations(false);
      }
    };

    void loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [message, type]);

  useEffect(() => {
    if (
      selectedOrgSlug &&
      accessibleOrganizations.some(
        (organization) => organization.slug === selectedOrgSlug,
      )
    ) {
      return;
    }

    setSelectedOrgSlug(accessibleOrganizations[0]?.slug);
  }, [accessibleOrganizations, selectedOrgSlug]);

  const handleSwitchOrganization = () => {
    const organization = accessibleOrganizations.find(
      (item) => item.slug === selectedOrgSlug,
    );

    if (!organization) return;

    setSwitchingOrganization(true);
    localStorage.setItem(SELECTED_ORG_KEY, organization.id);
    router.replace(`/dashboard/${organization.slug}`);
  };

  const handleCreateOrganization = async (
    values: CreateOrganizationForm,
  ) => {
    try {
      setCreatingOrganization(true);
      const response = await createOrganization(
        values.name.trim(),
        values.slug.trim(),
        user?.id,
      );

      localStorage.setItem(SELECTED_ORG_KEY, response.organization.id);
      message.success("Tạo tổ chức thành công.");
      setCreateModalOpen(false);
      form.resetFields();
      router.replace(`/dashboard/${response.organization.slug}`);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Không thể tạo tổ chức.",
      );
    } finally {
      setCreatingOrganization(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const canCreateOrganization =
    type === "membership" && settings.organization_creation_enabled;

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4 md:p-8">
      <section
        aria-labelledby="restricted-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-xl md:p-8"
      >
        <div
          aria-hidden="true"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-600"
        >
          <LockOutlined className="text-2xl" />
        </div>

        <h1
          id="restricted-title"
          className="mt-6 text-2xl font-bold text-gray-900"
        >
          {content.title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {content.description}
        </p>

        {currentOrgSlug && type !== "account" ? (
          <p className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Tổ chức: {" "}
            <span className="font-semibold text-gray-900">
              {currentOrgSlug}
            </span>
          </p>
        ) : null}

        {type !== "account" ? (
          <div className="mt-6 border-t border-gray-100 pt-6 text-left">
            <p className="mb-3 text-sm font-semibold text-gray-900">
              Chuyển sang tổ chức khác
            </p>

            {loadingOrganizations ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : accessibleOrganizations.length > 0 ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Select
                  aria-label="Chọn tổ chức khác"
                  className="min-h-11 flex-1"
                  size="large"
                  value={selectedOrgSlug}
                  onChange={setSelectedOrgSlug}
                  options={accessibleOrganizations.map((organization) => ({
                    label: organization.name,
                    value: organization.slug,
                  }))}
                />

                <Button
                  type="primary"
                  size="large"
                  icon={<SwapOutlined />}
                  loading={switchingOrganization}
                  disabled={!selectedOrgSlug}
                  onClick={handleSwitchOrganization}
                  className="min-h-11 rounded-xl bg-blue-600 font-semibold shadow-md transition-colors duration-150 ease-out hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none"
                >
                  Chuyển
                </Button>
              </div>
            ) : (
              <p className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Bạn chưa có tổ chức nào khác đang hoạt động.
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          {canCreateOrganization ? (
            <Button
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
              className="min-h-11 rounded-xl border-gray-200 font-semibold text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Tạo tổ chức mới
            </Button>
          ) : null}

          {settings.support_email ? (
            <Button
              type={type === "account" ? "primary" : "default"}
              size="large"
              icon={<MailOutlined />}
              href={`mailto:${settings.support_email}`}
              className="min-h-11 rounded-xl font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Liên hệ hỗ trợ
            </Button>
          ) : null}

          <Button
            type="text"
            size="large"
            icon={<LogoutOutlined />}
            loading={loggingOut}
            onClick={handleLogout}
            className="min-h-11 rounded-xl font-semibold text-gray-500 transition-colors duration-150 ease-out hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            Đăng xuất
          </Button>
        </div>
      </section>

      <Modal
        title="Tạo tổ chức mới"
        open={createModalOpen}
        onCancel={() => {
          if (creatingOrganization) return;
          setCreateModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        centered
        destroyOnHidden
      >
        <Form<CreateOrganizationForm>
          form={form}
          layout="vertical"
          onFinish={handleCreateOrganization}
          className="mt-6"
        >
          <Form.Item
            name="name"
            label="Tên tổ chức"
            rules={[
              { required: true, message: "Vui lòng nhập tên tổ chức." },
              { max: 100, message: "Tên tổ chức không quá 100 ký tự." },
            ]}
          >
            <Input
              size="large"
              autoFocus
              placeholder="Ví dụ: Acme Corporation"
              onChange={(event) => {
                form.setFieldValue("slug", toSlug(event.target.value));
              }}
            />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Đường dẫn tổ chức"
            extra="Chỉ sử dụng chữ thường, số và dấu gạch ngang."
            rules={[
              { required: true, message: "Vui lòng nhập đường dẫn." },
              {
                pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                message: "Đường dẫn không đúng định dạng.",
              },
            ]}
          >
            <Input size="large" placeholder="acme-corporation" />
          </Form.Item>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              size="large"
              disabled={creatingOrganization}
              onClick={() => {
                setCreateModalOpen(false);
                form.resetFields();
              }}
              className="min-h-11 rounded-xl border-gray-200 font-semibold"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              icon={<PlusOutlined />}
              loading={creatingOrganization}
              className="min-h-11 rounded-xl bg-blue-600 font-semibold shadow-md hover:bg-blue-700 active:scale-[0.98] motion-reduce:transform-none"
            >
              Tạo tổ chức
            </Button>
          </div>
        </Form>
      </Modal>
    </main>
  );
}

export default function AccessRestrictedPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl md:p-8">
            <Skeleton active paragraph={{ rows: 4 }} />
          </div>
        </main>
      }
    >
      <AccessRestrictedContent />
    </Suspense>
  );
}
