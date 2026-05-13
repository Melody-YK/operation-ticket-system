import { Injectable, BadRequestException } from '@nestjs/common';

// ==========================================
// 操作票事件枚举
// ==========================================
export enum TicketEvent {
  SUBMIT = 'submit',
  APPROVE = 'approve',
  REJECT = 'reject',
  APPROVE_AND_DISPATCH = 'approve_and_dispatch',
  START_EXECUTE = 'start_execute',
  COMPLETE = 'complete',
  SUSPEND = 'suspend',
  VERIFY_PASS = 'verify_pass',
  VERIFY_FAIL = 'verify_fail',
  RESUBMIT = 'resubmit',
  VOID = 'void',
}

// 事件中文名称映射
export const EVENT_LABELS: Record<string, string> = {
  [TicketEvent.SUBMIT]: '提交送审',
  [TicketEvent.APPROVE]: '审核通过',
  [TicketEvent.REJECT]: '驳回',
  [TicketEvent.APPROVE_AND_DISPATCH]: '审核通过并下达指令',
  [TicketEvent.START_EXECUTE]: '开始执行',
  [TicketEvent.COMPLETE]: '操作完成',
  [TicketEvent.SUSPEND]: '操作中止',
  [TicketEvent.VERIFY_PASS]: '校验通过',
  [TicketEvent.VERIFY_FAIL]: '校验失败',
  [TicketEvent.RESUBMIT]: '重新提交',
  [TicketEvent.VOID]: '作废',
};

// 状态中文名称映射
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

// 状态迁移定义
interface Transition {
  target: string;
  guard?: string;
  guardDescription?: string;
  action?: string;
  actionDescription?: string;
}

// 非法迁移时的错误消息模板
const ILLEGAL_TRANSITION_MSG = (currentStatus: string, event: string): string => {
  const fromLabel = STATUS_LABELS[currentStatus] || currentStatus;
  const eventLabel = EVENT_LABELS[event] || event;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  const allowedList = allowed
    ? allowed.map(e => EVENT_LABELS[e] || e).join('、')
    : '无';

  return `操作票当前状态为「${fromLabel}」，不允许执行「${eventLabel}」操作。` +
    `\n当前允许的操作：${allowedList}`;
};

// 明确允许的事件列表（用于生成友好提示）
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['submit', 'void'],
  PENDING_SUPERVISOR: ['approve', 'reject'],
  PENDING_APPROVER: ['approve', 'reject'],
  PENDING_DISPATCHER: ['approve_and_dispatch', 'reject'],
  PENDING_EXECUTE: ['start_execute', 'void'],
  EXECUTING: ['complete', 'suspend'],
  COMPLETED: ['verify_pass', 'verify_fail'],
  SUSPENDED: [],
  VOIDED: [],
  REJECTED: ['resubmit', 'void'],
};

const TRANSITIONS: Record<string, Record<string, Transition>> = {
  DRAFT: {
    [TicketEvent.SUBMIT]: {
      target: 'PENDING_SUPERVISOR',
      guard: 'checkRequiredFields',
      guardDescription: '所有必填字段（任务名称、操作人、监护人、至少1条操作内容）已填写',
      action: 'notifySupervisor',
      actionDescription: '向监护人推送审核待办',
    },
    [TicketEvent.VOID]: {
      target: 'VOIDED',
      guard: 'checkAllowedToVoid',
      guardDescription: '操作票尚未开始执行',
      action: 'recordVoidInfo',
      actionDescription: '记录作废信息',
    },
  },
  PENDING_SUPERVISOR: {
    [TicketEvent.APPROVE]: {
      target: 'PENDING_APPROVER',
      action: 'notifyApprover',
      actionDescription: '向批准人推送审核待办',
    },
    [TicketEvent.REJECT]: {
      target: 'REJECTED',
      action: 'notifyOperator',
      actionDescription: '通知操作人驳回结果',
    },
  },
  PENDING_APPROVER: {
    [TicketEvent.APPROVE]: {
      target: 'PENDING_DISPATCHER',
      action: 'notifyDispatcher',
      actionDescription: '向发令人推送审核待办',
    },
    [TicketEvent.REJECT]: {
      target: 'REJECTED',
      action: 'notifyOperator',
      actionDescription: '通知操作人驳回结果',
    },
  },
  PENDING_DISPATCHER: {
    [TicketEvent.APPROVE_AND_DISPATCH]: {
      target: 'PENDING_EXECUTE',
      guard: 'checkDispatcherCanDispatch',
      guardDescription: '发令人已审核签章',
      action: 'lockAndDispatch',
      actionDescription: '写入下令时间，锁定操作票所有信息',
    },
    [TicketEvent.REJECT]: {
      target: 'REJECTED',
      action: 'notifyOperator',
      actionDescription: '通知操作人驳回结果',
    },
  },
  PENDING_EXECUTE: {
    [TicketEvent.START_EXECUTE]: {
      target: 'EXECUTING',
      guard: 'checkOperatorIsAssigned',
      guardDescription: '操作人身份验证通过',
      action: 'startSync',
      actionDescription: '启动数据同步',
    },
    [TicketEvent.VOID]: {
      target: 'VOIDED',
      guard: 'checkAllowedToVoid',
      guardDescription: '操作票尚未开始执行',
      action: 'recordVoidInfo',
      actionDescription: '记录作废信息',
    },
  },
  EXECUTING: {
    [TicketEvent.COMPLETE]: {
      target: 'COMPLETED',
      action: 'triggerVerify',
      actionDescription: '触发数据校验流程',
    },
    [TicketEvent.SUSPEND]: {
      target: 'SUSPENDED',
      guard: 'checkSuspendRemark',
      guardDescription: '已填写中止备注',
      action: 'markUnexecuted',
      actionDescription: '标记未执行操作内容',
    },
  },
  COMPLETED: {
    [TicketEvent.VERIFY_PASS]: {
      target: 'COMPLETED',
      action: 'archive',
      actionDescription: '归档存储并写入归档时间',
    },
    [TicketEvent.VERIFY_FAIL]: {
      target: 'COMPLETED',
      action: 'markAnomaly',
      actionDescription: '标记异常数据项',
    },
  },
  REJECTED: {
    [TicketEvent.RESUBMIT]: {
      target: 'PENDING_SUPERVISOR',
      guard: 'checkRequiredFields',
      guardDescription: '已根据驳回意见修改必填信息',
      action: 'notifySupervisor',
      actionDescription: '重新向监护人推送审核待办',
    },
    [TicketEvent.VOID]: {
      target: 'VOIDED',
      guard: 'checkAllowedToVoid',
      guardDescription: '操作票尚未开始执行',
      action: 'recordVoidInfo',
      actionDescription: '记录作废信息',
    },
  },
};

@Injectable()
export class TicketStateMachine {
  /**
   * 获取当前状态下允许的事件列表（含中文标签）
   */
  getAllowedEvents(currentStatus: string): Array<{ event: string; label: string }> {
    const events = ALLOWED_TRANSITIONS[currentStatus];
    if (!events) return [];
    return events.map(e => ({ event: e, label: EVENT_LABELS[e] || e }));
  }

  /**
   * 严格校验状态迁移合法性，非法时抛出 BadRequestException
   */
  validateTransitionOrThrow(currentStatus: string, event: string): void {
    if (!this.validateTransition(currentStatus, event)) {
      throw new BadRequestException(ILLEGAL_TRANSITION_MSG(currentStatus, event));
    }
  }

  /**
   * 校验状态迁移是否合法（返回布尔值）
   */
  validateTransition(currentStatus: string, event: string): boolean {
    const transitions = TRANSITIONS[currentStatus];
    if (!transitions) return false;
    return event in transitions;
  }

  /**
   * 获取迁移后的目标状态
   */
  getTargetState(currentStatus: string, event: string): string | null {
    const transitions = TRANSITIONS[currentStatus];
    if (!transitions || !(event in transitions)) return null;
    return transitions[event].target;
  }

  /**
   * 获取迁移的守卫条件名称
   */
  getGuard(currentStatus: string, event: string): string | undefined {
    return TRANSITIONS[currentStatus]?.[event]?.guard;
  }

  /**
   * 获取守卫条件的中文描述
   */
  getGuardDescription(currentStatus: string, event: string): string | undefined {
    return TRANSITIONS[currentStatus]?.[event]?.guardDescription;
  }

  /**
   * 获取迁移的执行动作名称
   */
  getAction(currentStatus: string, event: string): string | undefined {
    return TRANSITIONS[currentStatus]?.[event]?.action;
  }

  /**
   * 获取迁移的中文描述（用于日志）
   */
  getTransitionDescription(currentStatus: string, event: string): string {
    const fromLabel = STATUS_LABELS[currentStatus] || currentStatus;
    const eventLabel = EVENT_LABELS[event] || event;
    const target = this.getTargetState(currentStatus, event);
    const toLabel = target ? STATUS_LABELS[target] || target : '未知';
    return `[${fromLabel}] → ${eventLabel} → [${toLabel}]`;
  }

  /**
   * 获取状态中文名
   */
  getStatusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }

  /**
   * 判断操作票是否处于可编辑状态
   */
  isEditable(status: string): boolean {
    return status === 'DRAFT' || status === 'REJECTED';
  }

  /**
   * 判断操作票是否已锁定（待执行起不可编辑）
   */
  isLocked(status: string): boolean {
    const lockedStates = ['PENDING_EXECUTE', 'EXECUTING', 'SUSPENDED', 'COMPLETED', 'VOIDED'];
    return lockedStates.includes(status);
  }
}
