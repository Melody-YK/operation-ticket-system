# 实施计划：操作票管理系统

> **基于**：.kiro/specs/operation-ticket-system/ (PRD + 需求分析 + 数据模型 + API + RTM)
> **风格**：Superpowers writing-plans
> **日期**：2026-05-13
> **状态**：计划草案

---

## 目录

1. [概述与范围](#1-概述与范围)
2. [技术架构决策](#2-技术架构决策)
3. [实施路线图总览](#3-实施路线图总览)
4. [MVP 迭代规划](#4-mvp-迭代规划)
5. [组件分解与任务清单](#5-组件分解与任务清单)
6. [数据层实施计划](#6-数据层实施计划)
7. [API 层实施计划](#7-api-层实施计划)
8. [前端实施计划](#8-前端实施计划)
9. [状态机引擎设计](#9-状态机引擎设计)
10. [测试策略](#10-测试策略)
11. [风险管理与缓解](#11-风险管理与缓解)
12. [完成定义](#12-完成定义)

---

## 1. 概述与范围

### 1.1 我们要构建什么

一套**响应式 Web 操作票管理系统**，覆盖电力现场作业操作票的全生命周期：

```
建票 → 三级审核 → 指令下达 → 现场执行 → 数据校验 → 归档
```

支持四大核心角色（操作人、监护人、批准人、发令人），一套代码覆盖 PC + 移动端。

### 1.2 MVP 边界（v1.0）

| 活动 | 包含 | 不包含 |
|------|------|--------|
| 建票送审 | 创建操作票、自动保存、提交送审 | 暂存续编（v1.1） |
| 三级审核 | 监护人/批准人审核 | 发令人审核（v1.1 升级） |
| 指令下达 | 发令人下达指令、信息锁定 | — |
| 现场执行 | 逐条执行、数据实时上传 | 断点续传（v1.1） |
| 收尾归档 | 数据总召校验 | 结果推送（v1.1）、PDF 归档（v2.0） |
| 查询统计 | 多条件查询 | 统计图表（v1.1） |
| 异常处理 | 操作票作废 | 中止与副本（v1.1） |

### 1.3 核心数据流

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  前端     │───▶│  API     │───▶│  业务    │───▶│  数据    │───▶│  存储    │
│  (响应式) │    │  Gateway │    │  逻辑    │    │  访问    │    │  (DB+)   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                    │
                                                                    ▼
                                                               ┌──────────┐
                                                               │  BLOB    │
                                                               │  存储    │
                                                               └──────────┘
```

---

## 2. 技术架构决策

### 2.1 技术选型

| 层级 | 技术 | 选型理由 |
|------|------|----------|
| **前端框架** | React 18 + TypeScript | 组件生态成熟，响应式方案完善，SSR 支持好 |
| **UI 组件库** | Ant Design 5.x | 企业级组件丰富，表格/表单/步骤条原生支持操作票场景 |
| **响应式方案** | TailwindCSS + 响应式断点 | 一套代码 PC/移动端自适应 |
| **后端框架** | Node.js (NestJS) + TypeScript | 前后端同语言，类型共享，装饰器支持 OpenAPI 自动生成 |
| **API 规范** | RESTful (OpenAPI 3.0) | 已定义完整 API 契约 |
| **数据库** | PostgreSQL 15 | 对象关系型，JSON 字段支持灵活结构，B-tree 索引性能优良 |
| **ORM** | Prisma | 类型安全，自动迁移，与 TypeScript 深度集成 |
| **认证** | JWT + RBAC | 无状态认证，角色权限清晰 |
| **文件存储** | 数据库 BLOB (bytea) | 按决策 Q6，音视频/图片直接存入数据库 |
| **测试** | Jest + Playwright | 单元测试 + E2E 测试覆盖全流程 |
| **CI/CD** | GitHub Actions | 自动化测试 + 部署 |

### 2.2 架构模式

```
┌─────────────────────────────────────────────────────────┐
│                    客户端层                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │         响应式 Web App (React)                    │   │
│  │   PC 浏览器  ←→  移动浏览器 (iOS/Android)        │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / REST + JWT
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    API 网关层                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  NestJS API Gateway                              │   │
│  │  认证鉴权 → 路由分发 → 请求校验 → 速率限制       │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    业务服务层                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 操作票   │ │ 审核流   │ │ 执行     │ │ 统计     │  │
│  │ 服务     │ │ 引擎     │ │ 同步服务  │ │ 查询服务  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 状态机   │ │ 待办     │ │ 文件     │               │
│  │ 引擎     │ │ 服务     │ │ 服务     │               │
│  └──────────┘ └──────────┘ └──────────┘               │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     数据层                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  PostgreSQL (主库) + BLOB 存储                    │   │
│  │  Prisma ORM → 类型安全数据访问                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.3 关键设计原则

| 原则 | 说明 |
|------|------|
| **状态机驱动** | 操作票所有状态迁移由统一的状态机引擎管理，禁止直接修改状态字段 |
| **权限即守卫** | 每个 API 端点、每个前端路由/按钮都经过角色权限校验 |
| **离线优先** | 现场执行模块设计本地缓存机制，网络恢复后自动同步 |
| **审计全记录** | 所有关键操作（创建、审核、指令、中止、作废）自动写入操作日志表 |

---

## 3. 实施路线图总览

### 3.1 版本路线

```
6月                    7月                    8月                    9月
├──────────────────────┼──────────────────────┼──────────────────────┤
│  MVP v1.0 开发       │  MVP 测试+发布       │  v1.1 开发           │  v1.1 发布
│  Sprint 1-4          │  Sprint 5            │  Sprint 6-8          │  Sprint 9
│                      │                      │                      │
│  ┌────┬────┬────┬────┐  ┌────┐              │  ┌────┬────┬────┐  ┌────┐
│  │ S1 │ S2 │ S3 │ S4 │  │ S5 │              │  │ S6 │ S7 │ S8 │  │ S9 │
│  └────┴────┴────┴────┘  └────┘              │  └────┴────┴────┘  └────┘
│  (2周/ sprint)                               │
```

### 3.2 MVP Sprint 规划

| Sprint | 周期 | 主题 | 交付物 |
|--------|------|------|--------|
| **S1** | 第1-2周 | 基础设施 + 数据层 | 项目脚手架、数据库 Schema、Prisma 模型、认证模块 |
| **S2** | 第3-4周 | 核心 API + 状态机 | 操作票 CRUD、状态机引擎、送审/审核 API、待办 API |
| **S3** | 第5-6周 | 前端核心页面 | 工作台、建票页、审核页、查询页（PC+移动端响应式） |
| **S4** | 第7-8周 | 执行模块 + 集成 | 操作执行页、数据上传、校验模块、端到端流程打通 |
| **S5** | 第9-10周 | 测试 + 修复 + 发布 | 全量回归测试、性能测试、安全扫描、UAT、发布 |

---

## 4. MVP 迭代规划

### 4.1 Sprint 1：基础设施 + 数据层（第1-2周）

**目标**：可运行的项目骨架，数据库就绪，用户可登录

| 任务 ID | 任务 | 工时估计 | 依赖 | 输出 |
|---------|------|----------|------|------|
| T-001 | 初始化 React + NestJS 项目脚手架 | 1d | — | 可运行的前后端项目 |
| T-002 | 配置 TypeScript、ESLint、Prettier | 0.5d | T-001 | 统一代码规范 |
| T-003 | 设计并创建 PostgreSQL 数据库 Schema | 2d | — | 迁移脚本 (Prisma) |
| T-004 | 实现 Prisma 数据模型（11个实体） | 2d | T-003 | 类型安全的 ORM 模型 |
| T-005 | 实现 JWT 认证模块（登录/刷新/登出） | 2d | T-001 | 认证 API + 前端登录页 |
| T-006 | 实现 RBAC 权限守卫（角色装饰器） | 1.5d | T-005 | 权限校验中间件 |
| T-007 | 配置 CI/CD 流水线（GitHub Actions） | 1d | T-001 | 自动化构建+测试 |
| T-008 | 配置 Docker 开发环境（docker-compose） | 1d | — | 一键启动开发环境 |
| T-009 | 实现人员管理基础 CRUD API | 1.5d | T-004 | 人员管理接口 |
| T-010 | 编写数据层单元测试 | 1d | T-004 | 测试覆盖 > 80% |

**Sprint 1 验收标准**：

```
✅ 开发环境 docker-compose up 一键启动
✅ 数据库 11 张表全部创建成功
✅ 登录/注册流程完整可用
✅ 角色权限守卫生效（未授权请求返回 401/403）
✅ CI 流水线通过
```

**关键风险**：数据库 Schema 设计是否完整覆盖所有实体关系 → 需在 Sprint 1 开始前完成 Schema review

---

### 4.2 Sprint 2：核心 API + 状态机引擎（第3-4周）

**目标**：操作票全生命周期后端逻辑完整可用（不含执行模块）

| 任务 ID | 任务 | 工时估计 | 依赖 | 输出 |
|---------|------|----------|------|------|
| T-011 | 实现状态机引擎（核心模块） | 3d | T-004 | 可配置的状态机工厂 |
| T-012 | 实现操作票 CRUD API | 2d | T-011 | tickets CRUD 端点 |
| T-013 | 实现自动票号生成服务 | 0.5d | T-012 | OP-YYYYMMDD-XXXXX 生成器 |
| T-014 | 实现提交送审 API | 1d | T-012 | submit 端点 + 状态迁移 |
| T-015 | 实现三级审核 API（含并发锁定） | 2.5d | T-011, T-014 | review 端点 + 锁定机制 |
| T-016 | 实现下达指令 API | 1d | T-015 | dispatch 端点 + 信息锁定 |
| T-017 | 实现操作票作废 API | 1d | T-012 | abort 端点 |
| T-018 | 实现待办消息服务 | 1.5d | T-015 | 待办推送/查询/标记已读 |
| T-019 | 实现操作票查询 API（多条件+分页） | 1.5d | T-012 | 查询端点 + 索引优化 |
| T-020 | 编写业务逻辑单元测试 | 2d | T-011~T-019 | 测试覆盖 > 80% |

**状态机引擎核心接口**：

```typescript
// 状态机引擎核心抽象
interface StateMachine<TicketState, Event> {
  // 获取当前状态的允许事件
  getAllowedEvents(state: TicketState): Event[]
  // 执行状态迁移
  transition(ticketId: string, event: Event, context: TransitionContext): Promise<TicketState>
  // 校验迁移是否合法
  validateTransition(from: TicketState, event: Event): boolean
  // 获取迁移后的目标状态
  getTargetState(from: TicketState, event: Event): TicketState
}
```

**Sprint 2 验收标准**：

```
✅ 状态机引擎支持配置化状态迁移定义
✅ 操作票从"建立"到"待执行"的完整链路可用
✅ 并发审核锁定机制生效（30分钟超时自动释放）
✅ 作废流程完整可用
✅ 多条件查询 + 分页正常
✅ API 单元测试覆盖全部业务逻辑
```

---

### 4.3 Sprint 3：前端核心页面（第5-6周）

**目标**：前端 PC + 移动端响应式，核心页面可用

| 任务 ID | 任务 | 工时估计 | 依赖 | 输出 |
|---------|------|----------|------|------|
| T-021 | 搭建前端项目结构 + 路由 + 布局 | 1d | T-001 | 前端脚手架 |
| T-022 | 实现登录页 + 认证状态管理 | 1d | T-005 | 登录页（PC/移动端） |
| T-023 | 实现系统工作台（角色专属待办） | 2d | T-018 | 工作台页面 |
| T-024 | 实现操作票创建页（含自动保存） | 2.5d | T-012 | 建票表单页 |
| T-025 | 实现操作票审核页（三审通用） | 2.5d | T-015 | 审核页 |
| T-026 | 实现操作票查询页（多条件搜索） | 1.5d | T-019 | 查询页 |
| T-027 | 实现操作票详情页 | 1.5d | T-012 | 详情查看页 |
| T-028 | 实现响应式布局适配（PC→移动端） | 2d | T-021 | 移动端完整可用 |
| T-029 | 实现权限控制的按钮级展示 | 1d | T-006 | 角色差异化 UI |
| T-030 | 编写前端组件单元测试 | 1.5d | T-024~T-029 | 测试覆盖 > 80% |

**前端组件树（核心）**：

```
App
├── AuthLayout
│   └── LoginPage
└── MainLayout (响应式)
    ├── Sidebar/Navbar (角色差异化)
    ├── Workbench
    │   ├── TodoList (待办卡片列表)
    │   └── QuickStats (快捷统计)
    ├── TicketCreatePage
    │   ├── BasicInfoForm
    │   ├── OperationItemList (拖拽排序)
    │   ├── HazardList
    │   ├── ToolList
    │   └── AutoSaveIndicator
    ├── TicketReviewPage
    │   ├── TicketFullView (只读)
    │   ├── ReviewActionBar (通过/驳回)
    │   └── LockStatusBanner (并发锁定)
    ├── TicketQueryPage
    │   ├── SearchFilters
    │   └── TicketTable
    └── TicketDetailPage
        └── TicketTimeline (全生命周期)
```

**Sprint 3 验收标准**：

```
✅ 工作台展示当前用户的待办事项
✅ 建票页完整可用（含自动保存）
✅ 审核页支持通过/驳回/编辑
✅ 查询页支持多条件模糊搜索
✅ 移动端布局适配完成（核心功能可操作）
✅ 不同角色看到的按钮/菜单不同
```

---

### 4.4 Sprint 4：执行模块 + 端到端集成（第7-8周）

**目标**：现场执行功能完整可用，全流程打通

| 任务 ID | 任务 | 工时估计 | 依赖 | 输出 |
|---------|------|----------|------|------|
| T-031 | 实现操作执行页（操作人端） | 3d | T-012 | 执行页（逐条操作+标记） |
| T-032 | 实现操作监控页（监护人端） | 1.5d | T-031 | 实时进度监控页 |
| T-033 | 实现音视频/图片上传组件 | 2d | — | 文件上传组件 |
| T-034 | 实现数据总召校验 API + 前端 | 2d | T-031 | 校验页 + 异常修复 |
| T-035 | 实现端到端流程集成测试 | 2d | T-031~T-034 | 全链路自动化测试 |
| T-036 | 实现前端错误边界 + 全局异常处理 | 1d | T-031 | 优雅的错误提示 |
| T-037 | 实现网络状态检测 + 离线提示 | 0.5d | — | 网络异常 UI |
| T-038 | 实现操作日志展示（时间线视图） | 1d | T-012 | 操作历史时间线 |
| T-039 | 性能优化：列表虚拟滚动、图片懒加载 | 1.5d | T-031 | 优化后性能达标 |
| T-040 | 编写 E2E 测试（Playwright） | 2d | T-035 | 核心流程 E2E 覆盖 |

**Sprint 4 验收标准**：

```
✅ 操作人可逐条执行操作并标记状态
✅ 音视频/图片上传成功存储在数据库
✅ 监护人可实时查看执行进度
✅ 数据总召校验可检测数据异常并修复
✅ 端到端流程：建票→审核→指令→执行→校验 完整通过
✅ E2E 测试覆盖 3 条核心路径
```

---

### 4.5 Sprint 5：测试 + 修复 + 发布（第9-10周）

**目标**：生产就绪，安全稳定可发布

| 任务 ID | 任务 | 工时估计 | 依赖 | 输出 |
|---------|------|----------|------|------|
| T-041 | 全量回归测试 | 2d | T-040 | 零 P0/P1 Bug |
| T-042 | 性能测试（审核页 ≤ 2秒，查询 ≤ 3秒） | 1.5d | T-039 | 性能报告 |
| T-043 | 安全扫描 + 渗透测试 | 2d | — | 安全报告 |
| T-044 | 修复所有 P0/P1 缺陷 | 2d | T-041~T-043 | Bug 修复 |
| T-045 | 编写用户操作手册 | 1.5d | — | 操作手册文档 |
| T-046 | 部署预发布环境 + UAT | 2d | T-044 | UAT 签核 |
| T-047 | 生产环境部署 | 1d | T-046 | 生产上线 |
| T-048 | MVP 发布复盘 | 0.5d | T-047 | 复盘报告 |

**Sprint 5 验收标准**：

```
✅ 零 P0/P1 缺陷
✅ 性能指标达标（审核页 ≤ 2秒，查询 ≤ 3秒）
✅ 安全扫描通过
✅ UAT 签核完成
✅ 操作手册发布
✅ 生产环境部署成功
```

---

## 5. 组件分解与任务清单

### 5.1 完整组件地图

```
┌──────────────────────────────────────────────────────────────────┐
│                         前端 (React)                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ 认证    │ │ 工作台  │ │ 建票    │ │ 审核    │ │ 执行    │  │
│  │ 模块    │ │ 模块    │ │ 模块    │ │ 模块    │ │ 模块    │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ 查询    │ │ 通用    │ │ 数据    │ │ 共享    │              │
│  │ 模块    │ │ 组件    │ │ 上传    │ │ 工具    │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
└──────────────────────────────┬───────────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼───────────────────────────────────┐
│                       后端 (NestJS)                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   API 网关层                              │   │
│  │  AuthGuard │ RolesGuard │ RateLimiter │ RequestValidator│   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │操作票  │ │审核流程│ │执行同步│ │待办    │ │文件    │       │
│  │服务    │ │服务    │ │服务    │ │服务    │ │服务    │       │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                  │
│  │状态机  │ │人员    │ │统计    │ │校验    │                  │
│  │引擎    │ │服务    │ │服务    │ │服务    │                  │
│  └────────┘ └────────┘ └────────┘ └────────┘                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                        数据层 (Prisma + PostgreSQL)               │
│  操作票 │ 操作项 │ 危险源 │ 工器具 │ 日志 │ 副本 │ 人员表 │ ... │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 按优先级的功能清单

#### P0（MVP 必需）

| 功能 | 前端 | 后端 | 数据 | 测试 |
|------|------|------|------|------|
| 用户登录/认证 | 登录页 | JWT 认证模块 | 用户表 | 登录 E2E |
| 操作票创建 | 建票表单页 | POST /tickets | 操作票表 + 子表 | 创建 GWT |
| 提交送审 | 送审按钮 | POST /submit | 状态迁移 | 送审 GWT |
| 监护人审核 | 审核页 | POST /review | 审核锁定 | 审核 GWT |
| 批准人审核 | 审核页（复用） | POST /review | 状态迁移 | 审核 GWT |
| 下达指令 | 指令按钮 | POST /dispatch | 锁定+下令时间 | 指令 GWT |
| 操作执行 | 执行页 | PUT /items + POST /media | 执行数据 | 执行 GWT |
| 数据校验 | 校验页 | POST /verify | 校验状态 | 校验 GWT |
| 操作票查询 | 查询页 | GET /tickets | 多索引 | 查询 GWT |
| 待办提醒 | 工作台 | 待办服务 | 待办视图 | 待办 GWT |
| 操作票作废 | 作废按钮 | POST /abort | 作废状态 | 作废 GWT |

#### P1（v1.1 增强）

| 功能 | 工时估计 | 说明 |
|------|----------|------|
| 发令人审核升级 | 2d | 审批通过后展示"下达指令"按钮 |
| 数据断点续传 | 3d | 分片上传 + 校验和 + 断点续传 |
| 操作结果推送（三峡行云） | 3d | 外部 API 集成 + 重试机制 |
| 操作票统计 | 3d | 图表展示 + 多维度 + 导出 |
| 操作中止 + 副本创建 | 4d | 中止标记 + 副本生成 + 交接 |
| 操作票暂存续编 | 1d | 跨 session 草稿恢复 |

#### P2（v2.0 高级）

| 功能 | 工时估计 | 说明 |
|------|----------|------|
| PDF 归档 | 3d | 模板渲染 + 结构化 PDF |
| 副本审核 + 执行 | 4d | 副本全流程 |
| 对外数据接口 | 3d | 标准化查询 API + API Key |
| 人员信息管理 | 2d | 管理后台 CRUD |

---

## 6. 数据层实施计划

### 6.1 Prisma Schema 核心模型

```prisma
// 以下为核心模型骨架，完整版本见 data-model.md

model OperationTicket {
  ticketId       String   @id @map("ticket_id")
  taskName       String   @map("task_name")
  status         TicketStatus @default(DRAFT)
  operatorId     String   @map("operator_id")
  supervisorId   String   @map("supervisor_id")
  approverId     String?
  dispatcherId   String?
  basicInfo      Json?    @map("basic_info")
  workTicketNo   String?  @map("work_ticket_no")
  dispatchTime   DateTime? @map("dispatch_time")
  remarks        String?
  mediaData      Byte[]?  @map("media_data")    // BLOB 存储
  tagData        Json?    @map("tag_data")
  equipmentState Json?    @map("equipment_state")
  archivedAt     DateTime? @map("archived_at")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  items          OperationItem[]
  hazards        Hazard[]
  tools          Tool[]
  logs           OperationLog[]
  copies         OperationCopy[]

  @@index([status])
  @@index([operatorId])
  @@index([createdAt])
  @@index([status, createdAt])
  @@map("operation_tickets")
}

enum TicketStatus {
  DRAFT             // 建立
  PENDING_SUPERVISOR  // 待审核（监护人）
  PENDING_APPROVER    // 待审核（批准人）
  PENDING_DISPATCHER  // 待审核（发令人）
  PENDING_EXECUTE     // 待执行
  EXECUTING           // 执行中
  SUSPENDED           // 中止
  COMPLETED           // 已完成
  VOIDED              // 作废
  REJECTED            // 建立（驳回）
}
```

### 6.2 迁移执行计划

| 步骤 | 动作 | 回滚方案 |
|------|------|----------|
| 1 | `npx prisma migrate dev --name init` | `migrate rollback` |
| 2 | 导入基础人员数据（种子脚本） | `db seed --reset` |
| 3 | 创建数据库索引 | 包含在 migrate 中 |
| 4 | 验证约束和引用完整性 | 手动校验脚本 |

### 6.3 数据访问层

| Repository | 主要方法 | 用途 |
|------------|----------|------|
| TicketRepository | findById, findByStatus, findByOperator, search, create, updateStatus | 操作票 CRUD |
| ItemRepository | findByTicketId, updateStatus, batchUpdate | 操作项管理 |
| ReviewRepository | createLock, releaseLock, isLocked | 审核锁定 |
| TodoRepository | findByUserId, markRead, create | 待办管理 |
| LogRepository | findByTicketId, create | 操作日志 |

---

## 7. API 层实施计划

### 7.1 实施顺序（按依赖）

```
第1批（基础，Sprint 1-2）
├── POST   /api/v1/auth/login          ← 认证基础
├── POST   /api/v1/auth/refresh
├── GET    /api/v1/personnel           ← 人员查询（审核时选人）
├── POST   /api/v1/personnel
├── GET    /api/v1/tickets             ← 列表+查询
├── POST   /api/v1/tickets             ← 创建
├── GET    /api/v1/tickets/{id}        ← 详情
├── PUT    /api/v1/tickets/{id}        ← 更新（建立状态）

第2批（流程，Sprint 2）
├── POST   /api/v1/tickets/{id}/submit  ← 送审
├── POST   /api/v1/tickets/{id}/review  ← 审核（三级通用）
├── POST   /api/v1/tickets/{id}/dispatch ← 指令下达
├── POST   /api/v1/tickets/{id}/abort   ← 作废
├── GET    /api/v1/todos                 ← 待办列表
├── PUT    /api/v1/todos/{id}/read       ← 标记已读

第3批（执行，Sprint 4）
├── GET    /api/v1/tickets/{id}/items         ← 操作项列表
├── PUT    /api/v1/tickets/{id}/items/{itemId} ← 更新执行状态
├── POST   /api/v1/tickets/{id}/media          ← 上传音视频
├── POST   /api/v1/tickets/{id}/verify         ← 数据校验

第4批（增强，v1.1）
├── POST   /api/v1/tickets/{id}/abort          ← 操作中止
├── POST   /api/v1/copies                       ← 创建副本
├── GET    /api/v1/statistics/tickets           ← 统计
└── POST   /api/v1/tickets/{id}/push-result     ← 三峡行云推送
```

### 7.2 API 实现模板（以 tickets POST 为例）

```typescript
// 控制器层
@Post()
@UseGuards(AuthGuard, RolesGuard)
@Roles('operator')
async create(@Body() dto: CreateTicketDto, @User() user: JwtPayload) {
  // 1. 校验请求体（class-validator）
  // 2. 调用 TicketService.create()
  // 3. 返回 201 + TicketResponse
}

// 服务层
@Injectable()
class TicketService {
  constructor(
    private prisma: PrismaService,
    private stateMachine: StateMachineService,
    private ticketNoGenerator: TicketNoGenerator,
  ) {}

  async create(dto: CreateTicketDto, userId: string): Promise<TicketResponse> {
    // 1. 生成票号
    const ticketNo = await this.ticketNoGenerator.generate();
    // 2. 创建操作票（状态 = DRAFT）
    const ticket = await this.prisma.operationTicket.create({
      data: {
        ticketId: ticketNo,
        ...dto,
        operatorId: userId,
        status: TicketStatus.DRAFT,
      },
      include: { items: true },
    });
    // 3. 记录操作日志
    await this.logService.log(ticketNo, '创建操作票', userId);
    // 4. 返回
    return this.toResponse(ticket);
  }
}
```

---

## 8. 前端实施计划

### 8.1 路由设计

```typescript
// 路由配置（按角色过滤）
const routes = [
  { path: '/login', component: LoginPage, public: true },
  { path: '/', component: Workbench, roles: ['operator', 'supervisor', 'approver', 'dispatcher'] },
  { path: '/tickets/create', component: TicketCreatePage, roles: ['operator'] },
  { path: '/tickets/:id/review', component: TicketReviewPage, roles: ['supervisor', 'approver', 'dispatcher'] },
  { path: '/tickets/:id/execute', component: TicketExecutePage, roles: ['operator'] },
  { path: '/tickets/:id/monitor', component: TicketMonitorPage, roles: ['supervisor', 'dispatcher'] },
  { path: '/tickets/:id/verify', component: TicketVerifyPage, roles: ['operator'] },
  { path: '/tickets/:id', component: TicketDetailPage, roles: ['*'] },
  { path: '/tickets', component: TicketQueryPage, roles: ['*'] },
  { path: '/statistics', component: StatisticsPage, roles: ['dispatcher', 'admin'] },
  { path: '/personnel', component: PersonnelPage, roles: ['admin'] },
];
```

### 8.2 共享组件清单

| 组件 | 用途 | 复用范围 |
|------|------|----------|
| `TicketStatusTag` | 状态标签（颜色编码） | 全系统 |
| `TicketTimeline` | 全生命周期时间线 | 详情页 |
| `OperationItemList` | 操作步骤列表（拖拽排序） | 建票 + 执行 |
| `MediaUploader` | 音视频/图片上传 | 执行页 |
| `ReviewActionBar` | 通过/驳回按钮组 | 审核页 |
| `TodoCard` | 待办卡片 | 工作台 |
| `SearchForm` | 多条件搜索表单 | 查询页 |
| `RoleProtected` | 权限包裹组件 | 路由 + 按钮 |
| `ResponsiveLayout` | 响应式布局容器 | 全局 |
| `AutoSaveIndicator` | 自动保存状态指示 | 建票页 |

### 8.3 响应式设计断点

| 断点 | 宽度 | 目标设备 | 布局变化 |
|------|------|----------|----------|
| `xs` | < 576px | 手机竖屏 | 单列布局，底部导航，全屏表单 |
| `sm` | ≥ 576px | 手机横屏 | 单列布局，顶部导航 |
| `md` | ≥ 768px | 平板 | 双列布局，侧边栏展开 |
| `lg` | ≥ 992px | 小屏笔记本 | 完整侧边栏，多列表格 |
| `xl` | ≥ 1200px | 桌面大屏 | 最大宽度，完整功能展示 |

### 8.4 移动端关键适配

| 功能 | PC 端 | 移动端 |
|------|-------|--------|
| 导航 | 左侧固定侧边栏 | 底部 Tab Bar + 顶部汉堡菜单 |
| 表格 | 多列全宽表格 | 卡片列表展示 |
| 表单 | 一行多字段 | 单列全宽字段 |
| 审核操作 | 右侧审核面板 | 底部浮动操作栏 |
| 操作执行 | 分步骤全屏展示 | 全屏步骤向导 |
| 文件上传 | 拖拽 + 点击 | 相机/相册调用 |

---

## 9. 状态机引擎设计

### 9.1 引擎架构

```
┌──────────────────────────────────────────────────────┐
│                   状态机引擎                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │ 状态定义   │  │ 迁移规则   │  │ 守卫条件   │    │
│  │ 表        │  │ 表        │  │ 链        │    │
│  └────────────┘  └────────────┘  └────────────┘    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │ 动作      │  │ 事件      │  │ 历史记录   │    │
│  │ 执行器    │  │ 分发器    │  │ 追踪器    │    │
│  └────────────┘  └────────────┘  └────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 9.2 状态迁移表（核心定义）

| 当前状态 | 事件 | 守卫条件 | 目标状态 | 执行动作 |
|----------|------|----------|----------|----------|
| DRAFT | SUBMIT | 必填字段完整 | PENDING_SUPERVISOR | 生成待办→监护人 |
| PENDING_SUPERVISOR | APPROVE | 监护人已签章 | PENDING_APPROVER | 生成待办→批准人 |
| PENDING_SUPERVISOR | REJECT | 填写驳回意见 | REJECTED | 通知操作人 |
| PENDING_APPROVER | APPROVE | 批准人已签章 | PENDING_DISPATCHER | 生成待办→发令人 |
| PENDING_APPROVER | REJECT | 填写驳回意见 | REJECTED | 通知操作人 |
| PENDING_DISPATCHER | APPROVE_AND_DISPATCH | 发令人已签章 | PENDING_EXECUTE | 写入下令时间，锁定信息，通知操作人 |
| PENDING_DISPATCHER | REJECT | 填写驳回意见 | REJECTED | 通知操作人 |
| PENDING_EXECUTE | START_EXECUTE | 操作人身份验证 | EXECUTING | 启动数据同步 |
| EXECUTING | COMPLETE | 所有操作项已完成 | COMPLETED | 触发数据校验 |
| EXECUTING | SUSPEND | 填写中止备注 | SUSPENDED | 标记未执行内容 |
| COMPLETED | VERIFY_PASS | 数据一致性100% | ARCHIVED | 写入归档时间 |
| COMPLETED | VERIFY_FAIL | 存在数据异常 | COMPLETED | 标记异常项 |
| REJECTED | RESUBMIT | 已根据意见修改 | PENDING_SUPERVISOR | 重新进入审核 |
| DRAFT | VOID | — | VOIDED | 记录作废信息 |
| PENDING_EXECUTE | VOID | — | VOIDED | 记录作废信息 |

### 9.3 状态机配置化实现

```typescript
// 状态机配置（声明式）
const ticketStateMachine: StateMachineConfig<TicketStatus, TicketEvent> = {
  initialState: TicketStatus.DRAFT,
  states: {
    [TicketStatus.DRAFT]: {
      allowedEvents: [TicketEvent.SUBMIT, TicketEvent.VOID],
      transitions: {
        [TicketEvent.SUBMIT]: {
          target: TicketStatus.PENDING_SUPERVISOR,
          guard: 'checkRequiredFields',
          action: 'notifySupervisor',
        },
        [TicketEvent.VOID]: {
          target: TicketStatus.VOIDED,
          guard: 'checkNotExecuted',
          action: 'recordVoidInfo',
        },
      },
    },
    // ... 其余状态定义
  },
  guards: {
    checkRequiredFields: async (context) => {
      // 校验必填字段
      return context.ticket.taskName != null && context.ticket.items.length > 0;
    },
    checkNotExecuted: async (context) => {
      return context.ticket.status === TicketStatus.DRAFT
          || context.ticket.status === TicketStatus.PENDING_EXECUTE;
    },
  },
  actions: {
    notifySupervisor: async (context) => {
      await todoService.create(context.ticket.supervisorId, context.ticket.ticketId);
    },
    recordVoidInfo: async (context) => {
      await logService.log(context.ticket.ticketId, '作废操作票', context.userId);
    },
  },
};
```

---

## 10. 测试策略

### 10.1 测试金字塔

```
         ╱╲
        ╱ E2E ╲           ← 3-5 条核心路径，Playwright
       ╱────────╲
      ╱  集成测试  ╲       ← API 端点测试，覆盖 15 个用例
     ╱──────────────╲
    ╱   单元测试      ╲    ← 服务层 + 状态机 + 工具函数
   ╱────────────────────╲
  ╱    类型检查 (TypeScript) ╲ ← 编译时验证
 ╱────────────────────────────╲
```

### 10.2 测试覆盖计划

| 测试层级 | 覆盖范围 | 工具 | 目标覆盖率 |
|----------|----------|------|-----------|
| **单元测试** | 状态机引擎、服务层、工具函数、组件渲染 | Jest | ≥ 90% |
| **集成测试** | API 端点（15 个用例）、数据库操作、文件上传 | Jest + Supertest | 100% 端点覆盖 |
| **E2E 测试** | 建票→审核→指令→执行→校验 核心链路 | Playwright | 3 条核心路径 |
| **性能测试** | 审核页加载、查询响应、数据上传 | k6 / Lighthouse | 达 NFR 目标 |
| **安全测试** | JWT 鉴权、RBAC 越权、XSS、SQL 注入 | OWASP ZAP | 零高危 |

### 10.3 测试场景示例（E2E）

```
测试 1：正常流程 - 操作人创建操作票并完成全流程
  1. 操作人登录 → 创建操作票 → 提交送审
  2. 监护人登录 → 打开待办 → 审核通过
  3. 批准人登录 → 打开待办 → 审核通过
  4. 发令人登录 → 打开待办 → 审核通过 + 下达指令
  5. 操作人登录 → 查看待执行操作票 → 逐条执行 → 上传数据 → 完成
  6. 系统自动校验 → 校验通过 → 归档
  → 验证：操作票状态最终为"已完成"

测试 2：驳回流程 - 监护人驳回操作票
  1. 操作人创建并提交送审
  2. 监护人驳回并填写意见
  3. 操作人查看驳回意见 → 修改 → 重新提交
  → 验证：操作票回到待审核状态

测试 3：并发审核锁定
  1. 审核人 A 打开审核页面（锁定操作票）
  2. 审核人 B 尝试打开同一操作票
  → 验证：审核人 B 看到"XX正在审核"提示
```

### 10.4 GWT 验收条件映射

| 用户故事 | GWT 场景数 | 测试类型 | 状态 |
|----------|-----------|----------|------|
| US-001 创建操作票 | 4 | 单元 + E2E | 规划 |
| US-002 提交送审 | 2 | 集成 + E2E | 规划 |
| US-003 监护人审核 | 3 | 单元 + 集成 | 规划 |
| US-006 下达指令 | 2 | 集成 + E2E | 规划 |
| US-007 操作执行 | 4 | 集成 + E2E | 规划 |
| US-011 数据校验 | 2 | 集成 | 规划 |
| US-014 操作票查询 | 2 | 集成 | 规划 |

---

## 11. 风险管理与缓解

### 11.1 风险矩阵

| 风险 | 概率 | 影响 | 等级 | 缓解措施 |
|------|------|------|------|----------|
| **R1**: 移动端响应式体验不佳 | 中 | 高 | 🔴 | Sprint 3 专门安排移动端适配任务；使用真实移动设备进行 UI 测试 |
| **R2**: 音视频 BLOB 存储导致数据库性能下降 | 中 | 中 | 🟡 | 实施存储监控告警；MVP 后评估迁移到对象存储 |
| **R3**: 并发审核锁定测试覆盖不足 | 低 | 高 | 🟡 | 编写专项并发测试用例；压力测试覆盖锁定场景 |
| **R4**: 三峡行云接口联调延迟（v1.1） | 中 | 高 | 🔴 | 提前与对方确认接口规范；设计推送重试+人工补救机制 |
| **R5**: 现场网络不稳定导致数据丢失 | 中 | 中 | 🟡 | 本地缓存 + 断点续传（v1.1）；操作完成后的全量校验机制 |

### 11.2 缓解行动

| 风险 | 行动 | 负责人 | 截止时间 |
|------|------|--------|----------|
| R1 | 在 Sprint 3 结束时进行移动端 UX 评审 | 前端负责人 | Sprint 3 末 |
| R2 | 设置数据库容量监控告警（> 80% 触发） | 后端负责人 | Sprint 1 |
| R3 | 编写并发审核的专项压力测试脚本 | QA 负责人 | Sprint 4 |
| R4 | 发起与三峡行云团队的技术对接会议 | PM | MVP 发布前 |
| R5 | MVP 发布前完成基础本地缓存机制 | 后端负责人 | Sprint 4 |

---

## 12. 完成定义

### 12.1 每个 Story 的完成定义（DoD）

```
[ ] 所有 Gherkin 验收条件通过自动化测试
[ ] 代码审查通过并合并到 main 分支
[ ] 单元测试覆盖率 ≥ 80%
[ ] 集成测试覆盖所有关联 API 端点
[ ] 前端组件在 PC 和移动端均通过 UI 测试
[ ] 无 P0/P1 缺陷
[ ] 操作日志记录完整
[ ] 相关文档已更新
```

### 12.2 MVP 发布完成定义

```
[ ] 所有 P0 需求的验收条件通过
[ ] 零 P0/P1 缺陷
[ ] 单元测试覆盖率 > 80%
[ ] E2E 测试覆盖 3 条核心路径
[ ] 性能指标达标（NFR-P01/P02/P03）
[ ] 安全扫描通过（零高危）
[ ] UAT 签核完成
[ ] 用户操作手册已发布
[ ] 生产环境部署完成
```

### 12.3 关键里程碑

| 里程碑 | 时间 | 验收标准 | 责任人 |
|--------|------|----------|--------|
| **M1**: Schema 冻结 | Sprint 1 Day 5 | 所有数据模型评审通过 | 后端负责人 |
| **M2**: API 冻结 | Sprint 2 Day 10 | 所有 MVP API 通过集成测试 | 后端负责人 |
| **M3**: UI 冻结 | Sprint 3 Day 10 | 所有 MVP 页面在 PC+移动端完成 UI review | 前端负责人 |
| **M4**: 全流程贯通 | Sprint 4 Day 8 | 端到端 E2E 测试通过 | QA 负责人 |
| **M5**: 发布就绪 | Sprint 5 Day 8 | 所有 DoD 条件满足 | 项目经理 |

---

## 附录

### A. 估算汇总

| 阶段 | 工时 | 日历时间 | 并行度 | 团队规模 |
|------|------|----------|--------|----------|
| Sprint 1 | 13.5 人天 | 2 周 | 2-3 人 | 2 前端 + 2 后端 + 1 QA |
| Sprint 2 | 16.5 人天 | 2 周 | 2-3 人 | 同上 |
| Sprint 3 | 17 人天 | 2 周 | 2-3 人 | 同上 |
| Sprint 4 | 17 人天 | 2 周 | 2-3 人 | 同上 |
| Sprint 5 | 13 人天 | 2 周 | 1-2 人 | 同上 |
| **MVP 总计** | **~77 人天** | **10 周** | — | — |

### B. 目录结构建议

```
operation-ticket-system/
├── frontend/                    # React 前端
│   ├── src/
│   │   ├── components/          # 共享组件
│   │   ├── pages/               # 页面组件
│   │   ├── hooks/               # 自定义 Hook
│   │   ├── services/            # API 调用层
│   │   ├── stores/              # 状态管理
│   │   ├── types/               # TypeScript 类型
│   │   └── utils/               # 工具函数
│   ├── e2e/                     # Playwright 测试
│   └── package.json
├── backend/                     # NestJS 后端
│   ├── src/
│   │   ├── modules/             # 业务模块
│   │   │   ├── auth/            # 认证模块
│   │   │   ├── tickets/         # 操作票模块
│   │   │   ├── review/          # 审核模块
│   │   │   ├── execution/       # 执行模块
│   │   │   ├── todo/            # 待办模块
│   │   │   └── personnel/       # 人员模块
│   │   ├── common/              # 通用模块
│   │   │   ├── guards/          # 守卫
│   │   │   ├── decorators/      # 装饰器
│   │   │   └── filters/         # 过滤器
│   │   ├── engine/              # 状态机引擎
│   │   └── prisma/              # Prisma 服务
│   ├── prisma/
│   │   └── schema.prisma        # 数据模型
│   └── package.json
├── docker-compose.yml           # 开发环境
├── IMPLEMENTATION_PLAN.md       # 本文档
└── .kiro/specs/                 # 需求规格
```

### C. 参考文档

| 文档 | 位置 | 用途 |
|------|------|------|
| PRD | `.kiro/specs/operation-ticket-system/prd.md` | 产品需求总纲 |
| 需求分析 | `.kiro/specs/operation-ticket-system/requirements.md` | 用户故事 + 用例 + NFR |
| 数据模型 | `.kiro/specs/operation-ticket-system/data-model.md` | 实体定义 + 关系 + 约束 |
| API 规范 | `.kiro/specs/operation-ticket-system/api.yaml` | OpenAPI 3.0 契约 |
| RTM | `.kiro/specs/operation-ticket-system/rtm.md` | 需求追溯矩阵 |
| 澄清日志 | `.kiro/specs/operation-ticket-system/clarification.md` | 8 项关键决策 |
| 验证报告 | `.kiro/specs/operation-ticket-system/validation.md` | 5 维度质量评估 |

---

> **下一步**：本计划经团队评审确认后，进入 Sprint 1 执行阶段。
> 执行时将根据实际进度和发现调整计划，但范围变更需通过变更控制流程。
