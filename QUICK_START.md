# 快速启动

这是一个基于 PRD 驱动生成的「操作票管理系统」原型项目，已完成全部 5 个 Sprint 的开发交付。覆盖操作票全生命周期：建票 → 三级审核（监护人/批准人/发令人）→ 下令 → 现场执行 → 数据校验 → 归档。

## 1. 环境要求

请先确认本机已安装：

```bash
node -v
pnpm -v
docker --version
docker compose version
```

推荐版本：

- Node.js 24+
- pnpm 11+
- Docker Desktop
- Docker Compose

## 2. 克隆项目

```bash
git clone https://github.com/Melody-YK/operation-ticket-system.git
cd operation-ticket-system
```

如果已经在本地项目目录：

```bash
cd "/Users/melody/Desktop/tbd和superpowers/interview-requirements-power-test"
```

## 3. 启动数据库

项目使用 PostgreSQL，已提供 `docker-compose.yml`：

```bash
docker compose up -d
```

数据库配置：

```text
host: localhost
port: 5432
user: ops_user
password: ops_password
database: ops_ticket_db
```

## 4. 配置后端环境变量

进入后端目录：

```bash
cd backend
```

创建 `.env`：

```bash
cat > .env <<'EOF'
DATABASE_URL="postgresql://ops_user:ops_password@localhost:5432/ops_ticket_db?schema=public"
JWT_SECRET="ops-ticket-dev-secret-only"
JWT_EXPIRATION="7d"
EOF
```

## 5. 启动后端

安装依赖：

```bash
pnpm install
```

生成 Prisma Client：

```bash
pnpm prisma:generate
```

执行数据库迁移：

```bash
pnpm prisma:migrate
```

填充开发种子数据：

```bash
pnpm prisma:seed
```

启动后端开发服务：

```bash
pnpm start:dev
```

后端地址：

```text
http://localhost:3000/api/v1
```

## 6. 启动前端

新开一个终端，进入前端目录：

```bash
cd frontend
pnpm install
pnpm dev
```

前端地址通常是：

```text
http://localhost:5173
```

## 7. 开发账号

种子数据会创建以下人员：

| 人员ID | 姓名 | 角色 |
|---|---|---|
| zs | 张三 | 操作人 |
| zl | 赵六 | 监护人 |
| sb | 孙八 | 批准人 |
| ws | 吴十 | 发令人 |

开发环境密码：

```text
任意密码均可
```

## 8. 常用 API

### 登录

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"personnelId":"zs","password":"123456"}'
```

返回结果中会包含 JWT token。

### 查询操作票

```bash
curl http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer <TOKEN>"
```

### 创建操作票

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "taskName": "1号主变停电操作",
    "supervisorId": "zl",
    "approverId": "sb",
    "dispatcherId": "ws",
    "basicInfo": { "team": "运行一班", "area": "主变区" },
    "workTicketNo": "WT-2026-001",
    "items": [
      { "stepNo": 1, "content": "检查现场安全措施" },
      { "stepNo": 2, "content": "断开相关开关" }
    ]
  }'
```

### 提交送审

```bash
curl -X POST http://localhost:3000/api/v1/tickets/<TICKET_ID>/submit \
  -H "Authorization: Bearer <TOKEN>"
```

### 审核

```bash
curl -X POST http://localhost:3000/api/v1/tickets/<TICKET_ID>/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"action":"APPROVE","comment":"审核通过"}'
```

> 注意：不同审核节点请使用对应角色账号登录后拿 token。

## 9. 常用命令

后端：

```bash
cd backend
pnpm start:dev       # 开发启动
pnpm build           # 构建
pnpm test            # 测试
pnpm prisma:generate # 生成 Prisma Client
pnpm prisma:migrate  # 执行迁移
pnpm prisma:seed     # 填充种子数据
```

前端：

```bash
cd frontend
pnpm dev     # 开发启动
pnpm build   # 构建
pnpm lint    # lint
```

数据库：

```bash
docker compose up -d      # 启动数据库
docker compose down       # 停止数据库
docker compose logs -f    # 查看日志
```

## 10. 如何关闭项目

本项目本地开发时通常会启动 3 个东西：

1. 前端 Vite 服务：`http://localhost:5173`
2. 后端 NestJS 服务：`http://localhost:3000/api/v1`
3. PostgreSQL 数据库容器：`localhost:5432`

### 10.1 正常关闭方式

如果前端和后端是在终端里用 `pnpm dev` / `pnpm start:dev` 启动的，直接回到对应终端按：

```bash
Ctrl + C
```

分别停止：

- 前端终端：停止 `pnpm dev`
- 后端终端：停止 `pnpm start:dev`

然后在项目根目录关闭数据库：

```bash
cd "/Users/melody/Desktop/tbd和superpowers/interview-requirements-power-test"
docker compose down
```

### 10.2 检查是否已经关闭

检查数据库容器：

```bash
docker compose ps
```

如果没有正在运行的服务，说明数据库已关闭。

检查端口是否还被占用：

```bash
lsof -i :5173
lsof -i :3000
lsof -i :5432
```

如果没有输出，说明前端、后端、数据库端口都已经释放。

### 10.3 强制关闭占用端口的进程

如果忘了在哪个终端启动，或者 `Ctrl + C` 后端口仍被占用，可以先查 PID：

```bash
lsof -i :5173
lsof -i :3000
```

然后按查到的 PID 结束进程：

```bash
kill <PID>
```

如果普通 `kill` 无效，再使用：

```bash
kill -9 <PID>
```

> 建议优先使用 `Ctrl + C` 和 `docker compose down`，`kill -9` 只作为最后手段。

### 10.4 是否会删除数据？

执行：

```bash
docker compose down
```

会停止并删除容器网络，但通常不会删除数据库卷里的数据。

如果你想连数据库数据也一起清空，才使用：

```bash
docker compose down -v
```

> 注意：`docker compose down -v` 会删除数据库卷，本地演示数据会丢失。除非你明确想重置数据库，否则不要用。

## 11. 项目文档

核心文档：

```text
PRD.md                                      # 原始需求文档
.kiro/specs/operation-ticket-system/prd.md # requirements-analyst 生成的正式 PRD
.kiro/specs/operation-ticket-system/api.yaml
.kiro/specs/operation-ticket-system/rtm.md
IMPLEMENTATION_PLAN.md                     # Superpowers 生成的实现计划
```

## 12. 项目状态

项目已完成全部 5 个 Sprint 的开发交付。覆盖功能：

### Sprint 1 — 基础工程与最小闭环
- NestJS 后端基础结构
- React/Vite 前端基础结构
- PostgreSQL + Prisma 数据模型
- JWT 登录认证
- 人员种子数据（9 个账号）
- 操作票创建、提交、审核基础接口

### Sprint 2 — 状态机增强与审核流程
- 10 状态状态机（完整迁移矩阵）
- 非法迁移保护与中文错误提示
- 三级审核流程（监护人 → 批准人 → 发令人）
- 发令人下令（下达指令 + 下令时间）
- 编辑锁定、驳回重提、作废流程
- 操作日志

### Sprint 3 — 前端核心页面
- 路由与主布局（侧边栏 + 响应式）
- 登录页（人员 ID 登录 + 快捷账号）
- 工作台（角色化统计 + 最近操作票）
- 创建操作票页（动态表单 + 步骤编辑）
- 审核/详情页（角色化操作按钮）
- 查询操作票页（多条件搜索 + 分页）

### Sprint 4 — 执行模块与端到端集成
- 执行页（步骤进度 + 执行/跳过逐条操作）
- 监控页（进度 + 时间线 + 操作项状态）
- 数据校验页（校验项 + 通过/标记异常）
- 操作日志时间线组件
- 错误边界与网络状态提示
- 现场数据上传（最小实现）

### Sprint 5 — 测试 + 修复 + 交付收尾
- 状态机单元测试（28 个测试用例）
- 全量回归：后端 build/test、前端 build/lint
- 文档完善（QUICK_START、USER_GUIDE、README）
- 交付报告、安全检查
