import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App } from "antd";
import { AuthProvider } from "../hooks/useAuth";
import { taskflowTheme } from "../theme/taskflowTheme";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/nunito/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskFlow",
  description: "Modern Task Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className="flex min-h-[100dvh] flex-col bg-gray-50 text-gray-800 antialiased"
        suppressHydrationWarning
      >
        <AntdRegistry>
          <ConfigProvider warning={{ strict: false }} theme={taskflowTheme}>
            <AuthProvider>
              <App className="min-h-screen w-full flex flex-col">
                {children}
              </App>
            </AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
