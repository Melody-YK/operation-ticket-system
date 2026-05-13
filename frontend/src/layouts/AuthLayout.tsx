import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';

const { Content } = Layout;

export function AuthLayout() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}

export default AuthLayout;
