import { TicketStateMachine, TicketEvent } from './state-machine';

describe('TicketStateMachine', () => {
  let machine: TicketStateMachine;

  beforeEach(() => {
    machine = new TicketStateMachine();
  });

  // ========== 基础功能 ==========

  describe('validateTransition', () => {
    it('should return true for valid transitions', () => {
      expect(machine.validateTransition('DRAFT', TicketEvent.SUBMIT)).toBe(true);
      expect(machine.validateTransition('DRAFT', TicketEvent.VOID)).toBe(true);
      expect(machine.validateTransition('PENDING_SUPERVISOR', TicketEvent.APPROVE)).toBe(true);
      expect(machine.validateTransition('PENDING_SUPERVISOR', TicketEvent.REJECT)).toBe(true);
      expect(machine.validateTransition('PENDING_APPROVER', TicketEvent.APPROVE)).toBe(true);
      expect(machine.validateTransition('PENDING_APPROVER', TicketEvent.REJECT)).toBe(true);
      expect(machine.validateTransition('PENDING_DISPATCHER', TicketEvent.APPROVE_AND_DISPATCH)).toBe(true);
      expect(machine.validateTransition('PENDING_DISPATCHER', TicketEvent.REJECT)).toBe(true);
      expect(machine.validateTransition('PENDING_EXECUTE', TicketEvent.START_EXECUTE)).toBe(true);
      expect(machine.validateTransition('PENDING_EXECUTE', TicketEvent.VOID)).toBe(true);
      expect(machine.validateTransition('EXECUTING', TicketEvent.COMPLETE)).toBe(true);
      expect(machine.validateTransition('EXECUTING', TicketEvent.SUSPEND)).toBe(true);
      expect(machine.validateTransition('COMPLETED', TicketEvent.VERIFY_PASS)).toBe(true);
      expect(machine.validateTransition('COMPLETED', TicketEvent.VERIFY_FAIL)).toBe(true);
      expect(machine.validateTransition('REJECTED', TicketEvent.RESUBMIT)).toBe(true);
      expect(machine.validateTransition('REJECTED', TicketEvent.VOID)).toBe(true);
    });

    it('should return false for illegal transitions', () => {
      // Draft cannot be approved directly
      expect(machine.validateTransition('DRAFT', TicketEvent.APPROVE)).toBe(false);
      // Cannot submit from executing
      expect(machine.validateTransition('EXECUTING', TicketEvent.SUBMIT)).toBe(false);
      // Cannot start execute from draft
      expect(machine.validateTransition('DRAFT', TicketEvent.START_EXECUTE)).toBe(false);
      // Cannot verify before complete
      expect(machine.validateTransition('EXECUTING', TicketEvent.VERIFY_PASS)).toBe(false);
      // Completed cannot go back to executing
      expect(machine.validateTransition('COMPLETED', TicketEvent.START_EXECUTE)).toBe(false);
      // Suspended has no valid events
      expect(machine.validateTransition('SUSPENDED', TicketEvent.SUBMIT)).toBe(false);
      expect(machine.validateTransition('VOIDED', TicketEvent.SUBMIT)).toBe(false);
    });

    it('should return false for unknown status', () => {
      expect(machine.validateTransition('UNKNOWN', TicketEvent.SUBMIT)).toBe(false);
    });

    it('should return false for unknown event', () => {
      expect(machine.validateTransition('DRAFT', 'unknown_event' as any)).toBe(false);
    });
  });

  describe('validateTransitionOrThrow', () => {
    it('should not throw for valid transition', () => {
      expect(() => machine.validateTransitionOrThrow('DRAFT', TicketEvent.SUBMIT)).not.toThrow();
    });

    it('should throw BadRequestException for illegal transition', () => {
      expect(() => machine.validateTransitionOrThrow('DRAFT', TicketEvent.APPROVE)).toThrow();
    });

    it('should include current status and event in error message', () => {
      try {
        machine.validateTransitionOrThrow('DRAFT', TicketEvent.APPROVE);
        fail('should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('建立');
        expect(e.message).toContain('审核通过');
        expect(e.message).toContain('提交送审');
        expect(e.message).toContain('作废');
      }
    });
  });

  describe('getTargetState', () => {
    it('should return correct target status', () => {
      expect(machine.getTargetState('DRAFT', TicketEvent.SUBMIT)).toBe('PENDING_SUPERVISOR');
      expect(machine.getTargetState('DRAFT', TicketEvent.VOID)).toBe('VOIDED');
      expect(machine.getTargetState('PENDING_SUPERVISOR', TicketEvent.APPROVE)).toBe('PENDING_APPROVER');
      expect(machine.getTargetState('PENDING_SUPERVISOR', TicketEvent.REJECT)).toBe('REJECTED');
      expect(machine.getTargetState('PENDING_APPROVER', TicketEvent.APPROVE)).toBe('PENDING_DISPATCHER');
      expect(machine.getTargetState('PENDING_APPROVER', TicketEvent.REJECT)).toBe('REJECTED');
      expect(machine.getTargetState('PENDING_DISPATCHER', TicketEvent.APPROVE_AND_DISPATCH)).toBe('PENDING_EXECUTE');
      expect(machine.getTargetState('PENDING_DISPATCHER', TicketEvent.REJECT)).toBe('REJECTED');
      expect(machine.getTargetState('PENDING_EXECUTE', TicketEvent.START_EXECUTE)).toBe('EXECUTING');
      expect(machine.getTargetState('PENDING_EXECUTE', TicketEvent.VOID)).toBe('VOIDED');
      expect(machine.getTargetState('EXECUTING', TicketEvent.COMPLETE)).toBe('COMPLETED');
      expect(machine.getTargetState('EXECUTING', TicketEvent.SUSPEND)).toBe('SUSPENDED');
    });

    it('should return null for illegal transition', () => {
      expect(machine.getTargetState('DRAFT', TicketEvent.APPROVE)).toBeNull();
      expect(machine.getTargetState('SUSPENDED', TicketEvent.SUBMIT)).toBeNull();
    });
  });

  describe('getAllowedEvents', () => {
    it('should return correct allowed events for DRAFT', () => {
      const events = machine.getAllowedEvents('DRAFT');
      expect(events).toHaveLength(2);
      expect(events.map(e => e.event)).toContain('submit');
      expect(events.map(e => e.event)).toContain('void');
      expect(events.map(e => e.label)).toContain('提交送审');
    });

    it('should return empty array for SUSPENDED', () => {
      const events = machine.getAllowedEvents('SUSPENDED');
      expect(events).toEqual([]);
    });

    it('should return empty array for unknown status', () => {
      const events = machine.getAllowedEvents('UNKNOWN');
      expect(events).toEqual([]);
    });
  });

  describe('isEditable', () => {
    it('should return true for DRAFT and REJECTED', () => {
      expect(machine.isEditable('DRAFT')).toBe(true);
      expect(machine.isEditable('REJECTED')).toBe(true);
    });

    it('should return false for non-editable states', () => {
      expect(machine.isEditable('PENDING_SUPERVISOR')).toBe(false);
      expect(machine.isEditable('PENDING_APPROVER')).toBe(false);
      expect(machine.isEditable('PENDING_DISPATCHER')).toBe(false);
      expect(machine.isEditable('PENDING_EXECUTE')).toBe(false);
      expect(machine.isEditable('EXECUTING')).toBe(false);
      expect(machine.isEditable('COMPLETED')).toBe(false);
      expect(machine.isEditable('SUSPENDED')).toBe(false);
      expect(machine.isEditable('VOIDED')).toBe(false);
    });
  });

  describe('isLocked', () => {
    it('should return true for locked states', () => {
      expect(machine.isLocked('PENDING_EXECUTE')).toBe(true);
      expect(machine.isLocked('EXECUTING')).toBe(true);
      expect(machine.isLocked('SUSPENDED')).toBe(true);
      expect(machine.isLocked('COMPLETED')).toBe(true);
      expect(machine.isLocked('VOIDED')).toBe(true);
    });

    it('should return false for unlocked states', () => {
      expect(machine.isLocked('DRAFT')).toBe(false);
      expect(machine.isLocked('REJECTED')).toBe(false);
      expect(machine.isLocked('PENDING_SUPERVISOR')).toBe(false);
      expect(machine.isLocked('PENDING_APPROVER')).toBe(false);
      expect(machine.isLocked('PENDING_DISPATCHER')).toBe(false);
    });
  });

  describe('getStatusLabel', () => {
    it('should return Chinese labels for known statuses', () => {
      expect(machine.getStatusLabel('DRAFT')).toBe('建立');
      expect(machine.getStatusLabel('PENDING_SUPERVISOR')).toBe('待审核（监护人）');
      expect(machine.getStatusLabel('PENDING_APPROVER')).toBe('待审核（批准人）');
      expect(machine.getStatusLabel('PENDING_DISPATCHER')).toBe('待审核（发令人）');
      expect(machine.getStatusLabel('PENDING_EXECUTE')).toBe('待执行');
      expect(machine.getStatusLabel('EXECUTING')).toBe('执行中');
      expect(machine.getStatusLabel('COMPLETED')).toBe('已完成');
      expect(machine.getStatusLabel('SUSPENDED')).toBe('中止');
      expect(machine.getStatusLabel('VOIDED')).toBe('作废');
      expect(machine.getStatusLabel('REJECTED')).toBe('建立（驳回）');
    });

    it('should return the input for unknown status', () => {
      expect(machine.getStatusLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getTransitionDescription', () => {
    it('should return descriptive Chinese text', () => {
      const desc = machine.getTransitionDescription('DRAFT', TicketEvent.SUBMIT);
      expect(desc).toContain('建立');
      expect(desc).toContain('提交送审');
      expect(desc).toContain('待审核（监护人）');
    });

    it('should handle illegal transition gracefully', () => {
      // Returns description based on lookup even if illegal
      const desc = machine.getTransitionDescription('DRAFT', TicketEvent.APPROVE);
      expect(desc).toContain('建立');
    });
  });

  // ========== 全生命周期验证 ==========

  describe('full lifecycle transitions', () => {
    it('should follow the happy path: DRAFT → COMPLETED → verify_pass', () => {
      let status = 'DRAFT';
      expect(machine.isEditable(status)).toBe(true);
      expect(machine.isLocked(status)).toBe(false);

      status = machine.getTargetState(status, TicketEvent.SUBMIT)!;
      expect(status).toBe('PENDING_SUPERVISOR');

      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      expect(status).toBe('PENDING_APPROVER');

      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      expect(status).toBe('PENDING_DISPATCHER');

      status = machine.getTargetState(status, TicketEvent.APPROVE_AND_DISPATCH)!;
      expect(status).toBe('PENDING_EXECUTE');
      expect(machine.isLocked(status)).toBe(true);

      status = machine.getTargetState(status, TicketEvent.START_EXECUTE)!;
      expect(status).toBe('EXECUTING');

      status = machine.getTargetState(status, TicketEvent.COMPLETE)!;
      expect(status).toBe('COMPLETED');

      const verifyStatus = machine.getTargetState(status, TicketEvent.VERIFY_PASS)!;
      expect(verifyStatus).toBe('COMPLETED');
    });

    it('should handle rejection at supervisor level', () => {
      let status = 'DRAFT';
      status = machine.getTargetState(status, TicketEvent.SUBMIT)!;
      expect(status).toBe('PENDING_SUPERVISOR');

      status = machine.getTargetState(status, TicketEvent.REJECT)!;
      expect(status).toBe('REJECTED');
      expect(machine.isEditable(status)).toBe(true);

      // resubmit goes back to PENDING_SUPERVISOR
      status = machine.getTargetState(status, TicketEvent.RESUBMIT)!;
      expect(status).toBe('PENDING_SUPERVISOR');
    });

    it('should handle rejection at approver level', () => {
      let status = machine.getTargetState('DRAFT', TicketEvent.SUBMIT)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      expect(status).toBe('PENDING_APPROVER');

      status = machine.getTargetState(status, TicketEvent.REJECT)!;
      expect(status).toBe('REJECTED');
    });

    it('should handle rejection at dispatcher level', () => {
      let status = machine.getTargetState('DRAFT', TicketEvent.SUBMIT)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      expect(status).toBe('PENDING_DISPATCHER');

      status = machine.getTargetState(status, TicketEvent.REJECT)!;
      expect(status).toBe('REJECTED');
    });

    it('should handle void from DRAFT', () => {
      const status = machine.getTargetState('DRAFT', TicketEvent.VOID)!;
      expect(status).toBe('VOIDED');
      expect(machine.isLocked(status)).toBe(true);
    });

    it('should handle void from PENDING_EXECUTE', () => {
      let status = machine.getTargetState('DRAFT', TicketEvent.SUBMIT)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE_AND_DISPATCH)!;
      expect(status).toBe('PENDING_EXECUTE');

      status = machine.getTargetState(status, TicketEvent.VOID)!;
      expect(status).toBe('VOIDED');
    });

    it('should handle suspend during execution', () => {
      let status = machine.getTargetState('DRAFT', TicketEvent.SUBMIT)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE_AND_DISPATCH)!;
      status = machine.getTargetState(status, TicketEvent.START_EXECUTE)!;
      expect(status).toBe('EXECUTING');

      status = machine.getTargetState(status, TicketEvent.SUSPEND)!;
      expect(status).toBe('SUSPENDED');
    });

    it('should handle verify_fail after completion', () => {
      let status = machine.getTargetState('DRAFT', TicketEvent.SUBMIT)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE)!;
      status = machine.getTargetState(status, TicketEvent.APPROVE_AND_DISPATCH)!;
      status = machine.getTargetState(status, TicketEvent.START_EXECUTE)!;
      status = machine.getTargetState(status, TicketEvent.COMPLETE)!;
      expect(status).toBe('COMPLETED');

      // verify_fail stays in COMPLETED
      const failStatus = machine.getTargetState(status, TicketEvent.VERIFY_FAIL)!;
      expect(failStatus).toBe('COMPLETED');
    });
  });
});
