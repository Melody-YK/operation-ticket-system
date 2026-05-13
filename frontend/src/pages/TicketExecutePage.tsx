import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Typography, Spin, Alert, message, Steps, Space,
  Descriptions, Tag, List, Result,
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ArrowLeftOutlined, FlagOutlined,
} from '@ant-design/icons';
import { TicketStatusTag } from '../components/TicketStatusTag';
import { api } from '../api/client';

const { Title, Text } = Typography;

export function TicketExecutePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [executing, setExecuting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.getTicket(id)
      .then(t => {
        if (!cancelled) { setTicket(t); }
        const firstPending = t.items?.findIndex((i: any) => i.executeStatus === 'PENDING');
        if (firstPending >= 0) setActiveStep(firstPending);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleStartExecute = async () => {
    if (!id) return;
    setExecuting(true);
    try {
      const result = await api.startExecute(id);
      setTicket(result);
      message.success('开始执行');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setExecuting(false);
    }
  };

  const handleExecuteItem = async (itemId: string) => {
    if (!id) return;
    setExecuting(true);
    try {
      const result = await api.updateItemStatus(id, itemId, 'execute');
      setTicket(result);
      message.success('操作项已执行');
      const nextPending = result.items?.findIndex((i: any) => i.executeStatus === 'PENDING');
      if (nextPending >= 0) setActiveStep(nextPending);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setExecuting(false);
    }
  };

  const handleSkipItem = async (itemId: string) => {
    if (!id) return;
    setExecuting(true);
    try {
      const result = await api.updateItemStatus(id, itemId, 'skip');
      setTicket(result);
      message.info('操作项已跳过');
      const nextPending = result.items?.findIndex((i: any) => i.executeStatus === 'PENDING');
      if (nextPending >= 0) setActiveStep(nextPending);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setExecuting(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    setExecuting(true);
    try {
      const result = await api.completeExecution(id);
      setTicket(result);
      setFinished(true);
      message.success('操作执行完毕，已进入校验阶段');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (error) return <Alert message={error} type="error" showIcon />;
  if (!ticket) return <Alert message="操作票不存在" type="warning" showIcon />;

  if (ticket.status === 'COMPLETED' || (ticket.status === 'EXECUTING' && finished)) {
    return (
      <Result
        status="success"
        title="操作执行完毕"
        subTitle="操作票已进入数据校验阶段"
        extra={[
          <Button key="view" type="primary" onClick={() => navigate(`/tickets/${id}`)}>查看详情</Button>,
          <Button key="back" onClick={() => navigate('/workbench')}>返回工作台</Button>,
        ]}
      />
    );
  }

  const items = ticket.items || [];
  const currentItem = items[activeStep];
  const completedCount = items.filter((i: any) => i.executeStatus === 'COMPLETED').length;
  const allDone = items.every((i: any) => i.executeStatus === 'COMPLETED' || i.executeStatus === 'SKIPPED');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workbench')}>返回</Button>
        <Title level={4} style={{ margin: 0 }}>⚡ 操作执行</Title>
        <TicketStatusTag status={ticket.status} />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="票号"><Text code>{ticket.ticketId}</Text></Descriptions.Item>
          <Descriptions.Item label="任务名称">{ticket.taskName}</Descriptions.Item>
          <Descriptions.Item label="进度">{completedCount}/{items.length} 项已完成</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Steps
          current={activeStep}
          size="small"
          items={items.map((item: any, idx: number) => ({
            title: `第${idx + 1}步`,
            status: item.executeStatus === 'COMPLETED' ? 'finish'
              : item.executeStatus === 'SKIPPED' ? 'error'
              : idx === activeStep ? 'process' : 'wait',
          }))}
        />
      </Card>

      {currentItem && (
        <Card
          title={
            <Space>
              <FlagOutlined style={{ color: '#1677ff' }} />
              <Text strong>当前操作：第 {activeStep + 1} 项</Text>
            </Space>
          }
          style={{ marginBottom: 16, borderColor: '#1677ff' }}
        >
          <div style={{ padding: '16px 0', fontSize: 16 }}>
            <Text>{currentItem.stepContent}</Text>
          </div>

          {ticket.status === 'PENDING_EXECUTE' ? (
            <Button type="primary" icon={<PlayCircleOutlined />} size="large" loading={executing} onClick={handleStartExecute}>
              开始执行
            </Button>
          ) : (
            <Space size="middle">
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="large"
                loading={executing}
                onClick={() => handleExecuteItem(currentItem.itemId)}
              >
                执行完成
              </Button>
              <Button
                icon={<CloseCircleOutlined />}
                size="large"
                loading={executing}
                onClick={() => handleSkipItem(currentItem.itemId)}
                disabled={items.length <= 1}
              >
                跳过此项
              </Button>
              {allDone && ticket.status === 'EXECUTING' && (
                <Button
                  type="primary"
                  icon={<FlagOutlined />}
                  size="large"
                  loading={executing}
                  onClick={handleComplete}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  全部完成，提交校验
                </Button>
              )}
            </Space>
          )}
        </Card>
      )}

      <Card title="执行进度">
        <List
          size="small"
          dataSource={items}
          renderItem={(item: any, index: number) => {
            const statusMap: Record<string, { color: string; label: string }> = {
              PENDING: { color: 'default', label: '待执行' },
              EXECUTING: { color: 'processing', label: '执行中' },
              COMPLETED: { color: 'success', label: '已完成' },
              SKIPPED: { color: 'error', label: '已跳过' },
            };
            const s = statusMap[item.executeStatus] || { color: 'default', label: item.executeStatus };

            return (
              <List.Item
                extra={<Tag color={s.color}>{s.label}</Tag>}
                style={{ background: index === activeStep ? '#f0f5ff' : 'transparent' }}
              >
                <Space>
                  <Tag color="blue">{index + 1}</Tag>
                  <Text delete={item.executeStatus === 'SKIPPED'}>{item.stepContent}</Text>
                </Space>
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
}

export default TicketExecutePage;
