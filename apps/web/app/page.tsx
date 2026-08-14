"use client";

import { Skeleton } from "antd";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    router.replace(user.platformRole === "ADMIN" ? "/admin" : "/dashboard");
  }, [loading, router, user]);

  return (
    <main
      className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-md space-y-4">
        <p className="text-center text-sm text-gray-500">
          Đang kiểm tra phiên đăng nhập…
        </p>
        <Skeleton active avatar paragraph={{ rows: 3 }} />
      </div>
    </main>
  );
}
