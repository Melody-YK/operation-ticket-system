# 操作票管理系统使用说明书

> 面向本地演示、面试验收和代码讲解的完整用户指南。  
> 系统已完成全部 5 个 Sprint，覆盖：建票 → 三级审核 → 下令 → 现场执行 → 数据校验 → 归档。

---

## 0. 你可以用它演示什么

本系统是一个电力行业「操作票」全生命周期管理 Demo。它不是单页静态原型，而是前后端、数据库、状态机、认证、角色、流程日志都打通的完整小系统。

核心亮点：

1. **四类角色分工清晰**
   - 操作人：建票、提交、执行。
   - 监护人：一级审核、执行监控。
   - 批准人：二级审核。
   - 发令人：三级审核、下令、数据校验。
2. **状态机驱动流程**
   - 10 个业务状态。
   - 16 条有效迁移路径。
   - 非法迁移会被后端拦截，并返回中文提示。
3. **端到端业务闭环**
   - 从草稿建票到最终归档都能在页面上完成。
4. **可讲解、可验收、可扩展**
   - 有 `README.md`、`QUICK_START.md`、`DELIVERY_REPORT.md`、`IMPLEMENTATION_PLAN.md` 和本文档。

---

## 1. 启动系统

### 1.1 环境要求

请先确认本机已安装：

```bash
node -v
pnpm -v
docker --version
docker compose version
```

推荐版本：

| 工具 | 推荐版本 | 用途 |
|---|---:|---|
| Node.js | 24+ | 前后端运行时 |
| pnpm | 11+ | 前端/后端包管理 |
| Docker Desktop | 最新版 | 启动 PostgreSQL |
| 浏览器 | Chrome / Edge / Firefox 最新版 | 访问前端页面 |

本地项目路径：

```bash
cd "/Users/melody/Desktop/tbd和superpowers/interview-requirements-power-test"
```

### 1.2 启动数据库

项目根目录已经提供 `docker-compose.yml`。在项目根目录执行：

```bash
docker compose up -d
```

确认容器状态：

```bash
docker compose ps
```

数据库默认配置：

```text
host: localhost
port: 5432
user: ops_user
password: ops_password
database: ops_ticket_db
```

如果需要查看数据库日志：

```bash
docker compose logs -f postgres
```

### 1.3 配置后端 `.env`

进入后端目录：

```bash
cd backend
```

如果 `.env` 不存在，可创建：

```bash
cat > .env <<'EOF'
DATABASE_URL="postgresql://ops_user:ops_password@localhost:5432/ops_ticket_db?schema=public"
JWT_SECRET="ops-ticket-dev-secret-only"
JWT_EXPIRATION="7d"
EOF
```

说明：

- `DATABASE_URL`：Prisma 连接 PostgreSQL 使用。
- `JWT_SECRET`：开发环境 JWT 签名密钥。
- `JWT_EXPIRATION`：Token 有效期，当前为 7 天。

### 1.4 启动后端

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm start:dev
```

后端 API 地址：

```text
http://localhost:3000/api/v1
```

启动成功后，终端会保持监听状态。不要关闭该终端。

### 1.5 启动前端

另开一个终端，在项目根目录执行：

```bash
cd frontend
pnpm install
pnpm dev
```

前端默认地址：

```text
http://localhost:5173
```

如果 `localhost` 打不开，可尝试：

```text
http://127.0.0.1:5173
```

---

## 2. 开发测试账号

开发环境登录只需要填写人员 ID，密码任意。

| 人员 ID | 姓名 | 角色 | 英文枚举 | 主要用途 |
|---|---|---|---|---|
| `zs` | 张三 | 操作人 | `OPERATOR` | 创建操作票、提交送审、执行操作 |
| `zl` | 赵六 | 监护人 | `SUPERVISOR` | 第一级审核、查看执行监控 |
| `sb` | 孙八 | 批准人 | `APPROVER` | 第二级审核 |
| `ws` | 吴十 | 发令人 | `DISPATCHER` | 第三级审核、下令、数据校验 |

种子数据里还包含其他人员，可用于扩展演示：

| 人员 ID | 姓名 | 角色 |
|---|---|---|
| `ls` | 李四 | 操作人 |
| `ww` | 王五 | 操作人 |
| `qq` | 钱七 | 监护人 |
| `zj` | 周九 | 批准人 |
| `zsy` | 郑十一 | 发令人 |

---

## 3. 页面总览

| 页面 | 路径 | 主要角色 | 用途 |
|---|---|---|---|
| 登录页 | `/login` | 全部 | 输入人员 ID 登录，保存 JWT |
| 工作台 | `/workbench` | 全部 | 查看统计、最近操作票、角色化入口 |
| 创建操作票 | `/tickets/create` | 操作人 | 新建草稿、填写人员和操作步骤 |
| 查询操作票 | `/tickets/query` | 全部 | 按状态、关键字、人员、时间筛选 |
| 审核/详情页 | `/tickets/:id` | 全部 | 查看详情、日志；按角色执行审核操作 |
| 操作执行页 | `/tickets/:id/execute` | 操作人 | 开始执行、逐项完成/跳过、提交校验 |
| 执行监控页 | `/tickets/:id/monitor` | 监护人/发令人 | 查看进度、操作项状态、时间线 |
| 数据校验页 | `/tickets/:id/verify` | 发令人 | 校验通过归档或标记异常 |

> `:id` 表示操作票票号，例如 `OP-20260514-00001`。

---

## 4. 业务状态说明

### 4.1 状态列表

| 状态枚举 | 中文名称 | 说明 |
|---|---|---|
| `DRAFT` | 建立 | 操作人刚创建，尚未提交 |
| `PENDING_SUPERVISOR` | 待审核（监护人） | 已提交，等待监护人审核 |
| `PENDING_APPROVER` | 待审核（批准人） | 监护人已通过，等待批准人审核 |
| `PENDING_DISPATCHER` | 待审核（发令人） | 批准人已通过，等待发令人审核/下令 |
| `PENDING_EXECUTE` | 待执行 | 发令人已通过并下令，等待操作人执行 |
| `EXECUTING` | 执行中 | 操作人已经开始现场执行 |
| `COMPLETED` | 已完成 | 执行完成；校验通过/异常后仍保持完成态 |
| `SUSPENDED` | 中止 | 执行中止，当前作为状态机能力保留 |
| `VOIDED` | 作废 | 草稿/待执行/驳回状态下可作废 |
| `REJECTED` | 建立（驳回） | 审核被驳回，操作人可修改后重提 |

### 4.2 主流程

```text
DRAFT
  → submit
PENDING_SUPERVISOR
  → approve
PENDING_APPROVER
  → approve
PENDING_DISPATCHER
  → approve_and_dispatch
PENDING_EXECUTE
  → start_execute
EXECUTING
  → complete
COMPLETED
  → verify_pass / verify_fail
COMPLETED
```

对应中文流程：

```text
建立 → 提交送审 → 监护人审核 → 批准人审核 → 发令人审核并下令 → 待执行 → 执行中 → 已完成 → 校验/归档
```

### 4.3 驳回重提流程

任一审核节点都可以驳回：

```text
PENDING_SUPERVISOR / PENDING_APPROVER / PENDING_DISPATCHER
  → reject
REJECTED
  → resubmit
PENDING_SUPERVISOR
```

说明：

- 驳回后状态变为「建立（驳回）」。
- 操作人应根据驳回意见修改内容。
- 重提后重新从监护人审核开始。

### 4.4 编辑锁定规则

| 状态 | 是否可编辑 | 说明 |
|---|---|---|
| `DRAFT` | 是 | 草稿可修改 |
| `REJECTED` | 是 | 驳回后可修改并重提 |
| `PENDING_SUPERVISOR` | 否 | 已进入审核流，不建议随意改动 |
| `PENDING_APPROVER` | 否 | 审核中 |
| `PENDING_DISPATCHER` | 否 | 审核中 |
| `PENDING_EXECUTE` | 否 | 已下令，操作票锁定 |
| `EXECUTING` | 否 | 正在执行，禁止修改票面 |
| `COMPLETED` | 否 | 已完成/归档 |
| `VOIDED` | 否 | 已作废 |

---

## 5. 推荐完整演示流程（5-8 分钟）

这一节适合面试或验收时照着讲。

### Step 1：操作人登录

1. 打开：

   ```text
   http://localhost:5173/login
   ```

2. 输入人员 ID：

   ```text
   zs
   ```

3. 密码任意填写或留空。
4. 点击登录。
5. 登录后进入工作台 `/workbench`。

你可以讲解：

- 登录接口返回 JWT。
- 前端把 token 存入浏览器 LocalStorage。
- 后续请求通过 `Authorization: Bearer <TOKEN>` 访问后端。

### Step 2：创建操作票

1. 左侧菜单点击「创建操作票」。
2. 填写基本信息，例如：

   | 字段 | 示例 |
   |---|---|
   | 任务名称 | `1号主变停电操作` |
   | 变电站 | `110kV 城南变电站` |
   | 作业类型 | `检修` |
   | 工作票编号 | `WT-2026-001` |

3. 选择审核人员：

   | 字段 | 推荐选择 |
   |---|---|
   | 监护人 | 赵六 `zl` |
   | 批准人 | 孙八 `sb` |
   | 发令人 | 吴十 `ws` |

4. 添加操作步骤，例如：

   ```text
   1. 核对设备名称和编号
   2. 检查现场安全措施已布置
   3. 断开 1 号主变低压侧开关
   4. 断开 1 号主变高压侧隔离开关
   5. 确认设备处于检修状态
   ```

5. 点击页面底部的「提交送审」。
6. 系统创建操作票，并进入详情页。

创建后会生成类似票号：

```text
OP-20260514-00001
```

当前前端创建页的按钮文案是「提交送审」，实际效果是先创建一张操作票。创建后请确认详情页状态：

- 如果状态已经是「待审核（监护人）」，说明已完成提交，可直接进入下一步。
- 如果状态仍是「建立」，说明当前页面只完成了建票；此时需要调用后端提交接口，或在后续补充 UI 按钮后点击「提交送审」。

使用 API 提交送审：

```bash
curl -X POST http://localhost:3000/api/v1/tickets/<TICKET_ID>/submit \
  -H "Authorization: Bearer <ZS_TOKEN>"
```

提交成功后，状态应变为：

```text
待审核（监护人）
```

你可以讲解：

- 票号由后端自动生成，格式是 `OP-YYYYMMDD-00001`。
- 创建后默认状态是 `DRAFT`。
- 提交送审后进入 `PENDING_SUPERVISOR`。
- 后端会写操作日志，并创建监护人待办。

### Step 3：监护人审核

1. 确认操作票已经提交到「待审核（监护人）」状态。
2. 退出当前账号，或重新打开登录页。
3. 使用监护人登录：

   ```text
   zl
   ```

4. 进入工作台或查询页。
5. 找到状态为「待审核（监护人）」的操作票。
6. 打开详情页。
7. 点击「审核通过」。
8. 可填写审核意见，例如：

   ```text
   安全措施确认无误，同意进入批准流程。
   ```

8. 确认后，状态变为「待审核（批准人）」。

如果要演示驳回：

1. 点击「驳回」。
2. 填写原因，例如：

   ```text
   第 3 步操作描述不够明确，请补充开关编号。
   ```

3. 操作票状态变为「建立（驳回）」。
4. 操作人 `zs` 可修改后重新提交。

### Step 4：批准人审核

1. 使用批准人登录：

   ```text
   sb
   ```

2. 找到状态为「待审核（批准人）」的操作票。
3. 打开详情页。
4. 点击「审核通过」。
5. 状态变为「待审核（发令人）」。

你可以讲解：

- 同一个审核接口 `POST /tickets/:id/review` 根据当前状态决定目标状态。
- 后端状态机保证批准人不能越级审批不属于当前节点的票。

### Step 5：发令人审核并下令

1. 使用发令人登录：

   ```text
   ws
   ```

2. 找到状态为「待审核（发令人）」的操作票。
3. 打开详情页。
4. 点击「审核并下达指令」。
5. 确认后，系统会：
   - 写入下令时间 `dispatchTime`。
   - 把状态变为「待执行」。
   - 锁定操作票核心内容。
   - 创建操作人执行待办。

你可以讲解：

- 这个动作对应状态机事件 `approve_and_dispatch`。
- 业务含义不只是审核通过，还代表发令人正式下达操作指令。

### Step 6：操作人开始执行

1. 使用操作人重新登录：

   ```text
   zs
   ```

2. 找到状态为「待执行」的操作票。
3. 进入执行页：

   ```text
   /tickets/:id/execute
   ```

4. 点击「开始执行」。
5. 状态变为「执行中」。
6. 页面展示步骤进度条和当前操作项。

你可以讲解：

- 开始执行对应接口：`POST /api/v1/tickets/:id/start-execute`。
- 后端把状态从 `PENDING_EXECUTE` 迁移到 `EXECUTING`。

### Step 7：逐项执行或跳过

在执行页中，对每个操作项可以选择：

| 按钮 | 后端 action | 操作项状态 | 用途 |
|---|---|---|---|
| 执行完成 | `execute` | `COMPLETED` | 正常完成该步骤 |
| 跳过此项 | `skip` | `SKIPPED` | 演示非关键步骤跳过 |

建议演示：

1. 前几项点击「执行完成」。
2. 如果有多条操作项，可选一项点击「跳过此项」。
3. 所有操作项都变成「已完成」或「已跳过」后，点击「全部完成，提交校验」。

完成后：

- 操作票状态变为 `COMPLETED`。
- 页面提示「操作执行完毕，已进入数据校验阶段」。

### Step 8：监控执行进度

可以在执行过程中或执行后演示监控页。

1. 使用 `zl` 或 `ws` 登录。
2. 进入：

   ```text
   /tickets/:id/monitor
   ```

3. 页面会展示：
   - 操作票基本信息。
   - 当前状态。
   - 下令时间。
   - 执行进度百分比。
   - 每个操作项的状态。
   - 操作时间线。

你可以讲解：

- 当前监控是查询式展示，不是 WebSocket 实时推送。
- 但后端已经具备日志与状态数据，后续可扩展为实时监控。

### Step 9：数据校验与归档

1. 使用发令人 `ws` 登录。
2. 进入：

   ```text
   /tickets/:id/verify
   ```

3. 查看校验内容：
   - 操作项完整性。
   - 数据一致性。
   - 设备状态。
   - 操作时间线。
4. 可选择：
   - 「校验通过，归档」
   - 「标记异常」
5. 如果选择校验通过，可填写备注，例如：

   ```text
   现场操作记录完整，设备状态正常，同意归档。
   ```

6. 确认后显示「校验通过，归档完成」。

说明：

- 当前数据校验是演示级流程。
- `verify_pass` 和 `verify_fail` 都会记录日志。
- 状态仍保持 `COMPLETED`，通过日志和校验动作区分最终结果。

---

## 6. 各页面详细说明

### 6.1 登录页 `/login`

功能：

- 输入人员 ID 登录。
- 密码开发环境任意。
- 登录成功后保存 JWT。
- 登录失败时展示错误提示。

推荐讲解点：

- 登录接口：`POST /api/v1/auth/login`。
- 入参示例：

  ```json
  {
    "personnelId": "zs",
    "password": "123456"
  }
  ```

- 返回中包含：
  - `access_token`
  - `user.id`
  - `user.name`
  - `user.role`
  - `user.team`

常见问题：

- 如果登录失败，先确认后端启动、数据库迁移和 seed 已执行。
- 如果页面一直跳回登录页，检查浏览器 LocalStorage 中 token 是否存在。

### 6.2 工作台 `/workbench`

功能：

- 展示当前登录用户和角色。
- 展示待审核、执行中、已完成、被驳回等统计。
- 展示最近操作票。
- 操作人可以快速进入创建操作票。

角色差异：

| 角色 | 工作台重点 |
|---|---|
| 操作人 | 自己创建/需要执行/被驳回的票 |
| 监护人 | 待监护审核、执行监控相关票 |
| 批准人 | 待批准审核票 |
| 发令人 | 待发令审核、待校验票 |

### 6.3 创建操作票页 `/tickets/create`

功能：

- 填写任务名称、变电站、作业类型、工作票号。
- 选择监护人、批准人、发令人。
- 动态添加/删除操作步骤。
- 保存草稿或创建操作票。
- 创建后可通过后端 `submit` 接口进入审核流；如果后续补充了提交按钮，则在详情页直接提交。

字段说明：

| 字段 | 是否必填 | 说明 |
|---|---|---|
| 任务名称 | 是 | 操作票核心标题 |
| 变电站 | 否 | 写入 `basicInfo.station` |
| 作业类型 | 否 | 写入 `basicInfo.workType` |
| 工作票编号 | 否 | 关联外部工作票号 |
| 监护人 | 是 | 第一级审核人 |
| 批准人 | 是 | 第二级审核人 |
| 发令人 | 是 | 第三级审核/下令人 |
| 操作内容 | 是 | 至少 1 条操作步骤 |

操作建议：

- 演示时建议创建 3-5 条操作步骤，方便展示执行进度。
- 人员选择使用 `zl`、`sb`、`ws` 最清晰。

注意：

- 页面上的「保存草稿」会创建一张 `DRAFT` 操作票。
- 当前页面上的「提交送审」按钮会创建操作票并进入详情页；请以详情页状态为准。
- 如果详情页仍显示 `DRAFT` /「建立」，需要调用 `POST /tickets/:id/submit` 后才会进入监护人审核节点。
- 这是当前前端演示层的小边界：后端提交接口已实现，前端详情页提交/重提按钮可作为后续增强。

### 6.4 查询操作票页 `/tickets/query`

功能：

- 按关键字查询。
- 按状态筛选。
- 按操作人筛选。
- 按时间范围筛选。
- 分页展示结果。
- 点击进入详情页。

适合场景：

- 审核人找待审票。
- 操作人找自己创建的票。
- 演示最后查看归档/历史记录。

状态筛选建议：

| 想找什么 | 筛选状态 |
|---|---|
| 草稿 | 建立 / `DRAFT` |
| 监护人待审 | 待审核（监护人） / `PENDING_SUPERVISOR` |
| 批准人待审 | 待审核（批准人） / `PENDING_APPROVER` |
| 发令人待审 | 待审核（发令人） / `PENDING_DISPATCHER` |
| 待现场执行 | 待执行 / `PENDING_EXECUTE` |
| 正在执行 | 执行中 / `EXECUTING` |
| 已完成 | 已完成 / `COMPLETED` |
| 被驳回 | 建立（驳回） / `REJECTED` |

### 6.5 审核/详情页 `/tickets/:id`

功能：

- 查看操作票基本信息。
- 查看人员信息。
- 查看操作步骤。
- 查看下令时间。
- 查看操作日志。
- 根据当前用户角色和状态展示可用按钮。

按钮展示逻辑：

| 当前状态 | 当前角色 | 可见动作 |
|---|---|---|
| `PENDING_SUPERVISOR` | 监护人 | 审核通过 / 驳回 |
| `PENDING_APPROVER` | 批准人 | 审核通过 / 驳回 |
| `PENDING_DISPATCHER` | 发令人 | 审核并下达指令 / 驳回 |

推荐讲解点：

- 前端不是写死全部按钮，而是结合角色和后端返回的 `allowedActions` 决定是否展示。
- 这样可以避免用户在错误状态下看到不该出现的操作。
- 后端仍会再次校验，防止绕过前端直接调 API。

### 6.6 操作执行页 `/tickets/:id/execute`

功能：

- 展示操作票基本信息。
- 展示步骤进度条。
- 当前步骤高亮。
- 支持开始执行。
- 支持逐条执行完成。
- 支持跳过操作项。
- 全部完成后提交校验。

执行状态：

| 操作项状态 | 中文 | 说明 |
|---|---|---|
| `PENDING` | 待执行 | 初始状态 |
| `EXECUTING` | 执行中 | 预留状态 |
| `COMPLETED` | 已完成 | 已正常执行 |
| `SKIPPED` | 已跳过 | 演示跳过/非关键项 |

注意：

- 操作票必须是 `PENDING_EXECUTE` 或 `EXECUTING` 才能执行。
- 只有对应操作人能执行。
- 全部操作项必须是 `COMPLETED` 或 `SKIPPED` 后，才能提交完成。

### 6.7 执行监控页 `/tickets/:id/monitor`

功能：

- 查看操作票状态。
- 查看执行进度。
- 查看操作项列表和状态。
- 查看操作时间线。

进度计算：

```text
已完成项数量 / 总操作项数量 * 100%
```

说明：

- 当前进度百分比主要按 `COMPLETED` 数量计算。
- `SKIPPED` 会在操作项列表中显示为「已跳过」。
- 页面适合监护人或发令人观察执行过程。

### 6.8 数据校验页 `/tickets/:id/verify`

功能：

- 展示操作票信息。
- 展示校验内容。
- 展示操作时间线。
- 支持校验通过归档。
- 支持标记异常。

校验项：

| 校验项 | 说明 |
|---|---|
| 操作项完整性 | 所有操作项是否已执行完成 |
| 数据一致性 | 现场数据与操作记录是否一致 |
| 设备状态 | 设备状态转换是否正常 |

按钮说明：

| 按钮 | 后端 action | 说明 |
|---|---|---|
| 校验通过，归档 | `verify_pass` | 记录归档/通过日志 |
| 标记异常 | `verify_fail` | 记录异常日志和说明 |

### 6.9 网络状态提示

系统顶部会显示网络状态：

| 状态 | 说明 |
|---|---|
| 在线 | 浏览器网络正常 |
| 离线 | 浏览器检测到网络断开 |

这是前端体验增强项，用于避免用户误以为系统无响应。

### 6.10 错误边界

如果前端页面出现运行时异常，`ErrorBoundary` 会显示友好的错误页，避免整页白屏。

适合讲解：

- Demo 系统也做了基础稳定性保护。
- 页面异常不会直接让整个应用崩掉。

---

## 7. 后端 API 说明

所有 API 默认前缀：

```text
http://localhost:3000/api/v1
```

### 7.1 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/auth/login` | 登录获取 JWT |

示例：

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"personnelId":"zs","password":"123456"}'
```

### 7.2 人员

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/personnel` | 查询人员列表 |
| `GET` | `/personnel?role=SUPERVISOR` | 按角色查询人员 |

### 7.3 操作票 CRUD

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/tickets` | 创建操作票 |
| `GET` | `/tickets` | 查询操作票列表 |
| `GET` | `/tickets/:id` | 获取操作票详情 |
| `PUT` | `/tickets/:id` | 更新操作票，仅草稿/驳回态可编辑 |

创建操作票示例：

```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "taskName": "1号主变停电操作",
    "supervisorId": "zl",
    "approverId": "sb",
    "dispatcherId": "ws",
    "basicInfo": {
      "station": "110kV 城南变电站",
      "workType": "检修"
    },
    "workTicketNo": "WT-2026-001",
    "items": [
      { "stepContent": "核对设备名称和编号" },
      { "stepContent": "检查现场安全措施已布置" },
      { "stepContent": "断开 1 号主变低压侧开关" }
    ]
  }'
```

创建接口只负责生成操作票。要进入审核流，需要继续提交送审：

```bash
curl -X POST http://localhost:3000/api/v1/tickets/<TICKET_ID>/submit \
  -H "Authorization: Bearer <TOKEN>"
```

### 7.4 审批工作流

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/tickets/:id/submit` | 提交送审：`DRAFT → PENDING_SUPERVISOR` |
| `POST` | `/tickets/:id/review` | 审核通过/驳回 |
| `POST` | `/tickets/:id/dispatch` | 独立下达指令端点 |
| `POST` | `/tickets/:id/resubmit` | 驳回后重新提交 |
| `GET` | `/tickets/:id/status` | 获取状态、可操作事件、编辑锁定信息 |

审核示例：

```bash
curl -X POST http://localhost:3000/api/v1/tickets/<TICKET_ID>/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"action":"approve","comment":"审核通过"}'
```

驳回示例：

```bash
curl -X POST http://localhost:3000/api/v1/tickets/<TICKET_ID>/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"action":"reject","comment":"操作步骤描述不够明确，请补充设备编号"}'
```

### 7.5 执行与校验

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/tickets/:id/start-execute` | 开始执行 |
| `PUT` | `/tickets/:id/items/:itemId` | 更新操作项状态 |
| `POST` | `/tickets/:id/complete` | 完成执行，进入校验阶段 |
| `POST` | `/tickets/:id/verify` | 数据校验：通过/异常 |
| `PUT` | `/tickets/:id/media` | 上传现场数据的最小实现 |
| `GET` | `/tickets/:id/timeline` | 获取操作时间线 |

更新操作项示例：

```bash
curl -X PUT http://localhost:3000/api/v1/tickets/<TICKET_ID>/items/<ITEM_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"action":"execute"}'
```

跳过操作项示例：

```bash
curl -X PUT http://localhost:3000/api/v1/tickets/<TICKET_ID>/items/<ITEM_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"action":"skip"}'
```

校验通过示例：

```bash
curl -X POST http://localhost:3000/api/v1/tickets/<TICKET_ID>/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"action":"verify_pass","comment":"现场数据核对无误，同意归档"}'
```

标记异常示例：

```bash
curl -X POST http://localhost:3000/api/v1/tickets/<TICKET_ID>/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"action":"verify_fail","comment":"设备状态与记录不一致，需复核"}'
```

---

## 8. Sprint 交付说明

### Sprint 1 — 基础工程与最小闭环

已实现：

- NestJS 后端基础结构。
- React + Vite + TypeScript 前端基础结构。
- PostgreSQL + Prisma 数据模型。
- JWT 登录认证。
- 人员种子数据。
- 操作票创建、查询、提交、基础审核能力。

可演示内容：

- 登录。
- 建票。
- 基础列表查询。
- 后端数据库和 API 正常联通。

### Sprint 2 — 状态机增强与三级审核

已实现：

- 10 状态状态机。
- 16 条有效迁移路径。
- 非法迁移保护。
- 中文错误提示。
- 监护人 → 批准人 → 发令人三级审核。
- 发令人下令。
- 编辑锁定。
- 驳回重提。
- 作废能力。
- 操作日志。

可演示内容：

- 每个角色只处理自己节点的审核任务。
- 错误状态下不能越权流转。
- 驳回后回到操作人修改重提。

### Sprint 3 — 前端核心页面

已实现：

- 路由与主布局。
- 登录页。
- 工作台。
- 创建操作票页。
- 审核/详情页。
- 查询操作票页。
- 角色化菜单与按钮。

可演示内容：

- 角色切换后菜单和动作不同。
- 查询页按状态/关键字筛选。
- 详情页展示票面和日志。

### Sprint 4 — 执行模块与端到端集成

已实现：

- 操作执行页 `/tickets/:id/execute`。
- 执行监控页 `/tickets/:id/monitor`。
- 数据校验页 `/tickets/:id/verify`。
- 操作时间线组件 `OperationTimeline`。
- 网络状态提示 `NetworkStatus`。
- 错误边界 `ErrorBoundary`。
- 现场数据上传最小实现。

新增后端接口：

```text
POST /tickets/:id/start-execute
PUT  /tickets/:id/items/:itemId
POST /tickets/:id/complete
POST /tickets/:id/verify
PUT  /tickets/:id/media
GET  /tickets/:id/timeline
```

可演示内容：

- 发令人下令后，操作人开始执行。
- 操作人逐项完成/跳过。
- 监护人/发令人查看进度和时间线。
- 发令人完成数据校验。

### Sprint 5 — 测试、修复与交付收尾

已实现：

- 状态机单元测试。
- 后端构建和测试验证。
- 前端构建和 lint 验证。
- 文档交付。
- 安全清理。
- 最终交付报告。

验证结果：

| 检查项 | 结果 |
|---|---|
| 后端构建 `npm run build` | ✅ 通过 |
| 后端测试 `npm run test` | ✅ 28/28 通过 |
| 前端构建 `pnpm build` | ✅ 通过 |
| 前端 lint `pnpm lint` | ✅ 0 errors，58 warnings |
| E2E 验证脚本 | ✅ 19/19 检查点通过 |

状态机单元测试覆盖：

- 合法/非法迁移验证。
- 目标状态查询。
- 允许事件列表。
- 编辑锁定状态。
- 中文状态映射。
- 全生命周期正常流程。
- 驳回重提、中止、作废等分支。

---

## 9. 验收检查清单

### 9.1 启动检查

| 检查项 | 命令/方式 | 预期 |
|---|---|---|
| 数据库启动 | `docker compose ps` | PostgreSQL running/healthy |
| 后端启动 | `pnpm start:dev` | 监听 3000 |
| 前端启动 | `pnpm dev` | 监听 5173 |
| 前端访问 | 浏览器打开 `http://localhost:5173` | 进入登录页 |

### 9.2 功能检查

| 检查项 | 预期 |
|---|---|
| `zs` 能登录 | 进入工作台 |
| `zs` 能创建操作票 | 生成票号 |
| 监护人能审核 | 状态进入批准人待审 |
| 批准人能审核 | 状态进入发令人待审 |
| 发令人能下令 | 状态进入待执行，并写下令时间 |
| 操作人能执行 | 状态进入执行中 |
| 操作项能完成/跳过 | 操作项状态更新 |
| 完成后能校验 | 进入完成/归档流程 |
| 时间线可见 | 展示操作日志 |

### 9.3 质量检查

后端：

```bash
cd backend
pnpm build
pnpm test
```

前端：

```bash
cd frontend
pnpm build
pnpm lint
```

E2E 验证脚本：

```bash
bash scripts/e2e-verify.sh
```

---

## 10. 常见问题

### 10.1 访问后端根路径显示 404

正常。后端根路径不是页面入口。

请访问前端：

```text
http://localhost:5173
```

后端 API 前缀是：

```text
http://localhost:3000/api/v1
```

### 10.2 登录失败

检查：

1. 后端是否启动。
2. 数据库是否启动。
3. 是否执行过 seed：

   ```bash
   cd backend
   pnpm prisma:seed
   ```

4. 人员 ID 是否正确，例如 `zs`、`zl`、`sb`、`ws`。

### 10.3 前端白屏

检查构建：

```bash
cd frontend
pnpm build
pnpm dev
```

同时打开浏览器控制台查看报错。

如果是 API 请求失败，确认后端地址：

```text
http://localhost:3000/api/v1
```

如需改 API 地址，可设置前端环境变量：

```text
VITE_API_BASE=http://localhost:3000/api/v1
```

### 10.4 后端连不上数据库

检查 Docker：

```bash
docker compose ps
docker compose logs postgres
```

检查 `.env`：

```text
DATABASE_URL="postgresql://ops_user:ops_password@localhost:5432/ops_ticket_db?schema=public"
```

如数据库刚启动，等几秒后再执行迁移。

### 10.5 Prisma Client 报错

重新生成：

```bash
cd backend
pnpm prisma:generate
```

如果数据库结构不一致，重新迁移：

```bash
pnpm prisma:migrate
```

### 10.6 查询不到刚创建的操作票

可能原因：

- 当前角色不是对应处理人。
- 查询条件筛选了错误状态。
- 创建后没有刷新列表。

建议：

- 清空查询条件。
- 用关键字搜索票号。
- 用 `zs` 登录确认自己创建的票。

### 10.7 审核按钮不显示

这是正常的角色/状态控制。

请确认：

| 当前状态 | 应登录角色 |
|---|---|
| 待审核（监护人） | `zl` |
| 待审核（批准人） | `sb` |
| 待审核（发令人） | `ws` |

如果角色不匹配，前端不会展示审核按钮，后端也会拒绝非法迁移。

### 10.8 无法执行操作票

执行页需要满足：

- 操作票状态为 `PENDING_EXECUTE` 或 `EXECUTING`。
- 当前登录用户是操作人，例如 `zs`。
- 已经经过三级审核和发令人下令。

### 10.9 无法提交校验

需要所有操作项都已经处理：

- `COMPLETED`：已完成。
- `SKIPPED`：已跳过。

只要还有 `PENDING` 项，后端会拒绝完成执行。

### 10.10 端口冲突

常用端口：

| 服务 | 端口 |
|---|---:|
| 前端 Vite | 5173 |
| 后端 NestJS | 3000 |
| PostgreSQL | 5432 |

可检查占用：

```bash
lsof -i :5173
lsof -i :3000
lsof -i :5432
```

---

## 11. 当前边界与后续扩展方向

当前项目定位是面试/Demo 级完整闭环，以下能力保留为后续工程化阶段：

| 边界项 | 当前实现 | 后续可扩展 |
|---|---|---|
| 现场数据上传 | 最小 JSON 实现 | 文件流、图片/视频、对象存储 |
| 数据总召校验 | 演示级校验项 | 接入真实现场终端/设备数据 |
| 执行监控 | 查询式展示 | WebSocket/SSE 实时推送 |
| 权限控制 | JWT + 角色化 UI + 后端状态校验 | 更细粒度 RBAC/ABAC |
| 流程通知 | 待办数据写入 | 邮件、短信、站内信、IM 推送 |
| 生产部署 | 本地 Docker 数据库 | Docker Compose 全栈、K8s、CI/CD |
| 安全测试 | 基础 `.gitignore` 和敏感文件排除 | SAST/DAST、依赖扫描、审计日志 |
| 性能测试 | 未压测 | 并发压测、数据库索引优化 |

---

## 12. 关键文档清单

| 文档 | 说明 |
|---|---|
| `README.md` | 项目概览、架构、功能、API 和交付状态 |
| `QUICK_START.md` | 从零启动系统的步骤 |
| `USER_GUIDE.md` | 使用说明书，也就是本文档 |
| `DELIVERY_REPORT.md` | 最终交付报告、验证结果、边界说明 |
| `IMPLEMENTATION_PLAN.md` | 5 个 Sprint、48 个任务的实施计划 |
| `PRD.md` | 原始产品需求 |

---

## 13. 最短演示话术

如果只有 1-2 分钟，可以这样演示：

1. 用 `zs` 登录，创建一张操作票，说明操作人负责建票。
2. 依次切换 `zl`、`sb`、`ws`，展示三级审核和发令人下令。
3. 切回 `zs`，进入执行页，开始执行并完成步骤。
4. 用 `ws` 进入校验页，点击校验通过归档。
5. 打开监控页或详情页，展示时间线和状态流转。

一句话总结：

```text
这是一个以状态机为核心的操作票全生命周期系统，前端按角色展示操作，后端严格校验状态迁移，已完成从建票、审核、下令、执行到校验归档的端到端闭环。
```
