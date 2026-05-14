import { PrismaClient, TicketStatus, ItemStatus, ReviewAction } from '@prisma/client';

const prisma = new PrismaClient();
const NOW = new Date();

/**
 * 构造一个 N 分钟前的时间点
 */
function minutesAgo(m: number): Date {
  return new Date(NOW.getTime() - m * 60 * 1000);
}

async function main() {
  console.log('🌱 开始填充演示数据（含真实时间间隔）...');

  // ========================================
  // 1. 检查人员是否存在（演示数据依赖已有人员）
  // ========================================
  const operator = await prisma.personnel.findUnique({ where: { personnelId: 'zs' } });
  const supervisor = await prisma.personnel.findUnique({ where: { personnelId: 'zl' } });
  const approver = await prisma.personnel.findUnique({ where: { personnelId: 'sb' } });
  const dispatcher = await prisma.personnel.findUnique({ where: { personnelId: 'ws' } });

  if (!operator || !supervisor || !approver || !dispatcher) {
    console.error('❌ 请先执行 pnpm prisma:seed 创建人员数据');
    process.exit(1);
  }

  // ========================================
  // 2. 生成唯一票号（基于当前时间）
  // ========================================
  const ts = NOW.getTime();
  const ticketId = `DEMO-${ts}`;
  const ticketNo = `OP-DEMO-${NOW.getFullYear()}${String(NOW.getMonth() + 1).padStart(2, '0')}${String(NOW.getDate()).padStart(2, '0')}`;

  // ========================================
  // 3. 定义时间轴（单位：分钟前）
  //    模拟一个完整的操作票生命周期，跨约 6 小时
  // ========================================
  const T = {
    create:           minutesAgo(360), // 6 小时前 — 创建
    submit:           minutesAgo(330), // 5.5 小时前 — 提交送审
    guardianReview:   minutesAgo(300), // 5 小时前 — 监护人审核
    approverReview:   minutesAgo(270), // 4.5 小时前 — 批准人审核
    dispatcherReview: minutesAgo(240), // 4 小时前 — 发令人审核+下令
    startExecute:     minutesAgo(60),  // 1 小时前 — 开始执行（午休后下午操作）
    item1:            minutesAgo(55),  // 55 分钟前 — 操作项 1
    item2:            minutesAgo(50),  // 50 分钟前 — 操作项 2
    item3:            minutesAgo(45),  // 45 分钟前 — 操作项 3
    complete:         minutesAgo(30),  // 30 分钟前 — 执行完成
    verify:           minutesAgo(0),   // 现在 — 校验通过
  };

  // ========================================
  // 4. 创建操作票（状态：已完成）
  // ========================================
  await prisma.operationTicket.upsert({
    where: { ticketId },
    update: {},
    create: {
      ticketId,
      taskName: '10kV I段母线由检修转运行',
      operatorId: 'zs',
      supervisorId: 'zl',
      approverId: 'sb',
      dispatcherId: 'ws',
      status: TicketStatus.COMPLETED,
      basicInfo: {
        station: '110kV 变电站',
        team: '运行一班',
        workType: '正常操作',
        voltage: '10kV',
      },
      workTicketNo: 'WT-DEMO-001',
      dispatchTime: T.dispatcherReview,
      remarks: '演示数据 — 完整生命周期展示',
      createdAt: T.create,
      updatedAt: T.verify,
    },
  });

  // ========================================
  // 5. 创建操作内容项（4 个步骤）
  // ========================================
  const items = [
    { stepContent: '确认10kV I段母线检修工作已全部结束', sequence: 1 },
    { stepContent: '拆除10kV I段母线侧所有接地线',      sequence: 2 },
    { stepContent: '检查10kV I段母线绝缘电阻合格',       sequence: 3 },
    { stepContent: '合上10kV I段母线PT刀闸',            sequence: 4 },
  ];

  for (const item of items) {
    await prisma.operationItem.create({
      data: {
        itemId: `${ticketId}-${String(item.sequence).padStart(3, '0')}`,
        ticketId,
        stepContent: item.stepContent,
        sequence: item.sequence,
        executeStatus: ItemStatus.COMPLETED,
        executeResult: '执行完成',
        remarks: '',
      },
    });
  }

  // ========================================
  // 6. 创建操作日志（时间轴）
  // ========================================
  const logs = [
    {
      actionNode: 'create',
      actionTime: T.create,
      operatorId: 'zs',
      actionDetail: '创建操作票',
      result: 'DRAFT',
    },
    {
      actionNode: 'submit',
      actionTime: T.submit,
      operatorId: 'zs',
      actionDetail: '提交送审',
      result: 'PENDING_SUPERVISOR',
    },
    {
      actionNode: 'review',
      actionTime: T.guardianReview,
      operatorId: 'zl',
      actionDetail: '监护人审核通过',
      result: 'PENDING_APPROVER',
      remarks: '监护人审核通过，现场措施到位',
    },
    {
      actionNode: 'review',
      actionTime: T.approverReview,
      operatorId: 'sb',
      actionDetail: '批准人审核通过',
      result: 'PENDING_DISPATCHER',
      remarks: '批准人审核通过，同意操作',
    },
    {
      actionNode: 'approve_and_dispatch',
      actionTime: T.dispatcherReview,
      operatorId: 'ws',
      actionDetail: '发令人审核通过并下达指令',
      result: 'PENDING_EXECUTE',
      remarks: '发令人审核通过，下令执行',
    },
    {
      actionNode: 'start_execute',
      actionTime: T.startExecute,
      operatorId: 'zs',
      actionDetail: '开始执行操作',
      result: 'EXECUTING',
    },
    {
      actionNode: 'execute_item',
      actionTime: T.item1,
      operatorId: 'zs',
      actionDetail: '执行操作项 1: 确认10kV I段母线检修工作已全部结束 → 执行完成',
      result: 'COMPLETED',
    },
    {
      actionNode: 'execute_item',
      actionTime: T.item2,
      operatorId: 'zs',
      actionDetail: '执行操作项 2: 拆除10kV I段母线侧所有接地线 → 执行完成',
      result: 'COMPLETED',
    },
    {
      actionNode: 'execute_item',
      actionTime: T.item3,
      operatorId: 'zs',
      actionDetail: '执行操作项 3: 检查10kV I段母线绝缘电阻合格 → 执行完成',
      result: 'COMPLETED',
    },
    {
      actionNode: 'complete',
      actionTime: T.complete,
      operatorId: 'zs',
      actionDetail: '操作完成',
      result: 'COMPLETED',
    },
    {
      actionNode: 'verify_pass',
      actionTime: T.verify,
      operatorId: 'ws',
      actionDetail: '校验通过，归档',
      result: 'COMPLETED',
      remarks: '校验通过，归档',
    },
  ];

  for (const log of logs) {
    await prisma.operationLog.create({
      data: {
        ticketId,
        operatorId: log.operatorId,
        actionNode: log.actionNode,
        actionTime: log.actionTime,
        actionDetail: log.actionDetail,
        result: log.result,
        remarks: log.remarks || null,
      },
    });
  }

  // ========================================
  // 7. 创建工作票关联信息
  // ========================================
  await prisma.workTicketInfo.upsert({
    where: { workTicketNo: 'WT-DEMO-001' },
    update: {},
    create: {
      workTicketNo: 'WT-DEMO-001',
      ticketId,
      safetyMeasures: '1. 确认检修工作票已终结 2. 确认接地线已全部拆除 3. 确认现场无人遗留',
      workerId: 'zs',
      workerName: '张三',
      pushStatus: 'success',
      pushTime: T.verify,
    },
  });

  console.log(`  ✅ 创建演示操作票：${ticketId}`);
  console.log(`  ✅ 创建操作内容项：${items.length} 项`);
  console.log(`  ✅ 创建操作日志：${logs.length} 条（时间跨度约 6 小时）`);
  console.log(`  ✅ 创建演示工作票关联`);
  console.log('');
  console.log('📋 时间轴预览：');
  console.log(`  ${T.create.toLocaleString('zh-CN')}      创建操作票`);
  console.log(`  ${T.submit.toLocaleString('zh-CN')}      提交送审`);
  console.log(`  ${T.guardianReview.toLocaleString('zh-CN')}  监护人审核通过`);
  console.log(`  ${T.approverReview.toLocaleString('zh-CN')}  批准人审核通过`);
  console.log(`  ${T.dispatcherReview.toLocaleString('zh-CN')}  发令人审核+下令`);
  console.log(`  ${T.startExecute.toLocaleString('zh-CN')}  开始执行`);
  console.log(`  ${T.item1.toLocaleString('zh-CN')}  操作项 1`);
  console.log(`  ${T.item2.toLocaleString('zh-CN')}  操作项 2`);
  console.log(`  ${T.item3.toLocaleString('zh-CN')}  操作项 3`);
  console.log(`  ${T.complete.toLocaleString('zh-CN')}  执行完成`);
  console.log(`  ${T.verify.toLocaleString('zh-CN')}  校验通过`);
  console.log('');
  console.log('🌱 演示数据填充完成！');
}

// 如果命令行参数包含 --fix，只执行修复逻辑
if (process.argv.includes('--fix')) {
  fixTimestamps()
    .catch((e) => {
      console.error('❌ 修复失败:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} else {
  main()
    .catch((e) => {
      console.error('❌ 演示数据填充失败:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

/**
 * 修复所有旧操作票的时间线数据
 * 将同一秒内的日志时间戳分散到合理的时间间隔
 */
async function fixTimestamps() {
  console.log('🕐 开始修复旧操作票时间线...\n');

  // 获取所有操作票
  const tickets = await prisma.operationTicket.findMany({
    orderBy: { createdAt: 'desc' },
  });
  console.log(`共找到 ${tickets.length} 张操作票`);

  let fixedCount = 0;

  for (const ticket of tickets) {
    // 获取该票的所有日志，按 actionTime 升序
    const logs = await prisma.operationLog.findMany({
      where: { ticketId: ticket.ticketId },
      orderBy: { actionTime: 'asc' },
    });

    if (logs.length < 2) continue;

    // 检查时间戳是否过于集中（所有日志在 3 秒以内）
    // 或者是否有完全重复的时间戳（不同节点在同一秒）
    const firstTime = logs[0].actionTime.getTime();
    const lastTime = logs[logs.length - 1].actionTime.getTime();
    const spanSeconds = (lastTime - firstTime) / 1000;

    // 检查是否有不同节点使用完全相同的时间戳
    const timestamps = logs.map(l => l.actionTime.getTime());
    const uniqueTimestamps = new Set(timestamps);
    const hasDuplicateTimestamps = timestamps.length !== uniqueTimestamps.size;

    // 如果时间跨度 >= 10 秒且没有重复时间戳，认为已经是好的数据，跳过
    if (spanSeconds >= 10 && !hasDuplicateTimestamps) continue;

    console.log(`\n  修复: ${ticket.ticketId} (${ticket.status}) - ${logs.length} 条日志, 跨度 ${spanSeconds}s`);

    // 以第一条日志的时间为基准，按操作类型分配合理的时间间隔（单位：秒）
    const baseTime = logs[0].actionTime.getTime();
    const intervals: Record<string, number> = {
      'create': 0,
      'submit': 60,          // 1 分钟后提交
      'resubmit': 60,        // 1 分钟后重新提交
      'approve': 300,        // 5 分钟后审核（+5min per additional approve）
      'review': 300,         // 同 approve（某些旧数据使用 review）
      'approve_and_dispatch': 1200, // 20 分钟后发令人审核+下令（在所有 approve 之后）
      'reject': 120,         // 2 分钟后驳回
      'start_execute': 2400, // 40 分钟后开始执行
      'execute_item': 2460,  // 41 分钟后第一个操作项（+2min per item）
      'complete': 3000,      // 50 分钟后完成
      'verify_pass': 3300,   // 55 分钟后校验通过
      'verify_fail': 3300,   // 55 分钟后校验不通过
    };

    // 如果没有找到合适的基准时间，使用票证的创建时间
    const refTime = ticket.createdAt?.getTime() || baseTime;

    // 为每条日志分配时间
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const node = log.actionNode;

      // 计算偏移量
      let offset = intervals[node];
      if (offset === undefined) {
        // 未知节点类型：均匀分布在前后日志之间
        offset = 60 * i; // 默认每分钟一个
      }

      // 如果有多个相同类型的节点，顺序递增
      const sameTypeIndex = logs.slice(0, i).filter(l => l.actionNode === node).length;
      if (sameTypeIndex > 0) {
        // 审核类型间隔 5 分钟，操作项间隔 2 分钟，其他间隔 1 分钟
        const isReview = node === 'approve' || node === 'review';
        const stepSeconds = node === 'execute_item' ? 120 : (isReview ? 300 : 60);
        offset += sameTypeIndex * stepSeconds;
      }

      const newTime = new Date(refTime + offset * 1000);
      await prisma.operationLog.update({
        where: { logId: log.logId },
        data: { actionTime: newTime },
      });
    }

    // 同时更新 operation_tickets 的 updatedAt
    const lastLogTime = new Date(refTime + (intervals[logs[logs.length - 1]?.actionNode] || 2700) * 1000);
    await prisma.operationTicket.update({
      where: { ticketId: ticket.ticketId },
      data: { updatedAt: lastLogTime },
    });

    fixedCount++;
    console.log(`  ✅ 修复完成，时间跨度: 0s → ~${Math.round((intervals[logs[logs.length - 1]?.actionNode] || 2700) / 60)}min`);
  }

  console.log(`\n📊 共修复 ${fixedCount} 张操作票的时间线`);
}

// 如果命令行参数包含 --fix，执行修复
if (process.argv.includes('--fix')) {
  fixTimestamps()
    .catch((e) => {
      console.error('❌ 修复失败:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
