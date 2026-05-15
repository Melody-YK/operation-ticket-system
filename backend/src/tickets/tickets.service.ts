import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketStateMachine } from './engine/state-machine';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { OperationItemDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private stateMachine: TicketStateMachine,
  ) {}

  // ============================
  // 工具方法
  // ============================

  private async generateTicketNo(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `OP-${today}-`;

    const lastTicket = await this.prisma.operationTicket.findFirst({
      where: { ticketId: { startsWith: prefix } },
      orderBy: { ticketId: 'desc' },
    });

    if (!lastTicket) return `${prefix}00001`;
    const lastSeq = parseInt(lastTicket.ticketId.slice(-5), 10);
    return `${prefix}${String(lastSeq + 1).padStart(5, '0')}`;
  }

  /**
   * 写操作日志（统一入口）
   */
  private async writeLog(params: {
    ticketId: string;
    operatorId: string;
    actionNode: string;
    detail: string;
    result?: string;
    previousStatus?: string;
    newStatus?: string;
  }) {
    const { ticketId, operatorId, actionNode, detail, result, previousStatus, newStatus } = params;
    await this.prisma.operationLog.create({
      data: {
        ticketId,
        operatorId,
        actionNode,
        actionDetail: JSON.stringify({
          message: detail,
          previousStatus,
          newStatus,
          timestamp: new Date().toISOString(),
        }),
        result: result || 'success',
      },
    });
  }

  /**
   * 创建待办（统一入口）
   */
  private async createTodo(params: {
    userId: string;
    ticketId: string;
    todoType: string;
    title: string;
    message: string;
  }) {
    await this.prisma.todo.create({ data: params });
  }

  // ============================
  // CRUD
  // ============================

  async create(dto: CreateTicketDto, userId: string) {
    const ticketNo = await this.generateTicketNo();

    const ticket = await this.prisma.operationTicket.create({
      data: {
        ticketId: ticketNo,
        taskName: dto.taskName,
        operatorId: userId,
        supervisorId: dto.supervisorId,
        approverId: dto.approverId,
        dispatcherId: dto.dispatcherId,
        basicInfo: (dto.basicInfo as any) || {},
        workTicketNo: dto.workTicketNo,
        items: dto.items
          ? {
              create: dto.items.map((item: OperationItemDto, index: number) => ({
                itemId: `${ticketNo}-${String(index + 1).padStart(3, '0')}`,
                stepContent: item.stepContent,
                sequence: index + 1,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    await this.writeLog({
      ticketId: ticketNo,
      operatorId: userId,
      actionNode: 'create',
      detail: '创建操作票（DRAFT）',
      newStatus: 'DRAFT',
    });

    return ticket;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    operatorId?: string;
    keyword?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 20, status, operatorId, keyword, startDate, endDate } = params;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      const statusList = status.split(',').filter(Boolean);
      if (statusList.length === 1) {
        where.status = statusList[0];
      } else {
        where.status = { in: statusList };
      }
    }
    if (operatorId) where.operatorId = operatorId;
    if (keyword) {
      where.OR = [
        { ticketId: { contains: keyword } },
        { taskName: { contains: keyword } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.operationTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: { orderBy: { sequence: 'asc' } } },
      }),
      this.prisma.operationTicket.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.operationTicket.findUnique({
      where: { ticketId: id },
      include: {
        items: { orderBy: { sequence: 'asc' } },
        hazards: true,
        tools: true,
        logs: { orderBy: { actionTime: 'desc' } },
        workTicketInfo: true,
        copies: true,
      },
    });
    if (!ticket) throw new NotFoundException('操作票不存在');
    return ticket;
  }

  /**
   * 更新操作票（仅 DRAFT / REJECTED 状态可编辑）
   */
  async update(id: string, dto: UpdateTicketDto, userId: string) {
    const ticket = await this.findOne(id);

    // 锁定防护：使用状态机判断是否可编辑
    if (!this.stateMachine.isEditable(ticket.status)) {
      throw new BadRequestException(
        `操作票当前状态为「${this.stateMachine.getStatusLabel(ticket.status)}」，不允许编辑。` +
        `仅「建立」或「建立（驳回）」状态可编辑。`
      );
    }

    const updateData: any = {};
    if (dto.taskName !== undefined) updateData.taskName = dto.taskName;
    if (dto.basicInfo !== undefined) updateData.basicInfo = dto.basicInfo as any;
    if (dto.workTicketNo !== undefined) updateData.workTicketNo = dto.workTicketNo;
    if (dto.remarks !== undefined) updateData.remarks = dto.remarks;

    // 构建变更描述（仅记录实际有变化的内容）
    // 注意：数据库中的空值可能是 null / undefined / ''，统一标准化后再比较
    const normalize = (v: any) => (v === null || v === undefined ? '' : v);
    const changes: string[] = [];

    if (dto.taskName !== undefined && normalize(dto.taskName) !== normalize(ticket.taskName)) {
      changes.push(`任务名称: "${ticket.taskName || '-'}" → "${dto.taskName}"`);
    }

    if (dto.basicInfo !== undefined) {
      const oldBasic = ticket.basicInfo || {};
      const newBasic = dto.basicInfo as any;
      if (newBasic.station !== undefined && normalize(newBasic.station) !== normalize(oldBasic.station)) {
        changes.push(`变电站: "${oldBasic.station || '-'}" → "${newBasic.station}"`);
      }
      if (newBasic.workType !== undefined && normalize(newBasic.workType) !== normalize(oldBasic.workType)) {
        changes.push(`作业类型: "${oldBasic.workType || '-'}" → "${newBasic.workType}"`);
      }
    }

    if (dto.workTicketNo !== undefined && normalize(dto.workTicketNo) !== normalize(ticket.workTicketNo)) {
      changes.push(`工作票编号: "${ticket.workTicketNo || '-'}" → "${dto.workTicketNo}"`);
    }

    // 检查操作项是否有变化
    if (dto.items) {
      const oldItems = ticket.items || [];
      const oldSteps = oldItems.map((i: any) => normalize(i.stepContent));
      const newSteps = dto.items.map((i: OperationItemDto) => normalize(i.stepContent));

      const oldSummary = oldSteps.map((s: string, idx: number) => `${idx + 1}. ${s}`).join(' | ');
      const newSummary = newSteps.map((s: string, idx: number) => `${idx + 1}. ${s}`).join(' | ');

      if (oldSummary !== newSummary) {
        changes.push(`操作步骤已更新（${oldItems.length} 项 → ${dto.items.length} 项）`);
      }
    }

    // 无任何变化则不执行更新
    if (changes.length === 0) {
      return ticket;
    }

    await this.prisma.operationTicket.update({
      where: { ticketId: id },
      data: updateData,
    });

    if (dto.items) {
      await this.prisma.operationItem.deleteMany({ where: { ticketId: id } });
      await this.prisma.operationItem.createMany({
        data: dto.items.map((item: OperationItemDto, index: number) => ({
          itemId: `${id}-${String(index + 1).padStart(3, '0')}`,
          ticketId: id,
          stepContent: item.stepContent,
          sequence: index + 1,
        })),
      });
    }

    await this.writeLog({
      ticketId: id,
      operatorId: userId,
      actionNode: 'update',
      detail: `更新操作票信息: ${changes.join('；')}`,
      previousStatus: ticket.status,
      newStatus: ticket.status,
    });

    return this.findOne(id);
  }

  // ============================
  // 状态迁移核心
  // ============================

  /**
   * 执行通用的状态迁移 + 待办 + 日志
   */
  private async transition(params: {
    id: string;
    userId: string;
    event: string;
    comment?: string;
    extraUpdate?: any;
  }) {
    const { id, userId, event, comment, extraUpdate } = params;
    const ticket = await this.findOne(id);
    const previousStatus = ticket.status;

    // 1. 校验迁移合法性（非法时抛出友好异常）
    this.stateMachine.validateTransitionOrThrow(previousStatus, event);

    // 2. 获取目标状态
    const targetStatus = this.stateMachine.getTargetState(previousStatus, event);
    if (!targetStatus) {
      throw new BadRequestException('状态迁移目标未定义');
    }

    // 3. 执行迁移
    const updateData: any = { status: targetStatus, ...extraUpdate };
    const updated = await this.prisma.operationTicket.update({
      where: { ticketId: id },
      data: updateData,
    });

    // 4. 创建待办（根据目标状态）
    await this.createTodoForTransition(ticket, previousStatus, event, targetStatus, comment);

    // 5. 记录日志（含前状态→事件→后状态的完整描述）
    const transitionDesc = this.stateMachine.getTransitionDescription(previousStatus, event);
    await this.writeLog({
      ticketId: id,
      operatorId: userId,
      actionNode: event,
      detail: `${transitionDesc}${comment ? ` | 意见：${comment}` : ''}`,
      previousStatus,
      newStatus: targetStatus,
    });

    return updated;
  }

  /**
   * 根据状态迁移创建待办
   */
  private async createTodoForTransition(
    ticket: any,
    previousStatus: string,
    event: string,
    targetStatus: string,
    comment?: string,
  ) {
    const target = targetStatus;
    const name = ticket.taskName;

    if (target === 'PENDING_SUPERVISOR') {
      await this.createTodo({
        userId: ticket.supervisorId,
        ticketId: ticket.ticketId,
        todoType: 'review',
        title: `审核操作票：${name}`,
        message: '操作票已提交送审，请监护人审核',
      });
    } else if (target === 'PENDING_APPROVER' && ticket.approverId) {
      await this.createTodo({
        userId: ticket.approverId,
        ticketId: ticket.ticketId,
        todoType: 'review',
        title: `审核操作票：${name}`,
        message: '监护人已审核通过，请批准人审核',
      });
    } else if (target === 'PENDING_DISPATCHER' && ticket.dispatcherId) {
      await this.createTodo({
        userId: ticket.dispatcherId,
        ticketId: ticket.ticketId,
        todoType: 'review',
        title: `审核操作票：${name}`,
        message: '批准人已审核通过，请发令人审核',
      });
    } else if (target === 'PENDING_EXECUTE') {
      await this.createTodo({
        userId: ticket.operatorId,
        ticketId: ticket.ticketId,
        todoType: 'execute',
        title: `执行操作票：${name}`,
        message: '指令已下达，请执行操作',
      });
    } else if (target === 'REJECTED') {
      await this.createTodo({
        userId: ticket.operatorId,
        ticketId: ticket.ticketId,
        todoType: 'review',
        title: `操作票被驳回：${name}`,
        message: comment
          ? `驳回意见：${comment}`
          : `操作票已被${this.stateMachine.getStatusLabel(previousStatus)}驳回，请修改后重新提交`,
      });
    }
  }

  // ============================
  // 公开 API 方法
  // ============================

  /**
   * 提交送审：DRAFT → PENDING_SUPERVISOR
   */
  async submit(id: string, userId: string) {
    return this.transition({ id, userId, event: 'submit' });
  }

  /**
   * 审核操作票：三级审核通用
   * action = 'approve' | 'reject'
   */
  async review(id: string, userId: string, action: string, comment?: string) {
    const ticket = await this.findOne(id);
    const currentStatus = ticket.status;

    const eventMap: Record<string, string> = {
      'PENDING_SUPERVISOR-approve': 'approve',
      'PENDING_SUPERVISOR-reject': 'reject',
      'PENDING_APPROVER-approve': 'approve',
      'PENDING_APPROVER-reject': 'reject',
      'PENDING_DISPATCHER-approve': 'approve_and_dispatch',
      'PENDING_DISPATCHER-reject': 'reject',
    };

    const event = eventMap[`${currentStatus}-${action}`];
    if (!event) {
      throw new BadRequestException(
        `当前状态「${this.stateMachine.getStatusLabel(currentStatus)}」不支持审核操作「${action}」`
      );
    }

    // 发令人审核通过时写入下令时间
    const extraUpdate: any = {};
    if (action === 'approve' && currentStatus === 'PENDING_DISPATCHER') {
      extraUpdate.dispatchTime = new Date();
    }

    return this.transition({
      id,
      userId,
      event,
      comment,
      extraUpdate: Object.keys(extraUpdate).length > 0 ? extraUpdate : undefined,
    });
  }

  /**
   * 下达操作指令（独立端点）：PENDING_DISPATCHER → PENDING_EXECUTE
   */
  async dispatch(id: string, userId: string) {
    const ticket = await this.findOne(id);
    const currentStatus = ticket.status;

    if (currentStatus !== 'PENDING_DISPATCHER') {
      throw new BadRequestException(
        `当前状态为「${this.stateMachine.getStatusLabel(currentStatus)}」，` +
        `仅「待审核（发令人）」状态可下达指令。请先完成审核。`
      );
    }

    return this.transition({
      id,
      userId,
      event: 'approve_and_dispatch',
      extraUpdate: { dispatchTime: new Date() },
    });
  }

  /**
   * 重新提交（驳回后）：REJECTED → PENDING_SUPERVISOR
   */
  async resubmit(id: string, userId: string) {
    const ticket = await this.findOne(id);

    if (ticket.operatorId !== userId) {
      throw new BadRequestException('只有操作票的操作人可以重新提交');
    }

    return this.transition({ id, userId, event: 'resubmit' });
  }

  /**
   * 获取操作票状态信息（用于前端展示）
   */
  async getStatusInfo(id: string) {
    const ticket = await this.findOne(id);
    const allowedEvents = this.stateMachine.getAllowedEvents(ticket.status);

    return {
      ticketId: ticket.ticketId,
      currentStatus: ticket.status,
      currentStatusLabel: this.stateMachine.getStatusLabel(ticket.status),
      isEditable: this.stateMachine.isEditable(ticket.status),
      isLocked: this.stateMachine.isLocked(ticket.status),
      dispatchTime: ticket.dispatchTime,
      allowedActions: allowedEvents,
    };
  }

  // ============================
  // 执行模块
  // ============================

  /**
   * 开始执行：PENDING_EXECUTE → EXECUTING
   */
  async startExecute(id: string, userId: string) {
    return this.transition({ id, userId, event: 'start_execute' });
  }

  /**
   * 更新操作项状态（逐条执行/跳过）
   */
  async updateItemStatus(id: string, itemId: string, userId: string, action: string) {
    const ticket = await this.findOne(id);

    if (ticket.status !== 'EXECUTING' && ticket.status !== 'PENDING_EXECUTE') {
      throw new BadRequestException(
        `当前状态为「${this.stateMachine.getStatusLabel(ticket.status)}」，不允许执行操作`
      );
    }

    // 查找操作项
    const item = ticket.items?.find((i: any) => i.itemId === itemId);
    if (!item) throw new BadRequestException('操作项不存在');

    // 校验操作人
    if (ticket.operatorId !== userId) {
      throw new BadRequestException('只有操作人可以执行操作');
    }

    let targetStatus: string;
    if (action === 'execute') {
      targetStatus = 'COMPLETED';
    } else if (action === 'skip') {
      targetStatus = 'SKIPPED';
    } else {
      throw new BadRequestException(`不支持的操作：${action}`);
    }

    await this.prisma.operationItem.update({
      where: { itemId },
      data: {
        executeStatus: targetStatus as any,
        executeResult: action === 'skip' ? '已跳过' : '执行完成',
        remarks: `由 ${userId} 于 ${new Date().toLocaleString('zh-CN')} 执行`,
      },
    });

    await this.writeLog({
      ticketId: id,
      operatorId: userId,
      actionNode: 'execute_item',
      detail: `操作项 ${item.sequence}: ${item.stepContent} → ${targetStatus === 'COMPLETED' ? '执行完成' : '已跳过'}`,
    });

    return this.findOne(id);
  }

  /**
   * 完成执行：EXECUTING → COMPLETED
   */
  async completeExecution(id: string, userId: string) {
    const ticket = await this.findOne(id);

    // 检查是否所有必执行项已完成
    const incompleteItems = ticket.items?.filter(
      (i: any) => i.executeStatus === 'PENDING' || i.executeStatus === 'EXECUTING'
    );
    if (incompleteItems?.length > 0) {
      throw new BadRequestException(
        `还有 ${incompleteItems.length} 项操作未执行，请先完成所有操作`
      );
    }

    return this.transition({ id, userId, event: 'complete' });
  }

  /**
   * 数据校验：COMPLETED → verify_pass / verify_fail
   */
  async verify(id: string, userId: string, action: string, comment?: string) {
    if (action !== 'verify_pass' && action !== 'verify_fail') {
      throw new BadRequestException('校验操作仅支持 verify_pass / verify_fail');
    }

    const event = action === 'verify_pass' ? 'verify_pass' : 'verify_fail';
    return this.transition({ id, userId, event, comment });
  }

  /**
   * 上传现场数据
   */
  async uploadMedia(id: string, userId: string, mediaData: any) {
    const ticket = await this.findOne(id);
    if (ticket.status !== 'EXECUTING') {
      throw new BadRequestException('仅执行中的操作票可上传现场数据');
    }

    const updated = await this.prisma.operationTicket.update({
      where: { ticketId: id },
      data: { mediaData: mediaData as any },
    });

    await this.writeLog({
      ticketId: id,
      operatorId: userId,
      actionNode: 'upload_media',
      detail: '上传现场数据',
    });

    return updated;
  }

  /**
   * 获取操作时间线
   */
  async getTimeline(id: string) {
    const ticket = await this.prisma.operationTicket.findUnique({
      where: { ticketId: id },
      include: {
        logs: { orderBy: { actionTime: 'asc' } },
        items: { orderBy: { sequence: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('操作票不存在');

    return {
      ticketId: ticket.ticketId,
      status: ticket.status,
      logs: ticket.logs.map((log: any) => ({
        logId: log.logId,
        actionNode: log.actionNode,
        operatorId: log.operatorId,
        actionTime: log.actionTime,
        actionDetail: log.actionDetail,
        result: log.result,
      })),
      items: ticket.items.map((item: any) => ({
        itemId: item.itemId,
        sequence: item.sequence,
        stepContent: item.stepContent,
        executeStatus: item.executeStatus,
        executeResult: item.executeResult,
      })),
    };
  }
}
