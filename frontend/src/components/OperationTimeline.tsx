import { Timeline, Tag, Typography, Spin, Empty } from 'antd';
import {
  FileAddOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  PlayCircleOutlined,
  StopOutlined,
  EyeOutlined,
  CameraOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { api } from '../api/client';

const { Text } = Typography;

const ACTION_CONFIG: Record<string, { color: string; icon: any }> = {
  create: { color: 'blue', icon: <FileAddOutlined /> },
  submit: { color: 'blue', icon: <SendOutlined /> },
  approve: { color: 'green', icon: <CheckCircleOutlined /> },
  reject: { color: 'red', icon: <CloseCircleOutlined /> },
  approve_and_dispatch: { color: 'blue', icon: <SendOutlined /> },
  dispatch: { color: 'blue', icon: <SendOutlined /> },
  start_execute: { color: 'orange', icon: <PlayCircleOutlined /> },
  execute_item: { color: 'green', icon: <CheckCircleOutlined /> },
  complete: { color: 'green', icon: <CheckCircleOutlined /> },
  suspend: { color: 'red', icon: <StopOutlined /> },
  verify_pass: { color: 'green', icon: <CheckCircleOutlined /> },
  verify_fail: { color: 'red', icon: <CloseCircleOutlined /> },
  resubmit: { color: 'blue', icon: <SendOutlined /> },
  update: { color: 'gray', icon: <EditOutlined /> },
  review: { color: 'green', icon: <EyeOutlined /> },
  upload_media: { color: 'purple', icon: <CameraOutlined /> },
  void: { color: 'red', icon: <CloseCircleOutlined /> },
};

interface Props {
  ticketId: string;
}

export function OperationTimeline({ ticketId }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getTimeline(ticketId)
      .then(data => { if (!cancelled) setLogs(data.logs || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticketId]);

  if (loading) return <Spin size="small" />;
  if (logs.length === 0) return <Empty description="暂无操作日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  const items = logs.map((log: any) => {
    const config = ACTION_CONFIG[log.actionNode] || { color: 'gray', icon: <EditOutlined /> };
    let detail = log.actionDetail || '';
    try { const parsed = JSON.parse(detail); detail = parsed.message || detail; } catch { void 0; }

    return {
      color: config.color,
      dot: config.icon,
      children: (
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tag color={config.color}>{log.actionNode}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>{new Date(log.actionTime).toLocaleString('zh-CN')}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>— {log.operatorId}</Text>
          </div>
          <Text style={{ fontSize: 13 }}>{detail}</Text>
        </div>
      ),
    };
  });

  return <Timeline items={items} />;
}

export default OperationTimeline;
