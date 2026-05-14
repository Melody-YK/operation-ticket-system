import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Table, Button, Spin, Alert, Typography, Empty } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { TicketStatusTag } from '../components/TicketStatusTag';
import { ROLE_LABELS } from '../utils/constants';
import { api } from '../api/client';

const { Title, Text } = Typography;

interface StatCard {
  key: string;
  title: string;
  statusFilter: string;
  icon: React.ReactNode;
  color: string;
}

const ROLE_STATS: Record<string, StatCard[]> = {
  OPERATOR: [
    { key: 'pending', title: '待审核', statusFilter: 'PENDING_SUPERVISOR,PENDING_APPROVER,PENDING_DISPATCHER', icon: <ClockCircleOutlined />, color: '#faad14' },
    { key: 'executing', title: '执行中', statusFilter: 'EXECUTING', icon: <FileTextOutlined />, color: '#1677ff' },
    { key: 'completed', title: '已完成', statusFilter: 'COMPLETED', icon: <CheckCircleOutlined />, color: '#52c41a' },
    { key: 'rejected', title: '已退回', statusFilter: 'REJECTED', icon: <CloseCircleOutlined />, color: '#ff4d4f' },
  ],
  SUPERVISOR: [
    { key: 'pending', title: '待审核', statusFilter: 'PENDING_SUPERVISOR', icon: <ClockCircleOutlined />, color: '#faad14' },
    { key: 'executing', title: '执行中', statusFilter: 'EXECUTING', icon: <FileTextOutlined />, color: '#1677ff' },
    { key: 'completed', title: '已完成', statusFilter: 'COMPLETED', icon: <CheckCircleOutlined />, color: '#52c41a' },
  ],
  APPROVER: [
    { key: 'pending', title: '待审核', statusFilter: 'PENDING_APPROVER', icon: <ClockCircleOutlined />, color: '#faad14' },
  ],
  DISPATCHER: [
    { key: 'pending', title: '待发令', statusFilter: 'PENDING_DISPATCHER', icon: <SendOutlined />, color: '#faad14' },
    { key: 'executing', title: '执行中', statusFilter: 'EXECUTING', icon: <FileTextOutlined />, color: '#1677ff' },
    { key: 'completed', title: '待校验', statusFilter: 'COMPLETED', icon: <CheckCircleOutlined />, color: '#52c41a' },
  ],
};

export function WorkbenchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const role = user?.role || '';

  const columns = [
    { title: '票号', dataIndex: 'ticketId', key: 'ticketId', width: 180, render: (v: string) => <Text code>{v}</Text> },
    { title: '任务名称', dataIndex: 'taskName', key: 'taskName', ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status', width: 140, render: (s: string) => <TicketStatusTag status={s} /> },
    { title: '操作人', dataIndex: 'operatorId', key: 'operatorId', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => navigate(`/tickets/${record.ticketId}`)}>查看</Button>
      ),
    },
  ];

  useEffect(() => {
    let cancelled = false;
    api.getTickets({ page: 1, limit: 50 })
      .then(res => { if (!cancelled) setTickets(res.data); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /** 根据角色统计卡片定义，计算各卡片数值 */
  const statCards = (ROLE_STATS[role] || []).map(card => {
    const statuses = card.statusFilter.split(',');
    const value = tickets.filter(t => statuses.includes(t.status)).length;
    return { ...card, value };
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 9) return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  })();

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          {greeting}，{user?.name}
        </Title>
        <Text type="secondary">{ROLE_LABELS[role] || role} · 工作台</Text>
      </div>

      {statCards.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {statCards.map(card => (
            <Col xs={12} sm={Math.floor(24 / statCards.length)} key={card.key}>
              <Card hoverable onClick={() => navigate(`/tickets/query?status=${card.statusFilter}`)}>
                <Statistic title={card.title} value={card.value} prefix={card.icon} styles={{ content: { color: card.color } }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {role === 'OPERATOR' && (
        <Button type="primary" icon={<PlusOutlined />} size="large" style={{ marginBottom: 16 }} onClick={() => navigate('/tickets/create')}>
          新建操作票
        </Button>
      )}

      <Card title="最近操作票" extra={<Button type="link" onClick={() => navigate('/tickets/query')}>查看全部</Button>}>
        {error ? (
          <Alert message={error} type="error" />
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : tickets.length === 0 ? (
          <Empty description="暂无操作票数据" />
        ) : (
          <Table
            dataSource={tickets}
            columns={columns}
            rowKey="ticketId"
            pagination={false}
            size="small"
            scroll={{ x: 600 }}
          />
        )}
      </Card>
    </div>
  );
}

export default WorkbenchPage;
