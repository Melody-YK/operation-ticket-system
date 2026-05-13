import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Typography, Spin, Alert, Button,
  Space, List, Input, message, Result, Modal,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { TicketStatusTag } from '../components/TicketStatusTag';
import { OperationTimeline } from '../components/OperationTimeline';
import { api } from '../api/client';

const { Title, Text } = Typography;
const { TextArea } = Input;

export function TicketVerifyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'verify_pass' | 'verify_fail'>('verify_pass');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.getTicket(id)
      .then(t => { if (!cancelled) setTicket(t); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleVerify = (action: 'verify_pass' | 'verify_fail') => {
    setVerifyAction(action);
    setComment('');
    setModalVisible(true);
  };

  const confirmVerify = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const result = await api.verifyTicket(id, verifyAction, comment);
      setTicket(result);
      setModalVisible(false);
      setDone(true);
      message.success(verifyAction === 'verify_pass' ? '校验通过，操作票已归档' : '已标记异常');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (error) return <Alert message={error} type="error" showIcon />;
  if (!ticket) return <Alert message="操作票不存在" type="warning" showIcon />;

  if (done) {
    return (
      <Result
        status={verifyAction === 'verify_pass' ? 'success' : 'warning'}
        title={verifyAction === 'verify_pass' ? '校验通过，归档完成' : '已标记异常数据'}
        subTitle={comment || undefined}
        extra={[
          <Button key="view" type="primary" onClick={() => navigate(`/tickets/${id}`)}>查看详情</Button>,
          <Button key="back" onClick={() => navigate('/workbench')}>返回工作台</Button>,
        ]}
      />
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workbench')}>返回</Button>
        <Title level={4} style={{ margin: 0 }}>📋 数据校验</Title>
        <TicketStatusTag status={ticket.status} />
      </div>

      <Card title="操作票信息" style={{ marginBottom: 16 }}>
        <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="票号"><Text code>{ticket.ticketId}</Text></Descriptions.Item>
          <Descriptions.Item label="任务名称">{ticket.taskName}</Descriptions.Item>
          <Descriptions.Item label="操作人">{ticket.operatorId}</Descriptions.Item>
          <Descriptions.Item label="监护人">{ticket.supervisorId}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="校验内容" style={{ marginBottom: 16 }}>
        <List
          size="small"
          dataSource={[
            { label: '操作项完整性', desc: '所有操作项是否已执行完成', status: 'pass' },
            { label: '数据一致性', desc: '现场数据与操作记录是否一致', status: 'pass' },
            { label: '设备状态', desc: '设备状态转换是否正常', status: 'pending' },
          ]}
          renderItem={(item: any) => (
            <List.Item
              extra={
                item.status === 'pass'
                  ? <Tag color="success">通过</Tag>
                  : item.status === 'fail'
                  ? <Tag color="error">异常</Tag>
                  : <Tag color="processing">待校验</Tag>
              }
            >
              <Space direction="vertical" size={0}>
                <Text strong>{item.label}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <Card title="操作时间线" style={{ marginBottom: 16 }}>
        <OperationTimeline ticketId={ticket.ticketId} />
      </Card>

      {ticket.status === 'COMPLETED' && (
        <Card>
          <Space size="middle">
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="large"
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => handleVerify('verify_pass')}
            >
              校验通过，归档
            </Button>
            <Button
              icon={<CloseCircleOutlined />}
              size="large"
              danger
              onClick={() => handleVerify('verify_fail')}
            >
              标记异常
            </Button>
          </Space>
        </Card>
      )}

      <Modal
        title={verifyAction === 'verify_pass' ? '确认校验通过' : '标记异常'}
        open={modalVisible}
        onOk={confirmVerify}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        okText={verifyAction === 'verify_pass' ? '确认归档' : '确认异常'}
        okButtonProps={{ danger: verifyAction === 'verify_fail' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            {verifyAction === 'verify_pass'
              ? '校验通过后操作票将归档保存，确认继续？'
              : '标记异常后数据将被标识，请填写异常说明'}
          </Text>
          <TextArea
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={verifyAction === 'verify_fail' ? '请描述异常情况...' : '归档备注（可选）'}
          />
        </Space>
      </Modal>
    </div>
  );
}

export default TicketVerifyPage;
