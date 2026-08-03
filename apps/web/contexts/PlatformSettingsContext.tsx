"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_PUBLIC_PLATFORM_SETTINGS,
  getPublicPlatformSettings,
  type PublicPlatformSettings,
} from "../services/platform";

interface PlatformSettingsContextValue {
  settings: PublicPlatformSettings;
  loading: boolean;
  reloadSettings: () => Promise<void>;
}

const PlatformSettingsContext =
  createContext<PlatformSettingsContextValue | null>(null);

export function PlatformSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] =
    useState<PublicPlatformSettings>(
      DEFAULT_PUBLIC_PLATFORM_SETTINGS,
    );

  const [loading, setLoading] = useState(true);

  const reloadSettings = useCallback(async () => {
    try {
      const response =
        await getPublicPlatformSettings();

      if (response.success && response.settings) {
        setSettings(response.settings);
      }
    } catch (error) {
      console.error(
        "Failed to load platform settings:",
        error,
      );

      // Giữ lại default để ứng dụng tiếp tục chạy.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadSettings();
  }, [reloadSettings]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      reloadSettings,
    }),
    [settings, loading, reloadSettings],
  );

  return (
    <PlatformSettingsContext.Provider value={value}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings() {
  const context = useContext(PlatformSettingsContext);

  if (!context) {
    throw new Error(
      "usePlatformSettings must be used inside PlatformSettingsProvider",
    );
  }

  return context;
}
