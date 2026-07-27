'use client';

import React, { useState } from 'react';
import { Badge, Popover } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markAsRead } = useNotifications(user?.id);
  const [visible, setVisible] = useState(false);

  return (
    <Popover
      content={
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          onMarkAsRead={markAsRead}
          onClose={() => setVisible(false)}
        />
      }
      trigger="click"
      open={visible}
      onOpenChange={setVisible}
      placement="bottomRight"
      overlayClassName="p-0 border-0"
      styles={{ container: { padding: 0 } }}
    >
      <div className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer mr-2">
        <Badge count={unreadCount} size="small" offset={[2, -2]} className="text-xs">
          <BellOutlined className="text-gray-500 hover:text-indigo-600 transition-colors text-lg block" />
        </Badge>
      </div>
    </Popover>
  );
}
