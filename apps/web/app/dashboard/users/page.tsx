'use client';

import React, { useEffect, useState } from 'react';
import { Table, Avatar, Tag, Input, Skeleton, Alert, Card } from 'antd';
import { UserOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { OrgRole } from '@repo/permissions';
import { useAuth } from '../../../hooks/useAuth';
import * as userService from '../../../services/user';

export default function PlatformUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<userService.PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await userService.getAllUsers();
      if (res.success) {
        setUsers(res.users);
      }
    } catch (err: any) {
      console.error('Error fetching platform users:', err);
      if (err.status === 403) {
        setError('Bạn không có quyền truy cập trang này. Chỉ Platform Admin mới có quyền.');
      } else {
        setError(err.message || 'Lỗi khi tải danh sách người dùng.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleTag = (role: OrgRole) => {
    switch (role) {
      case 'OWNER':
        return 'text-indigo-700 font-bold bg-indigo-50 border-indigo-200';
      case 'ADMIN':
        return 'text-sky-700 font-bold bg-sky-50 border-sky-200';
      case 'MEMBER':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-400 bg-gray-50 border-gray-100';
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter((u) => {
    if (currentUser && u.id === currentUser.id) {
      return false;
    }
    const text = searchText.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(text) ||
      (u.email || '').toLowerCase().includes(text) ||
      u.username.toLowerCase().includes(text)
    );
  });

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_: any, record: userService.PlatformUser) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar
            icon={!record.avatarUrl ? <UserOutlined /> : undefined}
            src={record.avatarUrl}
            className="bg-indigo-50 text-indigo-600 border border-indigo-100/50"
            size={36}
          />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-gray-800">{record.fullName}</span>
            <span className="text-xs text-gray-400">@{record.username}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => <span className="text-sm text-gray-500 font-medium">{text || 'N/A'}</span>,
    },
    {
      title: 'Tổ chức tham gia (Vai trò)',
      key: 'memberships',
      render: (_: any, record: userService.PlatformUser) => (
        <div className="flex flex-wrap gap-2 text-left">
          {record.memberships.map((m: userService.PlatformUserMembership) => (
            <Tag
              key={m.id}
              className={`font-semibold px-2 py-0.5 rounded-lg border ${getRoleTag(m.role)}`}
            >
              {m.organization.name} ({m.role})
            </Tag>
          ))}
          {record.memberships.length === 0 && (
            <span className="text-xs text-gray-400 font-medium italic">Chưa tham gia tổ chức nào</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 text-left">

      {error && (
        <Alert
          message="Không thể truy cập"
          description={error}
          type="error"
          showIcon
        />
      )}

      {!error && (
        <>
          {/* Search bar */}
          <div className="w-full max-w-sm">
            <Input
              placeholder="Tìm kiếm người dùng, email..."
              prefix={<SearchOutlined className="text-gray-300" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="rounded-xl border-gray-200 bg-white h-10 text-sm shadow-sm"
              allowClear
            />
          </div>

          {/* Users table */}
          <Card
            className="border-none shadow-md rounded-2xl bg-white overflow-hidden"
            styles={{ body: { padding: 0 } }}
          >
            {loading ? (
              <div className="p-6">
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : (
              <Table
                dataSource={filteredUsers}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                className="custom-table"
                rowClassName={(record, idx) =>
                  `${idx % 2 === 0 ? 'bg-slate-50/20' : 'bg-white'} hover:bg-blue-50/70 transition-colors`
                }
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
