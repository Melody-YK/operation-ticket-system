import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, Typography, Alert, Divider, Space, Tag } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../utils/constants';

const { Title, Text } = Typography;

const DEV_ACCOUNTS = [
  { id: 'zs', name: '张三', role: 'OPERATOR' },
  { id: 'zl', name: '赵六', role: 'SUPERVISOR' },
  { id: 'sb', name: '孙八', role: 'APPROVER' },
  { id: 'ws', name: '吴十', role: 'DISPATCHER' },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [personnelId, setPersonnelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!personnelId.trim()) { setError('请输入人员ID'); return; }
    setLoading(true);
    setError('');
    try {
      await login(personnelId.trim(), 'any');
      navigate('/workbench', { replace: true });
    } catch (e: any) {
      setError(e.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: 400, maxWidth: '90vw' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>⚡ 操作票管理系统</Title>
        <Text type="secondary">Sprint 3 · 前端核心页面</Text>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}

      <Space direction="vertical" style={{ width: '100%' }}>
        <Input
          prefix={<UserOutlined />}
          placeholder="输入人员ID"
          value={personnelId}
          onChange={e => setPersonnelId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          size="large"
        />
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="密码（开发环境任意）"
          defaultValue="any"
          size="large"
          disabled
        />
        <Button type="primary" block size="large" loading={loading} onClick={handleLogin}>
          登录
        </Button>
      </Space>

      <Divider style={{ fontSize: 12, color: '#999' }}>开发测试账号</Divider>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
        {DEV_ACCOUNTS.map(acct => (
          <Tag
            key={acct.id}
            style={{ cursor: 'pointer' }}
            color="blue"
            onClick={() => { setPersonnelId(acct.id); setError(''); }}
          >
            {acct.id} ({acct.name}/{ROLE_LABELS[acct.role]})
          </Tag>
        ))}
      </div>
    </Card>
  );
}

export default LoginPage;
