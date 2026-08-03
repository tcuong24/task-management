'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { getUserOrganizations, UserOrgInfo, createOrganization } from '../services/organization';
import { OrgRole } from '@repo/permissions';
import { useAuth } from '../hooks/useAuth';
import { usePlatformSettings } from './PlatformSettingsContext';

interface OrgContextType {
  organizations: UserOrgInfo[];
  currentOrg: UserOrgInfo | null;
  userRole: OrgRole | null;
  loading: boolean;
  selectOrg: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
  createNewOrg: (name: string, slug: string) => Promise<UserOrgInfo>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

const SELECTED_ORG_KEY = 'taskflow_selected_org_id';
export function OrgProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<UserOrgInfo[]>([]);
  const [currentOrg, setCurrentOrg] = useState<UserOrgInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { user } = useAuth();
  const { settings } = usePlatformSettings();

  const urlParam = (params?.orgSlug || params?.id) as string | undefined;

  const fetchOrgs = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await getUserOrganizations();
      if (res.success && res.organizations) {
        const orgs = res.organizations;
        setOrganizations(orgs);

        // Determine which org should be active:
        // 1. URL parameter (slug or id) if valid
        // 2. Saved orgId in localStorage if valid
        // 3. First org in list
        let active: UserOrgInfo | null = null;

        if (urlParam) {
          active = orgs.find((o) => o.slug === urlParam || o.id === urlParam) ?? null;
        }

        if (!active) {
          const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem(SELECTED_ORG_KEY) : null;
          if (savedOrgId) {
            active = orgs.find((o) => o.id === savedOrgId || o.slug === savedOrgId) ?? null;
          }
        }

        if (!active && orgs.length > 0) {
          active = orgs[0] ?? null;
        }

        setCurrentOrg(active);
        if (active && typeof window !== 'undefined') {
          localStorage.setItem(SELECTED_ORG_KEY, active.id);
          // Auto-normalize URL if accessed via raw UUID id
          if (urlParam && urlParam === active.id && active.slug) {
            const newPath = pathname.replace(`/dashboard/${active.id}`, `/dashboard/${active.slug}`);
            router.replace(newPath);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [user, urlParam, pathname, router]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const selectOrg = useCallback((orgIdOrSlug: string) => {
    const found = organizations.find((o) => o.id === orgIdOrSlug || o.slug === orgIdOrSlug);
    if (found) {
      setCurrentOrg(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SELECTED_ORG_KEY, found.id);
      }
      
      // Navigate using slug
      router.push(`/dashboard/${found.slug}`);
    }
  }, [organizations, router]);

  const refreshOrganizations = useCallback(async () => {
    await fetchOrgs();
  }, [fetchOrgs]);

  const createNewOrg = useCallback(async (name: string, slug: string): Promise<UserOrgInfo> => {
    if (!settings.organization_creation_enabled) {
      throw new Error(
        "Hệ thống đang tạm dừng tạo tổ chức.",
      );
    }
    if (!user) throw new Error('Chưa đăng nhập');
    const res = await createOrganization(name, slug, user.id);
    await fetchOrgs();
    
    const newOrgInfo: UserOrgInfo = {
      id: res.organization.id,
      name: res.organization.name,
      slug: res.organization.slug,
      avatarUrl: res.organization.avatarUrl,
      userRole: 'OWNER',
      membersCount: 1,
      ownerName: user.fullName || user.username,
    };

    selectOrg(newOrgInfo.id);
    return newOrgInfo;
  }, [
    user,
    fetchOrgs,
    selectOrg,
    settings.organization_creation_enabled,
  ]);

  const userRole = currentOrg?.userRole || null;

  return (
    <OrgContext.Provider
      value={{
        organizations,
        currentOrg,
        userRole,
        loading,
        selectOrg,
        refreshOrganizations,
        createNewOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}
