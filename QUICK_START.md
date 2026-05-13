# 快速启动

这是一个基于 PRD 驱动生成的「操作票管理系统」原型项目，当前完成到 Sprint 1：基础工程、数据模型、认证、人员、操作票创建/提交/审核等最小闭环。

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

## 10. 项目文档

核心文档：

```text
PRD.md                                      # 原始需求文档
.kiro/specs/operation-ticket-system/prd.md # requirements-analyst 生成的正式 PRD
.kiro/specs/operation-ticket-system/api.yaml
.kiro/specs/operation-ticket-system/rtm.md
IMPLEMENTATION_PLAN.md                     # Superpowers 生成的实现计划
```

## 11. 当前状态

当前项目处于 Sprint 1 阶段，已完成基础最小闭环骨架：

- NestJS 后端基础结构
- React/Vite 前端基础结构
- PostgreSQL + Prisma 数据模型
- JWT 登录基础能力
- 人员种子数据
- 操作票创建、查询、提交、审核相关接口雏形

后续 Sprint 会继续补齐：

- 完整三级审核体验
- 发令人下令与操作票锁定
- 执行监控
- 中止与副本
- 作废
- 归档、查询统计和外部推送
