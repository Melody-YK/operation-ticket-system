import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Typography, Spin, Alert,
  Modal, Input, Space, message, Form, List,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, SendOutlined,
  ArrowLeftOutlined, PlayCircleOutlined, EditOutlined,
  SaveOutlined, CloseOutlined, PlusOutlined, MinusCircleOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { TicketStatusTag } from '../components/TicketStatusTag';
import { api } from '../api/client';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ROLE_ACTIONS: Record<string, { action: string; label: string; icon: any; color: string; danger?: boolean }[]> = {
  SUPERVISOR: [
    { action: 'approve', label: '审核通过', icon: <CheckCircleOutlined />, color: 'green' },
    { action: 'reject', label: '退回', icon: <CloseCircleOutlined />, color: 'red', danger: true },
  ],
  APPROVER: [
    { action: 'approve', label: '审核通过', icon: <CheckCircleOutlined />, color: 'green' },
    { action: 'reject', label: '退回', icon: <CloseCircleOutlined />, color: 'red', danger: true },
  ],
  DISPATCHER: [
    { action: 'approve', label: '审核通过', icon: <CheckCircleOutlined />, color: 'green' },
    { action: 'approve_and_dispatch', label: '审核并下达指令', icon: <SendOutlined />, color: 'blue' },
    { action: 'reject', label: '退回', icon: <CloseCircleOutlined />, color: 'red', danger: true },
  ],
};

export function TicketReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [comment, setComment] = useState('');
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [editForm] = Form.useForm();

  const role = user?.role || '';

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [ticketData, statusData] = await Promise.all([
          api.getTicket(id),
          api.getTicketStatus(id),
        ]);
        if (cancelled) return;
        setTicket(ticketData);
        setStatusInfo(statusData);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  /** 操作人（OPERATOR）根据状态可执行的操作 */
  const operatorActions = (() => {
    if (role !== 'OPERATOR' || !ticket || user?.id !== ticket.operatorId) return [];
    const status = ticket.status;
    const actions: { action: string; label: string; icon: any; type?: 'primary' | 'default'; danger?: boolean }[] = [];

    if (status === 'DRAFT') {
      actions.push({ action: 'submit', label: '提交送审', icon: <SendOutlined />, type: 'primary' });
      actions.push({ action: 'edit', label: '编辑', icon: <EditOutlined />, type: 'default' });
    }
    if (status === 'REJECTED') {
      actions.push({ action: 'resubmit', label: '重新提交', icon: <SendOutlined />, type: 'primary' });
      actions.push({ action: 'edit', label: '编辑', icon: <EditOutlined />, type: 'default' });
    }
    if (status === 'PENDING_EXECUTE') {
      actions.push({ action: 'start_execute', label: '开始执行', icon: <PlayCircleOutlined />, type: 'primary' });
    }
    if (status === 'EXECUTING') {
      actions.push({ action: 'go_execute', label: '前往执行', icon: <PlayCircleOutlined />, type: 'primary' });
    }
    return actions;
  })();

  /** 发令人校验入口 */
  const dispatcherPostActions = (() => {
    if (role !== 'DISPATCHER' || !ticket) return [];
    if (ticket.status === 'COMPLETED') {
      return [{ action: 'go_verify', label: '前往校验', icon: <AuditOutlined />, type: 'primary' as const }];
    }
    return [];
  })();

  const availableActions = (() => {
    if (!statusInfo || !role) return [];
    // 如果是 OPERATOR，用操作人自己的操作列表
    if (role === 'OPERATOR') return operatorActions;

    const roleActions = ROLE_ACTIONS[role] || [];
    const allowedEvents = statusInfo.allowedActions?.map((a: any) => a.event) || [];

    // 发令人在 COMPLETED 状态下显示"前往校验"
    const postActions = role === 'DISPATCHER' ? dispatcherPostActions : [];
    if (postActions.length > 0) return postActions;

    return roleActions.filter(a => {
      if (a.action === 'approve') return allowedEvents.includes('approve');
      if (a.action === 'approve_and_dispatch') return allowedEvents.includes('approve_and_dispatch');
      if (a.action === 'reject') return allowedEvents.includes('reject');
      return false;
    });
  })();

  const confirmAction = async (action?: string) => {
    if (!id) return;
    const execAction = action ?? currentAction;
    setSubmitting(true);
    try {
      if (execAction === 'approve_and_dispatch') {
        await api.reviewTicket(id, 'approve', comment);
        message.success('审核通过并下达指令成功！');
      } else if (execAction === 'submit') {
        await api.submitTicket(id);
        message.success('已提交送审！');
      } else if (execAction === 'resubmit') {
        await api.resubmitTicket(id);
        message.success('已重新提交！');
      } else if (execAction === 'start_execute') {
        await api.startExecute(id);
        message.success('开始执行！');
      } else if (execAction === 'go_execute') {
        navigate(`/tickets/${id}/execute`);
        return;
      } else if (execAction === 'go_verify') {
        navigate(`/tickets/${id}/verify`);
        return;
      } else {
        await api.reviewTicket(id, execAction, comment);
        message.success(execAction === 'approve' ? '审核通过！' : '已驳回');
      }
      setModalVisible(false);
      const [ticketData, statusData] = await Promise.all([
        api.getTicket(id),
        api.getTicketStatus(id),
      ]);
      setTicket(ticketData);
      setStatusInfo(statusData);
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  /** 点击操作按钮：需要确认的弹窗，无需确认的直接执行 */
  const handleAction = (action: string) => {
    // 无需弹窗确认的操作（直接执行，传入 action 避免 setCurrentAction 异步问题）
    if (action === 'start_execute' || action === 'go_execute' || action === 'go_verify') {
      setCurrentAction(action);
      confirmAction(action);
      return;
    }
    // 编辑模式：初始化表单
    if (action === 'edit') {
      editForm.setFieldsValue({
        taskName: ticket.taskName,
        station: ticket.basicInfo?.station || '',
        workType: ticket.basicInfo?.workType || '',
        workTicketNo: ticket.workTicketNo || '',
        items: ticket.items?.map((i: any) => ({ stepContent: i.stepContent })) || [{ stepContent: '' }],
      });
      setEditing(true);
      return;
    }
    setCurrentAction(action);
    setComment('');
    setModalVisible(true);
  };

  /** 保存编辑 */
  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      const values = await editForm.validateFields();
      setSubmitting(true);
      const payload = {
        taskName: values.taskName,
        basicInfo: { station: values.station || '', workType: values.workType || '' },
        workTicketNo: values.workTicketNo || null,
        items: (values.items || []).map((item: any) => ({ stepContent: item.stepContent })),
      };
      await api.updateTicket(id, payload);
      message.success('操作票已更新');
      setEditing(false);
      const [ticketData, statusData] = await Promise.all([
        api.getTicket(id),
        api.getTicketStatus(id),
      ]);
      setTicket(ticketData);
      setStatusInfo(statusData);
    } catch (e: any) {
      if (e.message) message.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" tip="加载中..." /></div>;
  if (error) return <Alert message={error} type="error" showIcon />;
  if (!ticket) return <Alert message="操作票不存在" type="warning" showIcon />;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workbench')}>返回</Button>
        <Title level={4} style={{ margin: 0 }}>操作票详情</Title>
        <TicketStatusTag status={ticket.status} />
      </div>

      {editing ? (
        <Form form={editForm} layout="vertical">
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Form.Item name="taskName" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
              <Input />
            </Form.Item>
            <Space style={{ width: '100%' }} size="middle">
              <Form.Item name="station" label="变电站" style={{ flex: 1 }}>
                <Input placeholder="如：110kV 变电站" />
              </Form.Item>
              <Form.Item name="workType" label="作业类型" style={{ flex: 1 }}>
                <Input placeholder="如：检修 / 试验" />
              </Form.Item>
            </Space>
            <Form.Item name="workTicketNo" label="工作票编号">
              <Input placeholder="关联工作票编号（可选）" />
            </Form.Item>
          </Card>

          <Card
            title="操作内容"
            style={{ marginBottom: 16 }}
            extra={
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => {
                const items = editForm.getFieldValue('items') || [];
                editForm.setFieldsValue({ items: [...items, { stepContent: '' }] });
              }}>
                添加步骤
              </Button>
            }
          >
            <Form.List name="items">
              {(fields, { remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }, index) => (
                    <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                      <span style={{ minWidth: 24, fontWeight: 'bold', color: '#1677ff' }}>{index + 1}.</span>
                      <Form.Item
                        {...restField}
                        name={[name, 'stepContent']}
                        rules={[{ required: true, message: '请输入操作内容' }]}
                        style={{ flex: 1, marginBottom: 0 }}
                      >
                        <Input placeholder={`第 ${index + 1} 步操作内容`} style={{ width: 400 }} />
                      </Form.Item>
                      {fields.length > 1 && (
                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                      )}
                    </Space>
                  ))}
                </>
              )}
            </Form.List>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
            <Button icon={<CloseOutlined />} onClick={() => setEditing(false)}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={submitting} onClick={handleSaveEdit}>
              保存修改
            </Button>
          </div>
        </Form>
      ) : (
        <>
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
              <Descriptions.Item label="票号"><Text code>{ticket.ticketId}</Text></Descriptions.Item>
              <Descriptions.Item label="任务名称">{ticket.taskName}</Descriptions.Item>
              <Descriptions.Item label="操作人">{ticket.operatorId}</Descriptions.Item>
              <Descriptions.Item label="监护人">{ticket.supervisorId}</Descriptions.Item>
              <Descriptions.Item label="批准人">{ticket.approverId}</Descriptions.Item>
              <Descriptions.Item label="发令人">{ticket.dispatcherId}</Descriptions.Item>
              <Descriptions.Item label="变电站">{ticket.basicInfo?.station || '-'}</Descriptions.Item>
              <Descriptions.Item label="作业类型">{ticket.basicInfo?.workType || '-'}</Descriptions.Item>
              <Descriptions.Item label="工作票号">{ticket.workTicketNo || '-'}</Descriptions.Item>
              {ticket.dispatchTime && (
                <Descriptions.Item label="下令时间">{new Date(ticket.dispatchTime).toLocaleString('zh-CN')}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card title={`操作内容（共 ${ticket.items?.length || 0} 项）`} style={{ marginBottom: 16 }}>
            {ticket.items?.length > 0 ? (
              <List
                size="small"
                dataSource={ticket.items}
                renderItem={(item: any, index: number) => (
                  <List.Item>
                    <Space>
                      <Tag color="blue">{index + 1}</Tag>
                      <Text>{item.stepContent}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            ) : <Text type="secondary">无操作内容</Text>}
          </Card>
        </>
      )}

      {ticket.logs?.length > 0 && (
        <Card title="操作日志" style={{ marginBottom: 16 }}>
          <List
            size="small"
            dataSource={ticket.logs}
            renderItem={(log: any) => {
              let detail = log.actionDetail;
              try { const parsed = JSON.parse(detail); detail = parsed.message || detail; } catch { void 0; }
              return (
                <List.Item>
                  <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    <Space>
                      <Tag>{log.actionNode}</Tag>
                      <Text type="secondary">{new Date(log.actionTime).toLocaleString('zh-CN')}</Text>
                      <Text type="secondary">— {log.operatorId}</Text>
                    </Space>
                    <Text>{detail}</Text>
                  </Space>
                </List.Item>
              );
            }}
          />
        </Card>
      )}

      {availableActions.length > 0 && (
        <Card>
          <Space size="middle">
            {availableActions.map(action => (
              <Button
                key={action.action}
                type={action.action === 'approve' || action.action === 'approve_and_dispatch' ? 'primary' : 'default'}
                icon={action.icon}
                danger={action.danger}
                size="large"
                onClick={() => handleAction(action.action)}
              >
                {action.label}
              </Button>
            ))}
          </Space>
        </Card>
      )}

      <Modal
        title={currentAction === 'reject' ? '驳回操作票' : '审核确认'}
        open={modalVisible}
        onOk={() => confirmAction(currentAction)}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        okText={currentAction === 'reject' ? '确认驳回' : '确认通过'}
        okButtonProps={{ danger: currentAction === 'reject' }}
      >
        <Form layout="vertical">
          <Form.Item label="审核意见（可选）">
            <TextArea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={currentAction === 'reject' ? '请输入驳回原因...' : '可选审核意见'}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default TicketReviewPage;
