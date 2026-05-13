# 操作票管理系统 (Operation Ticket Management System)

> 电力行业现场操作票全生命周期管理系统 — 面试 / Demo 项目  
> 基于 PRD 驱动开发，覆盖建票 → 三级审核 → 下令 → 执行 → 校验 → 归档全流程。

---

## 项目概述

本系统用于电力行业操作票的数字化管理，实现操作票从创建、审核、下达指令、现场执行到数据校验的全流程闭环。

- **核心流程**：建票 → 监护人审核 → 批准人审核 → 发令人审核并下令 → 操作人现场执行 → 发令人数据校验 → 归档
- **核心角色**：操作人 (OPERATOR) → 监护人 (SUPERVISOR) → 批准人 (APPROVER) → 发令人 (DISPATCHER)
- **状态管理**：10 个状态、16 条有效迁移路径的严格状态机引擎

---

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│     React 19 + TypeScript 6 + Ant Design 6       │
│     Vite 8 · React Router 7 · ESLint             │
├──────────────────────┬──────────────────────────┤
│         HTTP         │    Browser LocalStorage   │
│   (REST over fetch)  │    (JWT token persist)    │
├──────────────────────┴──────────────────────────┤
│                   Backend                        │
│       NestJS 10 + TypeScript + Passport JWT      │
│       TicketStateMachine Engine (10 statuses)    │
├──────────────────────────────────────────────────┤
│               Prisma 6 ORM                       │
├──────────────────────────────────────────────────┤
│               PostgreSQL 16                      │
└──────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | React 19 + TypeScript 6 | 用户界面 |
| UI 组件库 | Ant Design 6.3.7 | 页面组件与布局 |
| 路由 | React Router 7.15.0 | 前端路由 |
| 构建工具 | Vite 8 | 开发与构建 |
| 后端框架 | NestJS 10 | API 服务 |
| ORM | Prisma 6 | 数据库访问 |
| 数据库 | PostgreSQL 16 | 数据存储 |
| 认证 | JWT (Passport) | 登录认证 |
| 容器 | Docker Compose | 本地数据库环境 |

---

## 快速启动

### 前置条件

- Node.js 24+
- pnpm 11+
- Docker Desktop (用于本地 PostgreSQL)

### 启动步骤

```bash
# 1. 启动数据库
docker compose up -d

# 2. 启动后端
cd backend
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm start:dev

# 3. 启动前端（新开终端）
cd frontend
pnpm install
pnpm dev
```

访问 **http://localhost:5173** 即可使用。

---

## 测试账号

| 人员 ID | 姓名 | 角色 | 主要用途 |
|---------|------|------|----------|
| `zs` | 张三 | 操作人 | 创建操作票、提交、执行 |
| `zl` | 赵六 | 监护人 | 第一级审核 |
| `sb` | 孙八 | 批准人 | 第二级审核 |
| `ws` | 吴十 | 发令人 | 第三级审核、下令、校验 |

开发环境密码任意（空密码亦可）。

---

## 推荐演示流程

### 完整 7 步演示

```
Step 1: zs 登录 → 创建操作票 → 提交送审
    ↓
Step 2: zl 登录 → 审核通过 (监护人)
    ↓
Step 3: sb 登录 → 审核通过 (批准人)
    ↓
Step 4: ws 登录 → 审核通过并下达指令 (发令人)
    ↓
Step 5: zs 登录 → 开始执行 → 逐项完成 → 提交校验
    ↓
Step 6: ws 登录 → 校验通过 → 归档
    ↓
Step 7: 任意角色 → 查询操作票 → 查看详情和时间线
```

### 页面路径

| 页面 | 路径 | 角色 |
|------|------|------|
| 登录 | `/login` | 全部 |
| 工作台 | `/workbench` | 全部 |
| 创建操作票 | `/tickets/create` | 操作人 |
| 查询操作票 | `/tickets/query` | 全部 |
| 审核/详情 | `/tickets/:id` | 全部 |
| 执行操作 | `/tickets/:id/execute` | 操作人 |
| 执行监控 | `/tickets/:id/monitor` | 监护人/发令人 |
| 数据校验 | `/tickets/:id/verify` | 发令人 |

---

## 项目结构

```
interview-requirements-power-test/
├── backend/                     # NestJS 后端
│   ├── prisma/
│   │   ├── schema.prisma        # 数据模型（11 个模型）
│   │   └── seed.ts              # 种子数据（9 个人员）
│   └── src/
│       ├── auth/                # JWT 认证模块
│       ├── tickets/
│       │   ├── engine/
│       │   │   └── state-machine.ts  # 10 状态状态机
│       │   ├── tickets.service.ts    # 核心业务逻辑
│       │   └── tickets.controller.ts # REST API 控制器
│       └── personnel/           # 人员模块
├── frontend/                    # React 前端
│   └── src/
│       ├── api/client.ts        # API 客户端
│       ├── components/          # 通用组件
│       ├── contexts/            # React Context
│       ├── layouts/             # 页面布局
│       ├── pages/               # 页面组件
│       └── utils/               # 工具与常量
├── docker-compose.yml           # PostgreSQL 容器
├── IMPLEMENTATION_PLAN.md       # 实施计划（936 行）
├── PRD.md                       # 需求文档
├── QUICK_START.md               # 快速启动指南
├── USER_GUIDE.md                # 使用说明书
└── README.md                    # 本文件
```

---

## 核心功能

### 1. 状态机引擎

- 10 个状态：DRAFT → PENDING_SUPERVISOR → PENDING_APPROVER → PENDING_DISPATCHER → PENDING_EXECUTE → EXECUTING → COMPLETED / SUSPENDED / VOIDED / REJECTED
- 16 条有效迁移路径，含守卫条件与动作
- 非法迁移自动拦截 + 中文错误提示
- 编辑锁定机制（待执行起不可编辑）

### 2. 三级审核流程

- 监护人 (SUPERVISOR) → 批准人 (APPROVER) → 发令人 (DISPATCHER)
- 审核通过逐级流转，驳回后回到操作人修改重提
- 发令人审核通过时写入下令时间（`dispatchTime`）

### 3. 执行模块

- 开始执行 → 逐条操作项执行/跳过 → 全部完成后提交校验
- 执行进度展示，监控页面查看操作时间线

### 4. 数据校验

- 操作完成后数据校验，支持通过归档或标记异常

### 5. 角色化 UI

- 菜单根据角色动态展示
- 操作按钮根据角色和当前状态动态渲染
- 工作台统计展示角色相关数据

---

## API 概览

所有 API 前缀：`/api/v1`

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 登录获取 JWT |

### 操作票 CRUD
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/tickets` | 创建操作票 |
| GET | `/tickets` | 查询列表 |
| GET | `/tickets/:id` | 获取详情 |
| PUT | `/tickets/:id` | 更新操作票 |

### 工作流
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/tickets/:id/submit` | 提交送审 |
| POST | `/tickets/:id/review` | 审核（通过/驳回） |
| POST | `/tickets/:id/dispatch` | 下达指令 |
| POST | `/tickets/:id/resubmit` | 驳回后重提 |
| GET | `/tickets/:id/status` | 获取状态信息 |

### 执行
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/tickets/:id/start-execute` | 开始执行 |
| PUT | `/tickets/:id/items/:itemId` | 更新操作项状态 |
| POST | `/tickets/:id/complete` | 完成执行 |
| POST | `/tickets/:id/verify` | 数据校验 |
| PUT | `/tickets/:id/media` | 上传现场数据 |

### 日志
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/tickets/:id/timeline` | 获取操作时间线 |

---

## 交付状态

### 已完成

| Sprint | 范围 | 状态 |
|--------|------|------|
| Sprint 1 | 基础工程、数据模型、认证、最小闭环 | ✅ |
| Sprint 2 | 状态机增强、三级审核、下令、编辑锁定 | ✅ |
| Sprint 3 | 前端路由、主布局、登录、工作台、创建/审核/查询页 | ✅ |
| Sprint 4 | 执行模块、监控、校验、时间线、错误边界 | ✅ |
| Sprint 5 | 测试、修复、文档、交付收尾 | ✅ |

### 验证结果

| 检查项 | 结果 |
|--------|------|
| 后端 build (`npm run build`) | ✅ |
| 后端 test (`npm run test`) | ✅ 28/28 |
| 前端 build (`pnpm build`) | ✅ |
| 前端 lint (`pnpm lint`) | ✅ 0 errors |

### 边界说明

- 现场数据上传为最小实现，非完整文件存储方案
- 数据总召校验为演示级流程，未接入真实终端
- 执行监控为查询式展示，非 WebSocket 实时推送
- 未包含性能压测、安全扫描、UAT 测试
- 未包含生产级部署（K8s/CI-CD）

---

## 许可证

本项目为面试/Demo 用途，仅供参考。
