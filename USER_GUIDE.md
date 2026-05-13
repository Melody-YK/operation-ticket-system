# 操作票管理系统使用说明书

本文档面向本地演示和面试验收，说明如何启动系统，以及各个页面如何使用。

## 1. 启动系统

### 1.1 启动数据库

在项目根目录执行：

```bash
docker compose up -d
```

确认数据库健康：

```bash
docker compose ps
```

### 1.2 启动后端

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm start:dev
```

后端地址：

```text
http://localhost:3000/api/v1
```

### 1.3 启动前端

另开一个终端：

```bash
cd frontend
pnpm install
pnpm dev
```

前端地址：

```text
http://localhost:5173
```

如果 `localhost` 打不开，可尝试：

```text
http://127.0.0.1:5173
```

## 2. 测试账号

开发环境登录只需要填写人员 ID，密码任意。

| 人员ID | 姓名 | 角色 | 主要用途 |
|---|---|---|---|
| zs | 张三 | 操作人 | 创建操作票、提交送审、执行操作 |
| zl | 赵六 | 监护人 | 第一级审核、查看监控 |
| sb | 孙八 | 批准人 | 第二级审核 |
| ws | 吴十 | 发令人 | 第三级审核、下达指令、查看监控/校验 |

## 3. 页面总览

| 页面 | 路径 | 主要角色 | 用途 |
|---|---|---|---|
| 登录页 | `/login` | 全部 | 输入人员 ID 登录 |
| 工作台 | `/workbench` | 全部 | 查看待办、统计、最近操作票 |
| 创建操作票 | `/tickets/create` | 操作人 | 新建操作票、填写操作步骤 |
| 查询操作票 | `/tickets/query` | 全部 | 多条件查询操作票 |
| 审核/详情页 | `/tickets/:id` | 全部 | 查看详情、提交、审核、下令 |
| 操作执行页 | `/tickets/:id/execute` | 操作人 | 开始执行、逐条完成/跳过操作项 |
| 执行监控页 | `/tickets/:id/monitor` | 监护人/发令人 | 查看执行进度和时间线 |
| 数据校验页 | `/tickets/:id/verify` | 发令人/相关角色 | 完成后校验、归档或标记异常 |

## 4. 推荐演示流程

### Step 1：操作人登录

1. 打开 `http://localhost:5173/login`
2. 点击或输入人员 ID：`zs`
3. 点击登录
4. 进入工作台

### Step 2：创建操作票

1. 左侧菜单点击「创建操作票」
2. 填写任务名称，例如：`1号主变停电操作`
3. 选择/填写：
   - 监护人：`zl`
   - 批准人：`sb`
   - 发令人：`ws`
4. 添加操作步骤，例如：
   - 检查现场安全措施
   - 断开相关开关
   - 确认设备状态
5. 保存/创建后，系统生成操作票

### Step 3：提交送审

1. 进入操作票详情页 `/tickets/:id`
2. 操作人点击「提交送审」
3. 操作票状态变为：`待审核（监护人）`

### Step 4：监护人审核

1. 退出登录
2. 使用 `zl` 登录
3. 进入工作台或查询页，找到待审核操作票
4. 打开详情页
5. 点击「审核通过」
6. 状态变为：`待审核（批准人）`

如需演示驳回，可点击「驳回」并填写意见；驳回后操作票回到操作人修改/重提。

### Step 5：批准人审核

1. 使用 `sb` 登录
2. 找到状态为 `待审核（批准人）` 的操作票
3. 打开详情页
4. 点击「审核通过」
5. 状态变为：`待审核（发令人）`

### Step 6：发令人审核并下令

1. 使用 `ws` 登录
2. 找到状态为 `待审核（发令人）` 的操作票
3. 打开详情页
4. 点击「审核通过」
5. 点击「下达操作指令」
6. 系统写入下令时间，操作票状态变为：`待执行`

### Step 7：操作人执行

1. 使用 `zs` 登录
2. 找到状态为 `待执行` 的操作票
3. 进入执行页：`/tickets/:id/execute`
4. 点击「开始执行」
5. 逐条点击「执行完成」或「跳过此项」
6. 全部完成后点击「全部完成，提交校验」
7. 操作票进入校验/完成阶段

### Step 8：监控执行进度

1. 使用 `zl` 或 `ws` 登录
2. 进入 `/tickets/:id/monitor`
3. 查看：
   - 当前操作票状态
   - 执行进度
   - 每个操作项状态
   - 操作时间线

### Step 9：数据校验与归档

1. 使用 `ws` 登录
2. 进入 `/tickets/:id/verify`
3. 查看校验项和操作时间线
4. 可选择：
   - 「校验通过，归档」
   - 「标记异常」
5. 校验通过后，操作票进入归档完成状态

## 5. 各页面说明

### 5.1 登录页

路径：

```text
/login
```

功能：

- 输入人员 ID 登录
- 展示开发测试账号快捷标签
- 登录后保存 token 到浏览器本地存储

常见问题：

- 密码框是禁用状态，开发环境密码任意
- 登录失败时检查后端是否启动、数据库是否已 seed

### 5.2 工作台

路径：

```text
/workbench
```

功能：

- 展示当前用户角色
- 展示待审核、执行中、已完成、被驳回数量
- 展示最近操作票
- 操作人可快速进入「新建操作票」

角色差异：

- 操作人：可看到所有自己相关操作票，并能创建操作票
- 监护人：重点看到待监护审核票
- 批准人：重点看到待批准票
- 发令人：重点看到待发令审核票

### 5.3 创建操作票页

路径：

```text
/tickets/create
```

功能：

- 创建电子操作票
- 填写任务名称、人员、基础信息
- 添加操作步骤
- 关联工作票号

使用建议：

- 至少添加 1 条操作步骤
- 人员 ID 使用种子数据：`zl`、`sb`、`ws`

### 5.4 查询操作票页

路径：

```text
/tickets/query
```

功能：

- 按状态、关键字、人员、时间等条件查询
- 查看列表结果
- 点击进入详情/审核页

### 5.5 审核/详情页

路径：

```text
/tickets/:id
```

功能：

- 查看操作票完整信息
- 查看状态、操作步骤、人员信息
- 操作人可提交送审/重提
- 监护人、批准人、发令人可审核通过或驳回
- 发令人可下达指令

关键状态流转：

```text
DRAFT → PENDING_SUPERVISOR → PENDING_APPROVER → PENDING_DISPATCHER → PENDING_EXECUTE
```

驳回后：

```text
PENDING_* → REJECTED → resubmit → PENDING_SUPERVISOR
```

### 5.6 操作执行页

路径：

```text
/tickets/:id/execute
```

功能：

- 仅适合待执行/执行中的操作票
- 操作人点击「开始执行」
- 逐条标记操作项：
  - 执行完成
  - 跳过此项
- 全部操作项完成后提交校验

对应后端接口：

```text
POST /api/v1/tickets/:id/start-execute
PUT  /api/v1/tickets/:id/items/:itemId
POST /api/v1/tickets/:id/complete
```

### 5.7 执行监控页

路径：

```text
/tickets/:id/monitor
```

功能：

- 查看执行进度百分比
- 查看每一条操作项状态
- 查看操作时间线
- 适合监护人和发令人跟踪现场执行情况

### 5.8 数据校验页

路径：

```text
/tickets/:id/verify
```

功能：

- 查看操作票基本信息
- 查看校验项
- 查看操作时间线
- 校验通过后归档
- 或标记异常数据

对应后端接口：

```text
POST /api/v1/tickets/:id/verify
```

### 5.9 网络状态提示

系统顶部会显示网络状态：

- 在线：正常使用
- 离线：提示网络异常

### 5.10 错误边界

如果前端页面出现运行时异常，系统会显示友好的错误页，而不是整页白屏。

## 6. Sprint 4 已实现功能

Sprint 4 主要实现「执行模块 + 端到端集成」：

### 后端新增

- `POST /tickets/:id/start-execute`：开始执行
- `PUT /tickets/:id/items/:itemId`：逐条更新操作项状态
- `POST /tickets/:id/complete`：完成执行并进入后续校验阶段
- `POST /tickets/:id/verify`：数据校验，通过或标记异常
- `PUT /tickets/:id/media`：现场数据上传的最小实现
- `GET /tickets/:id/timeline`：获取操作时间线
- 新增 `UpdateItemDto`
- 新增 `VerifyTicketDto`
- 完善执行阶段操作日志

### 前端新增

- `TicketExecutePage`：操作执行页
- `TicketMonitorPage`：执行监控页
- `TicketVerifyPage`：数据校验页
- `OperationTimeline`：操作时间线组件
- `NetworkStatus`：网络状态提示组件
- `ErrorBoundary`：前端错误边界
- 路由新增：
  - `/tickets/:id/execute`
  - `/tickets/:id/monitor`
  - `/tickets/:id/verify`

### 当前边界

- 现场数据上传是最小实现，不是完整文件流/对象存储方案
- 数据总召校验是演示级流程，还未接入真实现场终端
- 执行监控是查询式展示，不是 WebSocket 实时推送
- 性能压测、安全扫描、UAT 属于 Sprint 5

## 7. 常见问题

### 7.1 访问后端根路径显示 404

正常。后端根路径不是页面入口。

请访问前端：

```text
http://localhost:5173
```

后端 API 前缀是：

```text
http://localhost:3000/api/v1
```

### 7.2 登录后没有看到操作票

先使用 `zs` 创建操作票，并提交送审。不同角色只能看到自己对应状态的操作票。

### 7.3 前端白屏

请检查：

```bash
cd frontend
pnpm build
pnpm dev
```

并打开浏览器控制台查看错误。

### 7.4 后端连不上数据库

检查 Docker 数据库：

```bash
docker compose ps
docker compose logs postgres
```

确认 `.env` 中数据库地址：

```text
DATABASE_URL="postgresql://ops_user:ops_password@localhost:5432/ops_ticket_db?schema=public"
```

### 7.5 端口冲突

常用端口：

```text
前端：5173
后端：3000
数据库：5432
```

如冲突，先关闭占用进程或修改配置。
