import type { Metadata } from "next";
import { Inter, Nunito } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App } from "antd";
import { AuthProvider } from "../hooks/useAuth";
import "./globals.css";

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

export const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  weight: ['700', '800', '900'],
  display: 'swap',
  variable: '--font-nunito',
});

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${nunito.variable} antialiased text-gray-800 bg-gray-50 min-h-[100dvh] flex flex-col`} suppressHydrationWarning>
        <AntdRegistry>
          <ConfigProvider
            warning={{ strict: false }}
            theme={{
              token: {
                colorPrimary: "#1677ff",
                borderRadius: 12,
                colorTextBase: "#1f2937",
                colorBgLayout: "#f9fafb",
                fontFamily: "var(--font-inter), 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              },
              components: {
                Card: {
                  colorBgContainer: "#ffffff",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
                },
                Input: {
                  colorBgContainer: "#ffffff",
                  colorBorder: "#d1d5db", // Gray-300 border
                  colorTextPlaceholder: "#9ca3af", // Gray-400 placeholders
                  controlHeightLG: 46, // Large control height for easy clicking
                },
                Button: {
                  controlHeightLG: 46,
                  fontWeight: 600,
                },
                Checkbox: {
                  colorPrimary: "#1677ff",
                },
                Tag: {
                  borderRadiusSM: 9999, // Pill-shaped tags
                }
              }
            }}
          >
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
