import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Input, Select, DatePicker, Space, Typography, Alert, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { TicketStatusTag } from '../components/TicketStatusTag';
import { api } from '../api/client';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'DRAFT', label: '建立' },
  { value: 'PENDING_SUPERVISOR', label: '待审核（监护人）' },
  { value: 'PENDING_APPROVER', label: '待审核（批准人）' },
  { value: 'PENDING_DISPATCHER', label: '待审核（发令人）' },
  { value: 'PENDING_EXECUTE', label: '待执行' },
  { value: 'EXECUTING', label: '执行中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'REJECTED', label: '建立（驳回）' },
  { value: 'VOIDED', label: '作废' },
];

export function TicketQueryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const fetchData = async (page = 1, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const params: any = { page, limit: pagination.limit };
      if (keyword) params.keyword = keyword;
      if (statusFilter) params.status = statusFilter;
      if (dateRange) {
        params.start_date = dateRange[0];
        params.end_date = dateRange[1];
      }
      const res = await api.getTickets(params);
      setTickets(res.data);
      setPagination(prev => ({ ...prev, page, total: res.pagination.total }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api.getTickets({ page: 1, limit: 20 })
      .then(res => { if (!cancelled) { setTickets(res.data); setPagination(prev => ({ ...prev, total: res.pagination.total })); } })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const columns = [
    { title: '票号', dataIndex: 'ticketId', key: 'ticketId', width: 180, render: (v: string) => <Text code>{v}</Text> },
    { title: '任务名称', dataIndex: 'taskName', key: 'taskName', ellipsis: true },
    { title: '状态', dataIndex: 'status', key: 'status', width: 140, render: (s: string) => <TicketStatusTag status={s} /> },
    { title: '操作人', dataIndex: 'operatorId', key: 'operatorId', width: 80 },
    { title: '监护人', dataIndex: 'supervisorId', key: 'supervisorId', width: 80 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: any) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/tickets/${record.ticketId}`)}>查看</Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>🔍 操作票查询</Title>
        {user?.role === 'OPERATOR' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tickets/create')}>新建</Button>
        )}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="搜索票号/任务名称"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onPressEnter={() => fetchData(1)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={v => setStatusFilter(v)}
              options={STATUS_OPTIONS}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(_, dateStrings) => {
                if (dateStrings[0] && dateStrings[1]) {
                  setDateRange([dateStrings[0], dateStrings[1]]);
                } else {
                  setDateRange(null);
                }
              }}
            />
          </Col>
          <Col xs={24} sm={8} md={8}>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchData(1)}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setStatusFilter(''); setDateRange(null); fetchData(1); }}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        {error ? (
          <Alert message={error} type="error" />
        ) : (
          <Table
            dataSource={tickets}
            columns={columns}
            rowKey="ticketId"
            loading={loading}
            scroll={{ x: 800 }}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total: number) => `共 ${total} 条`,
              onChange: (page: number, pageSize: number) => {
                setPagination(prev => ({ ...prev, page, limit: pageSize }));
                fetchData(page);
              },
            }}
          />
        )}
      </Card>
    </div>
  );
}

export default TicketQueryPage;
