// 操作票状态 → 中文标签
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: '建立',
  PENDING_SUPERVISOR: '待审核（监护人）',
  PENDING_APPROVER: '待审核（批准人）',
  PENDING_DISPATCHER: '待审核（发令人）',
  PENDING_EXECUTE: '待执行',
  EXECUTING: '执行中',
  SUSPENDED: '中止',
  COMPLETED: '已完成',
  VOIDED: '作废',
  REJECTED: '建立（驳回）',
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default',
  PENDING_SUPERVISOR: 'processing',
  PENDING_APPROVER: 'processing',
  PENDING_DISPATCHER: 'processing',
  PENDING_EXECUTE: 'warning',
  EXECUTING: 'success',
  SUSPENDED: 'error',
  COMPLETED: 'success',
  VOIDED: 'default',
  REJECTED: 'error',
};

// 角色枚举
export enum Role {
  OPERATOR = 'OPERATOR',
  SUPERVISOR = 'SUPERVISOR',
  APPROVER = 'APPROVER',
  DISPATCHER = 'DISPATCHER',
}

export const ROLE_LABELS: Record<string, string> = {
  OPERATOR: '操作人',
  SUPERVISOR: '监护人',
  APPROVER: '批准人',
  DISPATCHER: '发令人',
};

// 各角色允许的菜单项
export const ROLE_MENUS: Record<string, string[]> = {
  OPERATOR: ['workbench', 'create', 'query', 'detail'],
  SUPERVISOR: ['workbench', 'query', 'detail'],
  APPROVER: ['workbench', 'query', 'detail'],
  DISPATCHER: ['workbench', 'query', 'detail'],
};

// 各角色主页路由
export const ROLE_HOME: Record<string, string> = {
  OPERATOR: '/workbench',
  SUPERVISOR: '/workbench',
  APPROVER: '/workbench',
  DISPATCHER: '/workbench',
};
