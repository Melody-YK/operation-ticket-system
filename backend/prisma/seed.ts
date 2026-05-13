import { PrismaClient, PersonnelRole } from '@prisma/client';

const prisma = new PrismaClient();

interface PersonnelSeed {
  name: string;
  role: PersonnelRole;
  team?: string;
  department?: string;
  position?: string;
  qualification?: string;
}

async function main() {
  console.log('🌱 开始填充种子数据...');

  const allPersonnel: PersonnelSeed[] = [
    // 操作人
    { name: '张三', role: PersonnelRole.OPERATOR, team: '运行一班', position: '操作员', qualification: '高压操作证' },
    { name: '李四', role: PersonnelRole.OPERATOR, team: '运行一班', position: '操作员', qualification: '高压操作证' },
    { name: '王五', role: PersonnelRole.OPERATOR, team: '运行二班', position: '操作员', qualification: '高压操作证' },
    // 监护人
    { name: '赵六', role: PersonnelRole.SUPERVISOR, team: '运行一班', position: '班长', qualification: '监护资格证' },
    { name: '钱七', role: PersonnelRole.SUPERVISOR, team: '运行二班', position: '班长', qualification: '监护资格证' },
    // 批准人
    { name: '孙八', role: PersonnelRole.APPROVER, department: '生产管理部', position: '主管' },
    { name: '周九', role: PersonnelRole.APPROVER, department: '生产管理部', position: '副主管' },
    // 发令人
    { name: '吴十', role: PersonnelRole.DISPATCHER, team: '调度中心', position: '调度员' },
    { name: '郑十一', role: PersonnelRole.DISPATCHER, team: '调度中心', position: '调度员' },
  ];

  const idMap: Record<string, string> = {
    '张三': 'zs', '李四': 'ls', '王五': 'ww',
    '赵六': 'zl', '钱七': 'qq',
    '孙八': 'sb', '周九': 'zj',
    '吴十': 'ws', '郑十一': 'zsy',
  };

  for (const person of allPersonnel) {
    const personnelId = idMap[person.name];

    await prisma.personnel.upsert({
      where: { personnelId },
      update: person as any,
      create: { personnelId, ...person } as any,
    });
    console.log(`  ✅ 创建人员：${person.name} (${person.role})`);
  }

  console.log('\n🌱 种子数据填充完成！');
  console.log('\n📋 可用账号列表：');
  console.log('  ID: zs (张三 - 操作人)');
  console.log('  ID: zl (赵六 - 监护人)');
  console.log('  ID: sb (孙八 - 批准人)');
  console.log('  ID: ws (吴十 - 发令人)');
  console.log('  密码：任意（开发环境）\n');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据填充失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
