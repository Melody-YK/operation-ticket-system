import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Table, Button, Spin, Alert, Typography, Empty } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { TicketStatusTag } from '../components/TicketStatusTag';
import { ROLE_LABELS } from '../utils/constants';
import { api } from '../api/client';

const { Title, Text } = Typography;

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
    const statusFilter = getRoleStatusFilter(role);
    api.getTickets({ page: 1, limit: 50, ...(statusFilter ? { status: statusFilter } : {}) })
      .then(res => { if (!cancelled) setTickets(res.data); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role]);

  const pendingCount = tickets.filter(t =>
    ['PENDING_SUPERVISOR', 'PENDING_APPROVER', 'PENDING_DISPATCHER'].includes(t.status)
  ).length;
  const executingCount = tickets.filter(t => t.status === 'EXECUTING').length;
  const completedCount = tickets.filter(t => t.status === 'COMPLETED').length;
  const rejectedCount = tickets.filter(t => t.status === 'REJECTED').length;

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

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/tickets/query?status=PENDING_SUPERVISOR')}>
            <Statistic title="待审核" value={pendingCount} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/tickets/query?status=EXECUTING')}>
            <Statistic title="执行中" value={executingCount} prefix={<FileTextOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/tickets/query?status=COMPLETED')}>
            <Statistic title="已完成" value={completedCount} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/tickets/query?status=REJECTED')}>
            <Statistic title="被驳回" value={rejectedCount} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

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

function getRoleStatusFilter(role: string): string | undefined {
  switch (role) {
    case 'OPERATOR': return undefined;
    case 'SUPERVISOR': return 'PENDING_SUPERVISOR';
    case 'APPROVER': return 'PENDING_APPROVER';
    case 'DISPATCHER': return 'PENDING_DISPATCHER';
    default: return undefined;
  }
}

export default WorkbenchPage;
