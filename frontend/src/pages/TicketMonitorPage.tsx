import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Typography, Spin, Alert, Progress,
  Table, Button,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { TicketStatusTag } from '../components/TicketStatusTag';
import { OperationTimeline } from '../components/OperationTimeline';
import { api } from '../api/client';

const { Title, Text } = Typography;

const EXECUTE_STATUS_MAP: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'default', label: '待执行' },
  EXECUTING: { color: 'processing', label: '执行中' },
  COMPLETED: { color: 'success', label: '已完成' },
  SKIPPED: { color: 'error', label: '已跳过' },
};

export function TicketMonitorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.getTicket(id)
      .then(t => { if (!cancelled) setTicket(t); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (error) return <Alert message={error} type="error" showIcon />;
  if (!ticket) return <Alert message="操作票不存在" type="warning" showIcon />;

  const items = ticket.items || [];
  const completedCount = items.filter((i: any) => i.executeStatus === 'COMPLETED').length;
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workbench')}>返回</Button>
        <Title level={4} style={{ margin: 0 }}>📊 执行监控</Title>
        <TicketStatusTag status={ticket.status} />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="票号"><Text code>{ticket.ticketId}</Text></Descriptions.Item>
          <Descriptions.Item label="任务名称">{ticket.taskName}</Descriptions.Item>
          <Descriptions.Item label="操作人">{ticket.operatorId}</Descriptions.Item>
          <Descriptions.Item label="监护人">{ticket.supervisorId}</Descriptions.Item>
          <Descriptions.Item label="状态"><TicketStatusTag status={ticket.status} /></Descriptions.Item>
          {ticket.dispatchTime && (
            <Descriptions.Item label="下令时间">{new Date(ticket.dispatchTime).toLocaleString('zh-CN')}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="执行进度" style={{ marginBottom: 16 }}>
        <Progress
          percent={progressPct}
          status={progressPct === 100 ? 'success' : 'active'}
          format={() => `${completedCount}/${items.length}`}
        />
      </Card>

      <Card title={`操作内容（${items.length} 项）`} style={{ marginBottom: 16 }}>
        <Table
          dataSource={items}
          rowKey="itemId"
          pagination={false}
          size="small"
          columns={[
            { title: '#', dataIndex: 'sequence', width: 50, render: (v: number) => <Tag color="blue">{v}</Tag> },
            { title: '操作内容', dataIndex: 'stepContent', ellipsis: true },
            {
              title: '状态', dataIndex: 'executeStatus', width: 100,
              render: (s: string) => {
                const m = EXECUTE_STATUS_MAP[s] || { color: 'default', label: s };
                return <Tag color={m.color}>{m.label}</Tag>;
              },
            },
            {
              title: '结果', dataIndex: 'executeResult', width: 120,
              render: (v: string) => v || '-',
            },
          ]}
        />
      </Card>

      <Card title="操作时间线" style={{ marginBottom: 16 }}>
        <OperationTimeline ticketId={ticket.ticketId} />
      </Card>
    </div>
  );
}

export default TicketMonitorPage;
