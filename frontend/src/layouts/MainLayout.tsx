import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  FileAddOutlined,
  SearchOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../utils/constants';
import { NetworkStatus } from '../components/NetworkStatus';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { token: themeToken } = theme.useToken();

  const role = user?.role || '';

  const menuItems = [
    { key: '/workbench', icon: <DashboardOutlined />, label: '工作台', showFor: ['OPERATOR', 'SUPERVISOR', 'APPROVER', 'DISPATCHER'] },
    { key: '/tickets/create', icon: <FileAddOutlined />, label: '创建操作票', showFor: ['OPERATOR'] },
    { key: '/tickets/query', icon: <SearchOutlined />, label: '查询操作票', showFor: ['OPERATOR', 'SUPERVISOR', 'APPROVER', 'DISPATCHER'] },
  ].filter(item => item.showFor.includes(role));

  const pathParts = location.pathname.split('/').filter(Boolean);
  const selectedKey = pathParts.length >= 2 ? '/' + pathParts.slice(0, 2).join('/') : '/' + (pathParts[0] || 'workbench');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => { if (broken) setCollapsed(true); }}
        style={{ background: themeToken.colorBgContainer }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
        }}>
          <Text strong style={{ fontSize: collapsed ? 14 : 16, whiteSpace: 'nowrap' }}>
            {collapsed ? '⚡' : '⚡ 操作票系统'}
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: themeToken.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Dropdown
            menu={{
              items: [
                { key: 'role', label: `${ROLE_LABELS[role] || role} · ${user?.name}`, disabled: true },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
              ],
              onClick: ({ key }) => { if (key === 'logout') { logout(); navigate('/login'); } },
            }}
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ background: themeToken.colorPrimary }} />
              <Text>{user?.name}</Text>
            </div>
          </Dropdown>
        </Header>
        <NetworkStatus />
        <Content style={{ margin: 16, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
