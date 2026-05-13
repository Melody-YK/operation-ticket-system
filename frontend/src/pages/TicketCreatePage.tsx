import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Form, Input, Select, Button, Space, Typography, Alert,
  message,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, SendOutlined } from '@ant-design/icons';
import { api } from '../api/client';

const { Title } = Typography;

export function TicketCreatePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [supervisors, setSupervisors] = useState<{ value: string; label: string }[]>([]);
  const [approvers, setApprovers] = useState<{ value: string; label: string }[]>([]);
  const [dispatchers, setDispatchers] = useState<{ value: string; label: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getPersonnel('SUPERVISOR'),
      api.getPersonnel('APPROVER'),
      api.getPersonnel('DISPATCHER'),
    ]).then(([sup, app, dis]) => {
      setSupervisors(sup.map(p => ({ value: p.personnelId, label: `${p.name} (${p.personnelId})` })));
      setApprovers(app.map(p => ({ value: p.personnelId, label: `${p.name} (${p.personnelId})` })));
      setDispatchers(dis.map(p => ({ value: p.personnelId, label: `${p.name} (${p.personnelId})` })));
    });
  }, []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      setError('');

      const payload = {
        taskName: values.taskName,
        supervisorId: values.supervisorId,
        approverId: values.approverId,
        dispatcherId: values.dispatcherId,
        basicInfo: {
          station: values.station || '',
          workType: values.workType || '',
        },
        workTicketNo: values.workTicketNo || null,
        items: (values.items || []).map((item: any, index: number) => ({
          stepContent: item.stepContent,
          sequence: index + 1,
        })),
      };

      const result = await api.createTicket(payload);
      message.success('操作票创建成功！');
      navigate(`/tickets/${result.ticketId}`, { replace: true });
    } catch (e: any) {
      if (e.message) setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const values = form.getFieldsValue();
      if (!values.taskName) { message.warning('请至少填写任务名称'); return; }
      setError('');
      const payload = {
        taskName: values.taskName,
        supervisorId: values.supervisorId || '',
        approverId: values.approverId || '',
        dispatcherId: values.dispatcherId || '',
        basicInfo: { station: values.station || '', workType: values.workType || '' },
        items: (values.items || []).map((item: any, index: number) => ({ stepContent: item.stepContent, sequence: index + 1 })),
      };
      await api.createTicket(payload);
      message.success('草稿已保存');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 16 }}>📋 新建操作票</Title>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}

      <Form form={form} layout="vertical" initialValues={{ items: [{ stepContent: '' }] }}>
        <Card title="基本信息" style={{ marginBottom: 16 }}>
          <Form.Item name="taskName" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
            <Input placeholder="如：110kV 线路检修操作" />
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

        <Card title="审核人信息" style={{ marginBottom: 16 }}>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="supervisorId" label="监护人" rules={[{ required: true, message: '请选择监护人' }]} style={{ flex: 1 }}>
              <Select options={supervisors} placeholder="选择监护人" showSearch />
            </Form.Item>
            <Form.Item name="approverId" label="批准人" rules={[{ required: true, message: '请选择批准人' }]} style={{ flex: 1 }}>
              <Select options={approvers} placeholder="选择批准人" showSearch />
            </Form.Item>
            <Form.Item name="dispatcherId" label="发令人" rules={[{ required: true, message: '请选择发令人' }]} style={{ flex: 1 }}>
              <Select options={dispatchers} placeholder="选择发令人" showSearch />
            </Form.Item>
          </Space>
        </Card>

        <Card
          title="操作内容"
          style={{ marginBottom: 16 }}
          extra={
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => {
              const items = form.getFieldValue('items') || [];
              form.setFieldsValue({ items: [...items, { stepContent: '' }] });
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

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => navigate('/workbench')}>取消</Button>
          <Space>
            <Button onClick={handleSaveDraft}>保存草稿</Button>
            <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSubmit}>
              提交送审
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
}

export default TicketCreatePage;
