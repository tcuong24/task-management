'use client';

import React, { useState, useEffect } from 'react';
import { Card, Avatar, Skeleton } from 'antd';
import {
  ProjectOutlined,
  CheckSquareOutlined,
  UserOutlined,
  TeamOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useParams } from 'next/navigation';
import { getOrganizationActivities, ActivityLogItem } from '../../services/organization';
import { formatActivity } from '../../utils/formatActivity';

dayjs.extend(relativeTime);
dayjs.locale('vi');

interface ActivityFeedProps {
  orgId: string;
  limit?: number;
}

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  TASK: <CheckSquareOutlined className="text-blue-600 text-xs" />,
  PROJECT: <ProjectOutlined className="text-indigo-600 text-xs" />,
  MEMBER: <UserOutlined className="text-emerald-600 text-xs" />,
  ORGANIZATION: <TeamOutlined className="text-amber-600 text-xs" />,
};

const ENTITY_BG: Record<string, string> = {
  TASK: 'bg-blue-50 border-blue-100',
  PROJECT: 'bg-indigo-50 border-indigo-100',
  MEMBER: 'bg-emerald-50 border-emerald-100',
  ORGANIZATION: 'bg-amber-50 border-amber-100',
};

export default function ActivityFeed({ orgId, limit = 20 }: ActivityFeedProps) {
  const params = useParams();
  const orgSlug = (params?.orgSlug || params?.id) as string;

  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    let isMounted = true;
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const res = await getOrganizationActivities(orgId, limit);
        if (isMounted && res.success) {
          setActivities(res.activities || []);
        }
      } catch (err) {
        console.error('Error fetching organization activities:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActivities();
    return () => {
      isMounted = false;
    };
  }, [orgId, limit]);

  return (
    <Card className="rounded-2xl border border-gray-200/80 shadow-md bg-white overflow-hidden">
      <div className="flex items-center justify-between pb-4 mb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <HistoryOutlined className="text-base" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 m-0">
              Hoạt động gần đây
            </h3>
            <p className="text-xs text-gray-500 m-0 font-medium">
              Nhật ký thay đổi trong tổ chức
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          {activities.length} mới nhất
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4 py-2">
          <Skeleton avatar paragraph={{ rows: 1 }} active />
          <Skeleton avatar paragraph={{ rows: 1 }} active />
          <Skeleton avatar paragraph={{ rows: 1 }} active />
        </div>
      ) : activities.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
          <HistoryOutlined className="text-3xl text-gray-300" />
          <span className="text-sm font-semibold text-gray-400">
            Chưa có hoạt động nào gần đây
          </span>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100">
          {activities.map((act) => {
            const actorName = act.actor?.fullName || act.actor?.username || 'Người dùng';
            const actionText = formatActivity(act, orgSlug);
            const timeAgo = dayjs(act.createdAt).fromNow();

            return (
              <div
                key={act.id}
                className="py-3.5 first:pt-1 last:pb-1 flex items-start gap-3 hover:bg-slate-50/50 rounded-xl px-2 -mx-2 transition-colors"
              >
                {/* Avatar with Entity Icon Badge */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <Avatar
                    src={act.actor?.avatarUrl || undefined}
                    icon={!act.actor?.avatarUrl ? <UserOutlined /> : undefined}
                    className="bg-indigo-100 text-indigo-700 font-semibold"
                    size={36}
                  >
                    {actorName.charAt(0).toUpperCase()}
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border ${
                      ENTITY_BG[act.entityType] || 'bg-gray-50 border-gray-200'
                    }`}
                    title={act.entityType}
                  >
                    {ENTITY_ICONS[act.entityType] || <HistoryOutlined className="text-[10px]" />}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-grow overflow-hidden">
                  <div className="text-sm text-gray-700 leading-snug">
                    <span className="font-semibold text-gray-900 mr-1.5">{actorName}</span>
                    <span className="text-gray-600">{actionText}</span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-400 mt-1">
                    {timeAgo}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
