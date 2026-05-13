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

  /**
   * 生成操作票票号：OP-YYYYMMDD-XXXXX
   */
  private async generateTicketNo(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `OP-${today}-`;

    const lastTicket = await this.prisma.operationTicket.findFirst({
      where: { ticketId: { startsWith: prefix } },
      orderBy: { ticketId: 'desc' },
    });

    if (!lastTicket) {
      return `${prefix}00001`;
    }

    const lastSeq = parseInt(lastTicket.ticketId.slice(-5), 10);
    const nextSeq = lastSeq + 1;
    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

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
        items: dto.items ? {
          create: dto.items.map((item: OperationItemDto, index: number) => ({
            itemId: `${ticketNo}-${String(index + 1).padStart(3, '0')}`,
            stepContent: item.stepContent,
            sequence: index + 1,
          })),
        } : undefined,
      },
      include: { items: true },
    });

    await this.prisma.operationLog.create({
      data: {
        ticketId: ticketNo,
        operatorId: userId,
        actionNode: 'create',
        actionDetail: '创建操作票',
        result: 'success',
      },
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

    if (status) where.status = status;
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

    return {
      data,
      pagination: { page, limit, total },
    };
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
      },
    });
    if (!ticket) {
      throw new NotFoundException('操作票不存在');
    }
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, userId: string) {
    const ticket = await this.findOne(id);

    // 只有 DRAFT / REJECTED 状态可编辑
    if (ticket.status !== 'DRAFT' && ticket.status !== 'REJECTED') {
      throw new BadRequestException('当前状态不允许编辑操作票');
    }

    const updateData: any = {};
    if (dto.taskName !== undefined) updateData.taskName = dto.taskName;
    if (dto.basicInfo !== undefined) updateData.basicInfo = dto.basicInfo as any;
    if (dto.workTicketNo !== undefined) updateData.workTicketNo = dto.workTicketNo;
    if (dto.remarks !== undefined) updateData.remarks = dto.remarks;

    await this.prisma.operationTicket.update({
      where: { ticketId: id },
      data: updateData,
    });

    // 更新操作项（先删后插）
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

    return this.findOne(id);
  }

  /**
   * 提交送审（DRAFT → PENDING_SUPERVISOR）
   */
  async submit(id: string, userId: string) {
    const ticket = await this.findOne(id);

    if (!this.stateMachine.validateTransition(ticket.status, 'submit')) {
      throw new BadRequestException('当前状态不允许提交送审');
    }

    const updated = await this.prisma.operationTicket.update({
      where: { ticketId: id },
      data: { status: 'PENDING_SUPERVISOR' },
    });

    // 创建待办通知监护人
    await this.prisma.todo.create({
      data: {
        userId: ticket.supervisorId,
        ticketId: id,
        todoType: 'review',
        title: `审核操作票：${ticket.taskName}`,
        message: '操作票已提交送审，请审核',
      },
    });

    await this.prisma.operationLog.create({
      data: {
        ticketId: id,
        operatorId: userId,
        actionNode: 'submit',
        actionDetail: '提交送审',
        result: 'success',
      },
    });

    return updated;
  }

  /**
   * 审核操作票（三级审核通用）
   */
  async review(id: string, userId: string, action: string, comment?: string) {
    const ticket = await this.findOne(id);
    const currentStatus = ticket.status;

    // 根据当前状态+审核动作确定事件
    const eventMap: Record<string, string> = {
      'PENDING_SUPERVISOR-approve': 'approve',
      'PENDING_SUPERVISOR-reject': 'reject',
      'PENDING_APPROVER-approve': 'approve',
      'PENDING_APPROVER-reject': 'reject',
      'PENDING_DISPATCHER-approve': 'approve_and_dispatch',
      'PENDING_DISPATCHER-reject': 'reject',
    };

    const event = eventMap[`${currentStatus}-${action}`];
    if (!event || !this.stateMachine.validateTransition(currentStatus, event)) {
      throw new BadRequestException('当前状态不允许此审核操作');
    }

    const targetStatus = this.stateMachine.getTargetState(currentStatus, event);
    if (!targetStatus) {
      throw new BadRequestException('状态迁移目标未定义');
    }

    // 发令人审核通过需要写入下令时间
    const updateData: any = { status: targetStatus };
    if (action === 'approve' && currentStatus === 'PENDING_DISPATCHER') {
      updateData.dispatchTime = new Date();
    }

    const updated = await this.prisma.operationTicket.update({
      where: { ticketId: id },
      data: updateData,
    });

    // 根据目标状态创建待办
    if (targetStatus === 'PENDING_APPROVER' && ticket.approverId) {
      await this.prisma.todo.create({
        data: {
          userId: ticket.approverId,
          ticketId: id,
          todoType: 'review',
          title: `审核操作票：${ticket.taskName}`,
          message: '监护人已审核通过，请批准人审核',
        },
      });
    } else if (targetStatus === 'PENDING_DISPATCHER' && ticket.dispatcherId) {
      await this.prisma.todo.create({
        data: {
          userId: ticket.dispatcherId,
          ticketId: id,
          todoType: 'review',
          title: `审核操作票：${ticket.taskName}`,
          message: '批准人已审核通过，请发令人审核',
        },
      });
    } else if (targetStatus === 'PENDING_EXECUTE') {
      await this.prisma.todo.create({
        data: {
          userId: ticket.operatorId,
          ticketId: id,
          todoType: 'execute',
          title: `执行操作票：${ticket.taskName}`,
          message: '指令已下达，请执行操作',
        },
      });
    } else if (targetStatus === 'REJECTED') {
      await this.prisma.todo.create({
        data: {
          userId: ticket.operatorId,
          ticketId: id,
          todoType: 'review',
          title: `操作票被驳回：${ticket.taskName}`,
          message: comment ? `驳回意见：${comment}` : '操作票已被驳回，请修改后重新提交',
        },
      });
    }

    // 记录日志
    await this.prisma.operationLog.create({
      data: {
        ticketId: id,
        operatorId: userId,
        actionNode: 'review',
        actionDetail: `审核操作：${action}${comment ? `，意见：${comment}` : ''}`,
        result: action,
      },
    });

    return updated;
  }
}
