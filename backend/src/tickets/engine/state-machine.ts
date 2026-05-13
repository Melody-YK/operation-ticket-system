import { Injectable } from '@nestjs/common';

// 操作票事件枚举
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

// 状态迁移表
const TRANSITIONS: Record<string, Record<string, { target: string; guard?: string; action?: string }>> = {
  DRAFT: {
    [TicketEvent.SUBMIT]: { target: 'PENDING_SUPERVISOR', guard: 'checkRequiredFields', action: 'notifySupervisor' },
    [TicketEvent.VOID]: { target: 'VOIDED', guard: 'checkNotExecuted', action: 'recordVoidInfo' },
  },
  PENDING_SUPERVISOR: {
    [TicketEvent.APPROVE]: { target: 'PENDING_APPROVER', action: 'notifyApprover' },
    [TicketEvent.REJECT]: { target: 'REJECTED', action: 'notifyOperator' },
  },
  PENDING_APPROVER: {
    [TicketEvent.APPROVE]: { target: 'PENDING_DISPATCHER', action: 'notifyDispatcher' },
    [TicketEvent.REJECT]: { target: 'REJECTED', action: 'notifyOperator' },
  },
  PENDING_DISPATCHER: {
    [TicketEvent.APPROVE_AND_DISPATCH]: { target: 'PENDING_EXECUTE', action: 'lockAndDispatch' },
    [TicketEvent.REJECT]: { target: 'REJECTED', action: 'notifyOperator' },
  },
  PENDING_EXECUTE: {
    [TicketEvent.START_EXECUTE]: { target: 'EXECUTING', action: 'startSync' },
    [TicketEvent.VOID]: { target: 'VOIDED', action: 'recordVoidInfo' },
  },
  EXECUTING: {
    [TicketEvent.COMPLETE]: { target: 'COMPLETED', action: 'triggerVerify' },
    [TicketEvent.SUSPEND]: { target: 'SUSPENDED', action: 'markUnexecuted' },
  },
  COMPLETED: {
    [TicketEvent.VERIFY_PASS]: { target: 'COMPLETED', action: 'archive' },
    [TicketEvent.VERIFY_FAIL]: { target: 'COMPLETED', action: 'markAnomaly' },
  },
  REJECTED: {
    [TicketEvent.RESUBMIT]: { target: 'PENDING_SUPERVISOR', action: 'notifySupervisor' },
    [TicketEvent.VOID]: { target: 'VOIDED', action: 'recordVoidInfo' },
  },
};

@Injectable()
export class TicketStateMachine {
  getAllowedEvents(currentStatus: string): string[] {
    const transitions = TRANSITIONS[currentStatus];
    if (!transitions) return [];
    return Object.keys(transitions);
  }

  validateTransition(currentStatus: string, event: string): boolean {
    const transitions = TRANSITIONS[currentStatus];
    if (!transitions) return false;
    return event in transitions;
  }

  getTargetState(currentStatus: string, event: string): string | null {
    const transitions = TRANSITIONS[currentStatus];
    if (!transitions || !(event in transitions)) return null;
    return transitions[event].target;
  }

  getGuard(currentStatus: string, event: string): string | undefined {
    return TRANSITIONS[currentStatus]?.[event]?.guard;
  }

  getAction(currentStatus: string, event: string): string | undefined {
    return TRANSITIONS[currentStatus]?.[event]?.action;
  }
}
