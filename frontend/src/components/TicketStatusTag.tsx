import { Tag } from 'antd';
import { STATUS_LABELS, STATUS_COLORS } from '../utils/constants';

interface Props {
  status: string;
}

export function TicketStatusTag({ status }: Props) {
  const label = STATUS_LABELS[status] || status;
  const color = STATUS_COLORS[status] || 'default';

  return <Tag color={color}>{label}</Tag>;
}

export default TicketStatusTag;
