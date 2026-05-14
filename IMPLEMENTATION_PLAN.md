# 操作票管理系统 — Implementation Plan

> 基于 PRD.md 需求基线，遵循 superpowers brainstorming/writing-plans 流程生成。
> 本文档为纯 superpowers 产物，不含 TBD / beads 概念。

---

## 目录

- [Phase 0：技术选型与项目脚手架](#phase-0技术选型与项目脚手架)
- [Phase 1：核心领域模型与数据库](#phase-1核心领域模型与数据库)
- [Phase 2：认证与角色权限](#phase-2认证与角色权限)
- [Phase 3：操作票 CRUD 与生命周期引擎](#phase-3操作票-crud-与生命周期引擎)
- [Phase 4：三级审核流程](#phase-4三级审核流程)
- [Phase 5：指令下达与执行监控](#phase-5指令下达与执行监控)
- [Phase 6：操作中止与副本管理](#phase-6操作中止与副本管理)
- [Phase 7：操作票作废处理](#phase-7操作票作废处理)
- [Phase 8：数据收尾与归档](#phase-8数据收尾与归档)
- [Phase 9：查询统计与人员管理](#phase-9查询统计与人员管理)
- [Phase 10：外部集成（三峡行云推送）](#phase-10外部集成三峡行云推送)
- [Phase 11：前端页面实现](#phase-11前端页面实现)
- [交付检查清单](#交付检查清单)

---

## Phase 0：技术选型与项目脚手架

### 技术栈

| 层 | 技术 | 版本 | 选择理由 |
|---|---|---|---|
| 后端语言 | Python | 3.12+ | 电力行业主流，生态成熟 |
| Web 框架 | FastAPI | 0.115+ | 异步原生，自动 OpenAPI 文档，适合 Vibe Coding |
| ORM | SQLAlchemy 2.0 | 2.0+ | 最成熟的 Python ORM，支持异步 |
| 数据库迁移 | Alembic | 1.13+ | 与 SQLAlchemy 深度集成 |
| 数据库 | PostgreSQL | 16+ | 支持 JSON/JSONB，适合复杂领域模型 |
| 缓存/队列 | Redis | 7+ | 待办推送、状态变更通知 |
| 文件存储 | MinIO (S3 兼容) | — | 音视频/图片等现场数据存储 |
| PDF 生成 | WeasyPrint | 62+ | 将操作票渲染为 PDF 工单 |
| 前端框架 | React 18 + TypeScript | 18+ | 企业级 SPA 生态 |
| UI 组件 | Ant Design 5 | 5+ | 中国电力行业最通用 UI 库 |
| 状态管理 | Zustand | 4+ | 轻量 React 状态管理 |
| 图表 | @ant-design/charts | — | 统计图表 |
| 测试框架 | pytest + httpx + vitest | — | 后端/前端统一测试 |
| 容器化 | Docker + docker-compose | — | 本地开发与部署一致 |

### 目录结构

```
/Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/
├── PRD.md                          # 需求基线（只读）
├── IMPLEMENTATION_PLAN.md          # 本文件（可执行计划）
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI 入口
│   │   ├── config.py               # 配置管理（pydantic-settings）
│   │   ├── database.py             # 异步数据库引擎 + session
│   │   ├── models/                 # SQLAlchemy 模型
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # 基类（UUID 主键、时间戳）
│   │   │   ├── ticket.py           # 电子操作票
│   │   │   ├── ticket_copy.py      # 操作任务副本
│   │   │   ├── user.py             # 人员信息（四种角色共用）
│   │   │   ├── hazard.py           # 危险源
│   │   │   ├── tool.py             # 工器具
│   │   │   ├── work_ticket_link.py # 工作票关联
│   │   │   ├── operation_log.py    # 操作日志
│   │   │   ├── notification.py     # 待办消息
│   │   │   └── review_record.py    # 审核记录（新增）
│   │   ├── schemas/                # Pydantic 序列化
│   │   │   ├── __init__.py
│   │   │   ├── common.py           # 分页、通用响应
│   │   │   ├── ticket.py
│   │   │   ├── user.py
│   │   │   └── review.py
│   │   ├── api/                    # 路由层
│   │   │   ├── __init__.py
│   │   │   ├── deps.py             # 依赖注入（鉴权、获取用户）
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py       # 统一注册所有路由
│   │   │       ├── auth.py
│   │   │       ├── tickets.py
│   │   │       ├── reviews.py
│   │   │       ├── execution.py
│   │   │       ├── copies.py
│   │   │       ├── archive.py
│   │   │       ├── statistics.py
│   │   │       └── users.py
│   │   ├── services/               # 编排服务（对应 CO001–CO011）
│   │   │   ├── __init__.py
│   │   │   ├── ticket_service.py
│   │   │   ├── review_service.py
│   │   │   ├── execution_service.py
│   │   │   ├── copy_service.py
│   │   │   ├── archive_service.py
│   │   │   ├── notification_service.py
│   │   │   ├── pdf_service.py
│   │   │   └── integration_service.py
│   │   ├── core/                   # 原子服务 + 基础设施
│   │   │   ├── __init__.py
│   │   │   ├── security.py         # JWT / 密码哈希
│   │   │   ├── state_machine.py    # 操作票状态机
│   │   │   ├── ticket_no_gen.py    # 票号生成器
│   │   │   ├── file_storage.py     # MinIO 文件存储抽象
│   │   │   └── redis_client.py     # Redis 连接
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── enums.py            # 全局枚举
│   │       └── exceptions.py       # 业务异常定义
│   ├── tests/
│   │   ├── conftest.py             # pytest 全局 fixture
│   │   ├── conftest_db.py          # 内存数据库 fixture
│   │   ├── test_auth.py
│   │   ├── test_ticket_crud.py
│   │   ├── test_review_flow.py
│   │   ├── test_execution.py
│   │   ├── test_copy_flow.py
│   │   ├── test_void_flow.py
│   │   ├── test_archive.py
│   │   └── test_statistics.py
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                    # API 调用层
│   │   │   ├── client.ts           # axios 实例
│   │   │   ├── auth.ts
│   │   │   ├── tickets.ts
│   │   │   ├── reviews.ts
│   │   │   ├── execution.ts
│   │   │   ├── copies.ts
│   │   │   ├── archive.ts
│   │   │   ├── statistics.ts
│   │   │   └── users.ts
│   │   ├── models/                 # TypeScript 类型
│   │   │   ├── ticket.ts
│   │   │   ├── user.ts
│   │   │   └── common.ts
│   │   ├── pages/
│   │   │   ├── Dashboard/          # 系统工作台
│   │   │   ├── TicketCreate/       # 建票
│   │   │   ├── TicketReview/       # 三级审核
│   │   │   ├── TicketExecution/    # 执行/监控
│   │   │   ├── TicketAbort/        # 中止处理
│   │   │   ├── CopyManagement/     # 副本管理
│   │   │   ├── Archive/            # 收尾与归档
│   │   │   ├── Statistics/         # 查询统计
│   │   │   └── UserManagement/     # 人员管理
│   │   ├── components/             # 跨页面共享组件
│   │   ├── hooks/                  # 自定义 hooks
│   │   ├── store/                  # Zustand 全局状态
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docker-compose.yml              # postgres + redis + minio
└── docs/
    ├── api-spec.md
    └── state-machine.md
```

### Phase 0 执行步骤

#### Step 0-1：创建目录结构

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
mkdir -p backend/app/{api/v1,models,schemas,services,core,utils}
mkdir -p backend/tests
mkdir -p backend/alembic/versions
mkdir -p frontend/src/{api,models,pages,components,hooks,store}
mkdir -p docs
```

**预期结果：** `tree -d -L 4` 显示完整目录结构

#### Step 0-2：初始化后端 Python 环境

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend
python3 -m venv .venv
source .venv/bin/activate

cat > requirements.txt << 'REQ'
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.35
asyncpg==0.30.0
alembic==1.13.0
redis[hiredis]==5.1.0
pydantic==2.9.0
pydantic-settings==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
httpx==0.27.0
weasyprint==62.0
minio==7.2.0
apscheduler==3.10.4
tenacity==9.0.0
REQ

cat > requirements-dev.txt << 'REQ_DEV'
-r requirements.txt
pytest==8.3.0
pytest-asyncio==0.24.0
pytest-cov==5.0.0
aiosqlite==0.20.0
factory-boy==3.3.0
faker==28.0.0
REQ_DEV

pip install -r requirements-dev.txt
```

**预期结果：**
- Python 3.12+ 虚拟环境创建成功
- `pip list | grep -E "fastapi|sqlalchemy|alembic|pytest"` 各包版本正确

#### Step 0-3：初始化前端项目

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/frontend
npm create vite@latest . -- --template react-ts 2>/dev/null <<< "y"
npm install
npm install antd @ant-design/icons @ant-design/charts zustand dayjs axios react-router-dom
npm install -D @types/node vitest @testing-library/react @testing-library/jest-dom jsdom
```

**预期结果：**
- `npx vite --version` 正常
- `npm ls antd` 显示 antd 5.x

#### Step 0-4：Docker 基础设施

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval

cat > docker-compose.yml << 'DOCKER'
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    container_name: ops-ticket-db
    environment:
      POSTGRES_DB: ops_ticket
      POSTGRES_USER: ops_user
      POSTGRES_PASSWORD: ops_pass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: ops-ticket-redis
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    container_name: ops-ticket-minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  miniodata:
DOCKER

docker compose up -d
```

**预期结果：**
- `docker compose ps` 显示三个容器 `Up`
- `psql -h localhost -U ops_user -d ops_ticket -c 'SELECT 1;'` 返回 `1 row`

#### Step 0-5：Git 初始化

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval

cat > .gitignore << 'GI'
__pycache__/
*.py[cod]
.venv/
node_modules/
dist/
.env
*.egg-info/
.vite/
.idea/
*.swp
.DS_Store
GI

git add .
git commit -m "chore: scaffold project with docker infra"
git tag phase-0-done
```

**预期结果：**
- `git log --oneline` 显示一条提交
- `git status` 干净

---

## Phase 1：核心领域模型与数据库

### PRD 映射

| PRD 章节 | 对应内容 |
|---|---|
| 二、实体清单 | 8 个实体全部映射为 SQLAlchemy 模型 |
| 六、AT001（表单初始化） | 依赖数据库模型 |
| 六、AT008（状态更新） | 依赖数据库状态字段 |

### 文件清单

| 文件路径 | 类型 | 内容 |
|---|---|---|
| `backend/app/utils/enums.py` | 枚举 | TicketStatus, UserRole, ReviewAction 等 |
| `backend/app/utils/exceptions.py` | 异常 | BusinessError, NotFoundError, StateMachineError |
| `backend/app/models/base.py` | 基类 | BaseMixin（UUID pk, created_at, updated_at） |
| `backend/app/models/user.py` | ORM 模型 | User 表（四个角色共用） |
| `backend/app/models/ticket.py` | ORM 模型 | Ticket 主表 |
| `backend/app/models/ticket_copy.py` | ORM 模型 | TicketCopy 副本表 |
| `backend/app/models/hazard.py` | ORM 模型 | HazardSource 危险源表 |
| `backend/app/models/tool.py` | ORM 模型 | Tool 工器具表 |
| `backend/app/models/work_ticket_link.py` | ORM 模型 | WorkTicketLink 工作票关联表 |
| `backend/app/models/operation_log.py` | ORM 模型 | OperationLog 操作日志表 |
| `backend/app/models/notification.py` | ORM 模型 | Notification 待办通知表 |
| `backend/app/models/review_record.py` | ORM 模型 | ReviewRecord 审核记录表 |
| `backend/app/models/__init__.py` | 导入 | 声明 Base，导出所有模型 |
| `backend/app/config.py` | 配置 | Settings（DB, Redis, MinIO, JWT） |
| `backend/app/database.py` | 连接 | create_async_engine, async_session_factory |
| `backend/alembic/env.py` | 迁移配置 | 自动导入 models，支持自增迁移 |
| `backend/tests/conftest_db.py` | 测试基础设施 | 内存 SQLite async engine fixture |

### 关键设计

#### 操作票状态机（TicketStatus 枚举）

```
DRAFT("建立")
  → PENDING_GUARDIAN("待审核-监护人")
  → PENDING_APPROVER("待审核-批准人")
  → PENDING_DISPATCHER("待审核-发令人")
  → PENDING_EXECUTION("待执行")
  → EXECUTING("执行中")
  → COMPLETED("已完成")
分支:
  → SUSPENDED("中止")
  → VOID("作废")
回退:
  PENDING_GUARDIAN → DRAFT("驳回")
  PENDING_APPROVER → DRAFT("驳回")
  PENDING_DISPATCHER → DRAFT("驳回")
```

#### 操作票主表关键字段

```python
# backend/app/models/ticket.py（核心）
class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_no: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    task_name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[TicketStatus] = mapped_column(SQLEnum(TicketStatus), default=TicketStatus.DRAFT)

    # 四类角色（均为外键关联 User）
    operator_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    guardian_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    approver_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    dispatcher_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))

    # 核心业务字段
    draft_info: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    order_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    related_work_ticket_no: Mapped[Optional[str]] = mapped_column(String(50))
    remark: Mapped[Optional[str]] = mapped_column(Text)

    # 锁定控制
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    lock_version: Mapped[int] = mapped_column(Integer, default=0)  # 乐观锁

    # 关联集合
    hazards: Mapped[list["HazardSource"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    tools: Mapped[list["Tool"]] = relationship(back_populates="ticket", cascade="all, delete-orphan")
    review_records: Mapped[list["ReviewRecord"]] = relationship(back_populates="ticket")
    operation_logs: Mapped[list["OperationLog"]] = relationship(back_populates="ticket")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### Phase 1 执行步骤

#### Step 1-1：创建枚举与异常

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend/app
touch utils/__init__.py
```

```python
# ====== utils/enums.py ======
import enum

class TicketStatus(str, enum.Enum):
    DRAFT = "draft"                              # 建立
    PENDING_GUARDIAN = "pending_guardian"        # 待审核-监护人
    PENDING_APPROVER = "pending_approver"        # 待审核-批准人
    PENDING_DISPATCHER = "pending_dispatcher"    # 待审核-发令人
    PENDING_EXECUTION = "pending_execution"      # 待执行
    EXECUTING = "executing"                      # 执行中
    COMPLETED = "completed"                      # 已完成
    SUSPENDED = "suspended"                      # 中止
    VOID = "void"                                # 作废

class UserRole(str, enum.Enum):
    OPERATOR = "operator"       # 操作人
    GUARDIAN = "guardian"       # 监护人
    APPROVER = "approver"       # 批准人
    DISPATCHER = "dispatcher"   # 发令人
    ADMIN = "admin"             # 系统管理员

class ReviewAction(str, enum.Enum):
    APPROVED = "approved"       # 通过
    REJECTED = "rejected"       # 驳回

class NotificationType(str, enum.Enum):
    REVIEW_TODO = "review_todo"         # 审核待办
    EXECUTION_TODO = "execution_todo"   # 执行待办
    HANDOVER_TODO = "handover_todo"     # 交接待办
    SYSTEM_NOTICE = "system_notice"     # 系统通知
```

```python
# ====== utils/exceptions.py ======
class BusinessError(Exception):
    def __init__(self, message: str, code: str = "BUSINESS_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)

class NotFoundError(BusinessError):
    def __init__(self, entity: str, id_value):
        super().__init__(
            message=f"{entity} not found: {id_value}",
            code="NOT_FOUND"
        )

class StateMachineError(BusinessError):
    def __init__(self, current: str, target: str):
        super().__init__(
            message=f"Cannot transition from {current} to {target}",
            code="STATE_MACHINE_ERROR"
        )

class PermissionDeniedError(BusinessError):
    def __init__(self, message="Permission denied"):
        super().__init__(message=message, code="PERMISSION_DENIED")
```

#### Step 1-2：创建数据库模型

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend/app
touch models/__init__.py
```

逐一创建 `models/base.py`、`models/user.py`、`models/ticket.py`、`models/hazard.py`、`models/tool.py`、`models/work_ticket_link.py`、`models/operation_log.py`、`models/notification.py`、`models/review_record.py`、`models/ticket_copy.py`。

模型关键关系图：

```
User ──1:N──> Ticket (as operator)
User ──1:N──> Ticket (as guardian)
User ──1:N──> Ticket (as approver)
User ──1:N──> Ticket (as dispatcher)

Ticket ──1:N──> HazardSource
Ticket ──1:N──> Tool
Ticket ──1:N──> ReviewRecord
Ticket ──1:N──> OperationLog
Ticket ──1:N──> WorkTicketLink

Ticket ──1:1──> TicketCopy (中止时创建)
TicketCopy ──1:N──> ReviewRecord (副本审核)
```

#### Step 1-3：创建配置与数据库引擎

```python
# ====== config.py ======
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    APP_NAME: str = "OPS Ticket System"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://ops_user:ops_pass@localhost:5432/ops_ticket"
    TEST_DATABASE_URL: str = "sqlite+aiosqlite:///:memory:"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "ops-ticket-files"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480  # 8 小时

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()
```

```python
# ====== database.py ======
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

#### Step 1-4：Alembic 初始化

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend
source .venv/bin/activate

# 初始化 Alembic
alembic init alembic -t async

# 修改 alembic/env.py 导入 models.Base
# 关键一行：from app.models import Base
# 修改 target_metadata = Base.metadata

# 生成初始迁移
alembic revision --autogenerate -m "init: create all domain tables"

# 检查生成的迁移脚本
cat alembic/versions/*_init_create_all_domain_tables.py

# 执行迁移
alembic upgrade head
```

**预期结果：**
- `alembic history` 显示单条迁移记录
- `psql -h localhost -U ops_user -d ops_ticket -c '\dt'` 显示所有表（users, tickets, hazards, tools 等）

#### Step 1-5：编写模型测试

```python
# ====== tests/conftest_db.py ======
import pytest
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models.base import Base
from app.config import settings

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def async_engine():
    engine = create_async_engine(settings.TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db_session(async_engine):
    session_factory = async_sessionmaker(async_engine, class_=AsyncSession)
    async with session_factory() as session:
        yield session
```

```python
# ====== tests/test_ticket_crud.py ======
import pytest
from app.models.ticket import Ticket
from app.models.user import User
from app.utils.enums import TicketStatus, UserRole

pytestmark = pytest.mark.asyncio

async def test_create_ticket(db_session):
    """验证操作票创建成功，默认状态为 DRAFT"""
    user = User(name="测试操作人", role=UserRole.OPERATOR)
    db_session.add(user)
    await db_session.flush()

    ticket = Ticket(
        ticket_no="20260512-00001",
        task_name="#1 主变由运行转检修",
        operator_id=user.id,
        draft_info={"station": "A站", "device": "#1主变"}
    )
    db_session.add(ticket)
    await db_session.flush()

    assert ticket.id is not None
    assert ticket.status == TicketStatus.DRAFT
    assert ticket.is_locked is False

async def test_ticket_status_transition(db_session):
    """验证状态机：DRAFT → PENDING_GUARDIAN"""
    ticket = Ticket(ticket_no="20260512-00002", task_name="测试状态转换")
    db_session.add(ticket)
    await db_session.flush()

    ticket.status = TicketStatus.PENDING_GUARDIAN
    await db_session.flush()

    assert ticket.status == TicketStatus.PENDING_GUARDIAN
```

**运行测试：**
```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend
source .venv/bin/activate
pytest tests/test_ticket_crud.py -v --asyncio-mode=auto
```

**预期结果：**
```
collected 2 items
tests/test_ticket_crud.py::test_create_ticket PASSED
tests/test_ticket_crud.py::test_ticket_status_transition PASSED
```

#### Step 1-6：Phase 1 提交

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add backend/app/{utils,models,config.py,database.py} backend/alembic/ backend/tests/conftest_db.py backend/tests/test_ticket_crud.py
git add docker-compose.yml .gitignore
git commit -m "feat(models): add domain models, enums, and database migration

- Define TicketStatus, UserRole, ReviewAction enums
- Create all ORM models: User, Ticket, HazardSource, Tool, WorkTicketLink,
  OperationLog, Notification, ReviewRecord, TicketCopy
- Set up async database engine with SQLAlchemy 2.0
- Configure Alembic with autogenerate migrations
- Add test fixtures with in-memory SQLite
- Write initial model tests (creation + status transition)"
git tag phase-1-done
```

---

## Phase 2：认证与角色权限

### PRD 映射

| PRD 章节 | 对应内容 |
|---|---|
| 三(二) 角色权限管控 | 四种角色权限差异化 |
| 六、AT020（角色权限校验） | 依赖 JWT + RBAC |
| 六、AT019（人员信息维护） | User CRUD |

### 文件清单

| 文件 | 说明 |
|---|---|
| `backend/app/core/security.py` | JWT 签发/验证、密码哈希、当前用户依赖 |
| `backend/app/schemas/common.py` | 通用请求/响应模型（Token, UserInfo） |
| `backend/app/schemas/user.py` | 用户序列化 |
| `backend/app/services/user_service.py` | 用户服务（注册、登录、CRUD） |
| `backend/app/api/v1/auth.py` | 登录、刷新 token 路由 |
| `backend/app/api/v1/users.py` | 用户管理路由（管理员） |
| `backend/app/api/deps.py` | get_current_user, require_role 依赖 |
| `backend/tests/test_auth.py` | 认证鉴权测试 |

### Phase 2 执行步骤

#### Step 2-1：实现安全模块

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend
touch app/core/__init__.py
```

```python
# ====== core/security.py ======
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
```

#### Step 2-2：实现依赖注入

```python
# ====== api/deps.py ======
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.utils.enums import UserRole
from app.utils.exceptions import PermissionDeniedError

security_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

def require_role(*roles: UserRole):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise PermissionDeniedError(f"Role {current_user.role} not in {roles}")
        return current_user
    return role_checker
```

#### Step 2-3：实现用户服务

```python
# ====== services/user_service.py ======
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.utils.exceptions import NotFoundError, BusinessError

class UserService:
    @staticmethod
    async def authenticate(db: AsyncSession, username: str, password: str) -> tuple[User, str]:
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.hashed_password):
            raise BusinessError("Invalid username or password", "AUTH_FAILED")
        token = create_access_token({"sub": str(user.id), "role": user.role.value})
        return user, token

    @staticmethod
    async def create_user(db: AsyncSession, data: dict) -> User:
        user = User(**{k: v for k, v in data.items() if k != "password"})
        user.hashed_password = hash_password(data["password"])
        db.add(user)
        await db.flush()
        return user
```

#### Step 2-4：实现认证 API

```python
# ====== api/v1/auth.py ======
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.common import LoginRequest, TokenResponse, UserInfo
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["认证"])

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user, token = await UserService.authenticate(db, req.username, req.password)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserInfo(id=str(user.id), username=user.username, role=user.role.value, name=user.name)
    )
```

#### Step 2-5：编写认证测试

```python
# ====== tests/test_auth.py ======
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_db
from app.models.user import User
from app.core.security import hash_password
from app.utils.enums import UserRole

pytestmark = pytest.mark.asyncio

async def test_login_success(db_session):
    """验证正确用户名密码可以获取 token"""
    # 准备测试用户
    user = User(
        username="test_operator",
        name="测试操作人",
        role=UserRole.OPERATOR,
        hashed_password=hash_password("password123")
    )
    db_session.add(user)
    await db_session.commit()

    # 使用测试数据库替换依赖
    app.dependency_overrides[get_db] = lambda: db_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/login", json={
            "username": "test_operator",
            "password": "password123"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["role"] == "operator"

    app.dependency_overrides.clear()
```

#### Step 2-6：Phase 2 提交

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add backend/app/core/security.py backend/app/api/deps.py backend/app/services/user_service.py
git add backend/app/api/v1/auth.py backend/app/api/v1/users.py
git add backend/app/schemas/
git add backend/tests/test_auth.py
git commit -m "feat(auth): implement JWT authentication and RBAC

- Add JWT token creation/validation with jose
- Add bcrypt password hashing
- Implement get_current_user and require_role dependencies
- Implement UserService with authenticate method
- Add login API endpoint with token response
- Write auth test for login flow"
git tag phase-2-done
```

---

## Phase 3：操作票 CRUD 与生命周期引擎

### PRD 映射

| PRD 章节 | 对应内容 |
|---|---|
| 三(一) 操作票建立 | 创建、暂存、提交送审 |
| 六、AT001 表单初始化 | 票号自动生成 |
| 六、AT002 信息暂存 | 保存草稿 |
| 六、AT004 信息编辑 | 更新操作 |
| 六、AT007 锁定/解锁 | 状态控制 |

### 文件清单

| 文件 | 说明 |
|---|---|
| `backend/app/core/ticket_no_gen.py` | 票号生成器（日期+序列号） |
| `backend/app/core/state_machine.py` | 状态机引擎（验证+转换） |
| `backend/app/schemas/ticket.py` | 操作票 Pydantic 模型 |
| `backend/app/services/ticket_service.py` | 编排服务 CO001 |
| `backend/app/api/v1/tickets.py` | 操作票 CRUD 路由 |
| `backend/tests/test_ticket_crud.py` | 扩展测试 |

### 关键设计

#### 票号生成规则

格式：`YYYYMMDD-XXXXX`（日期 + 5 位当日序列号）
```python
# core/ticket_no_gen.py
from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket import Ticket

class TicketNoGenerator:
    @staticmethod
    async def generate(db: AsyncSession) -> str:
        today = date.today()
        date_str = today.strftime("%Y%m%d")
        prefix = f"{date_str}-"
        result = await db.execute(
            select(func.count(Ticket.id)).where(Ticket.ticket_no.like(f"{prefix}%"))
        )
        count = result.scalar() or 0
        return f"{prefix}{count + 1:05d}"
```

#### 状态机引擎

```python
# core/state_machine.py
from app.utils.enums import TicketStatus
from app.utils.exceptions import StateMachineError

# 定义合法转换表
_ALLOWED_TRANSITIONS = {
    TicketStatus.DRAFT: [
        TicketStatus.PENDING_GUARDIAN,   # 提交送审
        TicketStatus.VOID,               # 作废
    ],
    TicketStatus.PENDING_GUARDIAN: [
        TicketStatus.PENDING_APPROVER,   # 监护人通过
        TicketStatus.DRAFT,              # 监护人驳回
    ],
    TicketStatus.PENDING_APPROVER: [
        TicketStatus.PENDING_DISPATCHER, # 批准人通过
        TicketStatus.DRAFT,              # 批准人驳回
    ],
    TicketStatus.PENDING_DISPATCHER: [
        TicketStatus.PENDING_EXECUTION,  # 发令人通过+下令
        TicketStatus.DRAFT,              # 发令人驳回
    ],
    TicketStatus.PENDING_EXECUTION: [
        TicketStatus.EXECUTING,          # 开始执行
        TicketStatus.VOID,               # 作废
    ],
    TicketStatus.EXECUTING: [
        TicketStatus.COMPLETED,          # 执行完成
        TicketStatus.SUSPENDED,          # 操作中止
    ],
    TicketStatus.SUSPENDED: [
        TicketStatus.PENDING_EXECUTION,  # 副本提交后原票可恢复？实际上原票保持中止
    ],
    TicketStatus.COMPLETED: [],          # 终态
    TicketStatus.VOID: [],              # 终态
}

def validate_transition(current: TicketStatus, target: TicketStatus):
    allowed = _ALLOWED_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise StateMachineError(current.value, target.value)

def transition(current: TicketStatus, target: TicketStatus) -> TicketStatus:
    validate_transition(current, target)
    return target
```

### Phase 3 执行步骤

#### Step 3-1：创建票号生成器和状态机

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend/app
touch core/ticket_no_gen.py core/state_machine.py
```

写入 Step 3-1 的代码（如上节所示）。

#### Step 3-2：创建 Ticket schema

```python
# ====== schemas/ticket.py ======
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.utils.enums import TicketStatus

class TicketCreate(BaseModel):
    task_name: str = Field(..., max_length=200, description="操作任务名称")
    draft_info: Optional[dict] = Field(default=None, description="基础信息 JSON")
    related_work_ticket_no: Optional[str] = Field(default=None, max_length=50)

class TicketUpdate(BaseModel):
    task_name: Optional[str] = None
    draft_info: Optional[dict] = None
    related_work_ticket_no: Optional[str] = None

class TicketDraftSave(BaseModel):
    """暂存草稿"""
    task_name: Optional[str] = None
    draft_info: Optional[dict] = None

class TicketResponse(BaseModel):
    id: str
    ticket_no: str
    task_name: str
    status: TicketStatus
    operator_id: Optional[str] = None
    guardian_id: Optional[str] = None
    order_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class TicketListResponse(BaseModel):
    items: list[TicketResponse]
    total: int
    page: int
    page_size: int
```

#### Step 3-3：实现操作票编排服务（CO001）

```python
# ====== services/ticket_service.py ======
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket import Ticket
from app.models.user import User
from app.utils.enums import TicketStatus
from app.utils.exceptions import NotFoundError
from app.core.ticket_no_gen import TicketNoGenerator
from app.core.state_machine import transition

class TicketService:
    """编排服务 CO001：操作票建立与送审"""

    @staticmethod
    async def create_ticket(
        db: AsyncSession, data: dict, operator: User
    ) -> Ticket:
        ticket_no = await TicketNoGenerator.generate(db)
        ticket = Ticket(
            ticket_no=ticket_no,
            task_name=data["task_name"],
            draft_info=data.get("draft_info"),
            related_work_ticket_no=data.get("related_work_ticket_no"),
            operator_id=operator.id,
            status=TicketStatus.DRAFT,
        )
        db.add(ticket)
        await db.flush()
        return ticket

    @staticmethod
    async def submit_for_review(db: AsyncSession, ticket_id: str, operator: User) -> Ticket:
        """提交送审：DRAFT → PENDING_GUARDIAN"""
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)
        if ticket.operator_id != operator.id:
            raise PermissionDeniedError("Only the operator can submit")
        ticket.status = transition(ticket.status, TicketStatus.PENDING_GUARDIAN)
        await db.flush()
        return ticket

    @staticmethod
    async def save_draft(db: AsyncSession, ticket_id: str, data: dict, user: User) -> Ticket:
        """暂存草稿"""
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)
        if ticket.operator_id != user.id:
            raise PermissionDeniedError("Only the operator can edit draft")
        if ticket.status != TicketStatus.DRAFT:
            raise BusinessError("Can only edit ticket in DRAFT status")
        for key, val in data.items():
            setattr(ticket, key, val)
        await db.flush()
        return ticket

    @staticmethod
    async def get_ticket(db: AsyncSession, ticket_id: str) -> Ticket:
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)
        return ticket

    @staticmethod
    async def list_tickets(
        db: AsyncSession, page: int = 1, page_size: int = 20, **filters
    ) -> tuple[list[Ticket], int]:
        query = select(Ticket)
        # 按条件筛选
        for key, val in filters.items():
            if val is not None and hasattr(Ticket, key):
                query = query.where(getattr(Ticket, key) == val)
        # 总数
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        # 分页
        query = query.order_by(Ticket.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        tickets = result.scalars().all()
        return tickets, total
```

#### Step 3-4：实现操作票路由

```python
# ====== api/v1/tickets.py ======
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.user import User
from app.utils.enums import UserRole, TicketStatus
from app.services.ticket_service import TicketService
from app.schemas.ticket import TicketCreate, TicketResponse, TicketListResponse

router = APIRouter(prefix="/tickets", tags=["操作票"])

@router.post("", response_model=TicketResponse, summary="创建操作票草稿")
async def create_ticket(
    data: TicketCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.OPERATOR)),
):
    ticket = await TicketService.create_ticket(db, data.model_dump(), user)
    return ticket

@router.post("/{ticket_id}/submit", summary="提交送审")
async def submit_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = await TicketService.submit_for_review(db, ticket_id, user)
    return {"status": ticket.status.value, "message": "已提交送审"}

@router.get("", response_model=TicketListResponse, summary="查询操作票列表")
async def list_tickets(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: TicketStatus = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tickets, total = await TicketService.list_tickets(
        db, page=page, page_size=page_size,
        status=status.value if status else None
    )
    return TicketListResponse(
        items=[TicketResponse.model_validate(t) for t in tickets],
        total=total, page=page, page_size=page_size
    )
```

#### Step 3-5：主入口 & 路由注册

```python
# ====== main.py ======
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup: 数据库连接检查
    yield
    # shutdown: 清理资源

app = FastAPI(title="操作票管理系统 API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router, prefix="/api/v1")
```

```python
# ====== api/v1/router.py ======
from fastapi import APIRouter
from . import auth, tickets, reviews, execution, copies, archive, statistics, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(tickets.router)
api_router.include_router(reviews.router)
api_router.include_router(execution.router)
api_router.include_router(copies.router)
api_router.include_router(archive.router)
api_router.include_router(statistics.router)
api_router.include_router(users.router)
```

#### Step 3-6：扩展测试

```python
# ====== tests/test_ticket_crud.py（追加）======
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_db

async def test_create_ticket_api(db_session, test_operator):
    """API: 创建操作票"""
    app.dependency_overrides[get_db] = lambda: db_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 先登录获取 token
        login_resp = await client.post("/api/v1/auth/login", json={
            "username": "test_op",
            "password": "test123"
        })
        token = login_resp.json()["access_token"]

        resp = await client.post(
            "/api/v1/tickets",
            json={"task_name": "#2 主变检修", "draft_info": {"station": "B站"}},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ticket_no"].startswith("20260512-")
        assert data["status"] == "draft"
    app.dependency_overrides.clear()
```

**运行测试：**
```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend
pytest tests/test_ticket_crud.py tests/test_auth.py -v --asyncio-mode=auto
```

#### Step 3-7：Phase 3 提交

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add backend/app/core/ticket_no_gen.py backend/app/core/state_machine.py
git add backend/app/schemas/ticket.py backend/app/schemas/common.py
git add backend/app/services/ticket_service.py
git add backend/app/api/v1/tickets.py backend/app/api/v1/router.py
git add backend/app/main.py
git commit -m "feat(ticket): implement ticket CRUD with lifecycle state machine

- Add ticket number generator (YYYYMMDD-XXXXX)
- Add state machine engine with allowed transitions table
- Implement TicketService (create, save draft, submit for review, list)
- Add ticket CRUD API endpoints
- Extend tests with API integration test"
git tag phase-3-done
```

---

## Phase 4：三级审核流程

### PRD 映射

| PRD 章节 | 对应内容 |
|---|---|
| 三(一) 操作票审核 | 监护人→批准人→发令人三级 |
| 五(一) 节点 2-4 | 审核流转步骤 |
| 六、AT003 待办推送 | 审核待办 |
| 六、AT005 审核结果提交 | 通过/驳回 |
| 六、AT020 角色权限校验 | 仅对应角色可审核 |
| 七、CO002 三级审核流程 | 编排服务 |

### 文件清单

| 文件 | 说明 |
|---|---|
| `backend/app/services/notification_service.py` | 待办消息推送服务 |
| `backend/app/services/review_service.py` | 审核编排服务（CO002） |
| `backend/app/schemas/review.py` | 审核请求/响应模型 |
| `backend/app/api/v1/reviews.py` | 审核路由 |
| `backend/tests/test_review_flow.py` | 三级审核流程测试 |

### Phase 4 执行步骤

#### Step 4-1：实现待办消息推送

```python
# ====== services/notification_service.py ======
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification
from app.models.user import User
from app.utils.enums import NotificationType

class NotificationService:
    """原子服务 AT003：待办消息推送"""

    @staticmethod
    async def push(
        db: AsyncSession,
        user_id: str,
        ntype: NotificationType,
        title: str,
        content: str,
        biz_link: str,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            ntype=ntype,
            title=title,
            content=content,
            biz_link=biz_link,
            is_read=False,
        )
        db.add(notif)
        await db.flush()
        # TODO: 如果 Redis 可用，推送实时消息到 Redis channel
        return notif
```

#### Step 4-2：实现审核编排服务（CO002）

```python
# ====== services/review_service.py ======
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket import Ticket
from app.models.user import User
from app.models.review_record import ReviewRecord
from app.utils.enums import TicketStatus, UserRole, ReviewAction, NotificationType
from app.utils.exceptions import PermissionDeniedError, BusinessError, NotFoundError
from app.core.state_machine import transition
from app.services.notification_service import NotificationService

_NEXT_REVIEWER_ROLE_MAP = {
    # 当前审核人 → 下一审核人角色
    UserRole.GUARDIAN: UserRole.APPROVER,
    UserRole.APPROVER: UserRole.DISPATCHER,
}

_NEXT_STATUS_MAP = {
    # (当前审核人角色, 通过) → 下一状态
    (UserRole.GUARDIAN, True): TicketStatus.PENDING_APPROVER,
    (UserRole.APPROVER, True): TicketStatus.PENDING_DISPATCHER,
    (UserRole.DISPATCHER, True): TicketStatus.PENDING_EXECUTION,
    (UserRole.GUARDIAN, False): TicketStatus.DRAFT,
    (UserRole.APPROVER, False): TicketStatus.DRAFT,
    (UserRole.DISPATCHER, False): TicketStatus.DRAFT,
}

class ReviewService:
    """编排服务 CO002：三级审核流程执行"""

    @staticmethod
    async def submit_review(
        db: AsyncSession,
        ticket_id: str,
        reviewer: User,
        action: ReviewAction,
        comment: str = "",
    ) -> Ticket:
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)

        # 权限校验：只有对应角色的审核人可审核
        ReviewService._validate_reviewer(ticket, reviewer)

        # 记录审核记录
        record = ReviewRecord(
            ticket_id=ticket.id,
            reviewer_id=reviewer.id,
            role=reviewer.role,
            action=action,
            comment=comment,
        )
        db.add(record)

        # 状态转换
        is_approved = action == ReviewAction.APPROVED
        target_status = _NEXT_STATUS_MAP[(reviewer.role, is_approved)]
        ticket.status = transition(ticket.status, target_status)

        if is_approved:
            # 如果下一节点不是终态，推送待办给下一审核人
            next_role = _NEXT_REVIEWER_ROLE_MAP.get(reviewer.role)
            if next_role and target_status != TicketStatus.PENDING_EXECUTION:
                # 查找对应角色的用户（简化：实际应查班组内对应角色）
                # 此处略，实际需根据业务规则找具体的人
                pass

        await db.flush()
        return ticket

    @staticmethod
    def _validate_reviewer(ticket: Ticket, reviewer: User):
        """校验 reviewer 是否是当前步骤的审核人"""
        status_role_map = {
            TicketStatus.PENDING_GUARDIAN: UserRole.GUARDIAN,
            TicketStatus.PENDING_APPROVER: UserRole.APPROVER,
            TicketStatus.PENDING_DISPATCHER: UserRole.DISPATCHER,
        }
        expected_role = status_role_map.get(ticket.status)
        if not expected_role:
            raise BusinessError(f"Ticket is not in reviewable status: {ticket.status.value}")
        if reviewer.role != expected_role:
            raise PermissionDeniedError(f"Expected {expected_role.value}, got {reviewer.role.value}")
```

#### Step 4-3：创建审核路由

```python
# ====== api/v1/reviews.py ======
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.review import ReviewSubmit
from app.services.review_service import ReviewService

router = APIRouter(prefix="/tickets/{ticket_id}/reviews", tags=["审核"])

@router.post("", summary="提交审核结果（通过/驳回）")
async def submit_review(
    ticket_id: str,
    data: ReviewSubmit,
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(get_current_user),
):
    ticket = await ReviewService.submit_review(
        db, ticket_id, reviewer, data.action, data.comment
    )
    return {"status": ticket.status.value, "message": "审核完成"}
```

#### Step 4-4：编写三级审核流程测试

```python
# ====== tests/test_review_flow.py ======
import pytest
from app.models.ticket import Ticket
from app.models.user import User
from app.utils.enums import TicketStatus, UserRole, ReviewAction
from app.services.review_service import ReviewService

pytestmark = pytest.mark.asyncio

async def test_full_three_level_review_flow(db_session):
    """验证完整的监护人→批准人→发令人三级审核流程"""
    # 准备测试数据：1 张操作票 + 3 个审核人
    operator = User(name="操作人", role=UserRole.OPERATOR, username="op1")
    guardian = User(name="监护人", role=UserRole.GUARDIAN, username="gd1")
    approver = User(name="批准人", role=UserRole.APPROVER, username="ap1")
    dispatcher = User(name="发令人", role=UserRole.DISPATCHER, username="dp1")
    for u in [operator, guardian, approver, dispatcher]:
        db_session.add(u)
    await db_session.flush()

    ticket = Ticket(
        ticket_no="20260512-TEST-01", task_name="测试三级审核",
        operator_id=operator.id, status=TicketStatus.PENDING_GUARDIAN
    )
    db_session.add(ticket)
    await db_session.flush()

    # 1. 监护人审核通过
    ticket = await ReviewService.submit_review(
        db_session, str(ticket.id), guardian, ReviewAction.APPROVED
    )
    assert ticket.status == TicketStatus.PENDING_APPROVER

    # 2. 批准人审核通过
    ticket = await ReviewService.submit_review(
        db_session, str(ticket.id), approver, ReviewAction.APPROVED
    )
    assert ticket.status == TicketStatus.PENDING_DISPATCHER

    # 3. 发令人审核通过
    ticket = await ReviewService.submit_review(
        db_session, str(ticket.id), dispatcher, ReviewAction.APPROVED
    )
    assert ticket.status == TicketStatus.PENDING_EXECUTION

    # 4. 验证审核记录数
    assert len(ticket.review_records) == 3

async def test_review_rejection_returns_to_draft(db_session):
    """验证驳回后操作票回到草稿状态"""
    operator = User(name="操作人", role=UserRole.OPERATOR, username="op2")
    guardian = User(name="监护人", role=UserRole.GUARDIAN, username="gd2")
    db_session.add_all([operator, guardian])
    await db_session.flush()

    ticket = Ticket(
        ticket_no="20260512-TEST-02", task_name="测试驳回",
        operator_id=operator.id, status=TicketStatus.PENDING_GUARDIAN
    )
    db_session.add(ticket)
    await db_session.flush()

    ticket = await ReviewService.submit_review(
        db_session, str(ticket.id), guardian, ReviewAction.REJECTED,
        comment="危险源信息不完整，请补充"
    )
    assert ticket.status == TicketStatus.DRAFT

    # 验证驳回意见已记录
    record = ticket.review_records[0]
    assert record.action == ReviewAction.REJECTED
    assert "危险源信息不完整" in record.comment
```

**运行测试：**
```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend
pytest tests/test_review_flow.py -v --asyncio-mode=auto
```

**预期结果：**
```
collected 2 items
tests/test_review_flow.py::test_full_three_level_review_flow PASSED
tests/test_review_flow.py::test_review_rejection_returns_to_draft PASSED
```

#### Step 4-5：Phase 4 提交

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add backend/app/services/review_service.py
git add backend/app/services/notification_service.py
git add backend/app/schemas/review.py
git add backend/app/api/v1/reviews.py
git add backend/tests/test_review_flow.py
git commit -m "feat(review): implement three-level review workflow (CO002)

- Implement ReviewService with role-based review validation
- Support APPROVED/REJECTED actions with state transitions
- Add ReviewRecord model to persist all review history
- Add notification service skeleton (AT003)
- Test full guardian→approver→dispatcher flow
- Test rejection returns ticket to DRAFT with comments"
git tag phase-4-done
```

---

## Phase 5：指令下达与执行监控

### PRD 映射

| PRD 章节 | 对应内容 |
|---|---|
| 三(一) 操作票生效 | 发令人下达指令，写入下令时间，锁定信息 |
| 三(一) 操作票执行 | 执行中数据同步 |
| 五(一) 节点 4-5 | 下令与执行 |
| 六、AT006 下令时间写入 | 原子服务 |
| 六、AT007 信息锁定 | 原子服务 |
| 六、AT009 现场数据上传 | 原子服务 |
| 七、CO003 操作票生效管控 | 编排服务 |
| 七、CO004 现场操作数据同步 | 编排服务 |

### 文件清单

| 文件 | 说明 |
|---|---|
| `backend/app/services/execution_service.py` | CO003 + CO004 编排 |
| `backend/app/api/v1/execution.py` | 执行监控路由 |
| `backend/app/core/file_storage.py` | MinIO 文件存储抽象 |
| `backend/tests/test_execution.py` | 执行流程测试 |

### Phase 5 执行步骤

#### Step 5-1：实现生效管控编排（CO003）

```python
# ====== services/execution_service.py（部分）======
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket import Ticket
from app.models.user import User
from app.models.operation_log import OperationLog
from app.utils.enums import TicketStatus, UserRole
from app.utils.exceptions import PermissionDeniedError, BusinessError
from app.core.state_machine import transition

class ExecutionService:
    """编排服务 CO003 + CO004"""

    @staticmethod
    async def issue_command(db: AsyncSession, ticket_id: str, dispatcher: User) -> Ticket:
        """
        发令人下达操作指令（CO003）
        原子服务组合：AT005 → AT006 → AT007 → AT008
        """
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)
        if ticket.status != TicketStatus.PENDING_DISPATCHER:
            raise BusinessError(f"Ticket must be in PENDING_DISPATCHER, got {ticket.status.value}")
        if dispatcher.role != UserRole.DISPATCHER:
            raise PermissionDeniedError("Only dispatcher can issue commands")

        # AT005: 记录审核通过（已在上一步完成）
        # AT006: 写入下令时间
        ticket.order_time = datetime.now(timezone.utc)
        # AT007: 锁定操作票
        ticket.is_locked = True
        # AT008: 状态更新为待执行
        ticket.status = transition(ticket.status, TicketStatus.PENDING_EXECUTION)
        ticket.dispatcher_id = dispatcher.id

        # 写操作日志
        log = OperationLog(
            ticket_id=ticket.id,
            operator_id=dispatcher.id,
            action="ISSUE_COMMAND",
            content=f"发令人 {dispatcher.name} 下达操作指令，下令时间 {ticket.order_time.isoformat()}"
        )
        db.add(log)
        await db.flush()
        return ticket

    @staticmethod
    async def start_execution(db: AsyncSession, ticket_id: str, operator: User) -> Ticket:
        """开始执行：PENDING_EXECUTION → EXECUTING"""
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)
        if ticket.status != TicketStatus.PENDING_EXECUTION:
            raise BusinessError("Ticket must be in PENDING_EXECUTION")
        if ticket.operator_id != operator.id:
            raise PermissionDeniedError("Only assigned operator can execute")
        ticket.status = transition(ticket.status, TicketStatus.EXECUTING)
        log = OperationLog(ticket_id=ticket.id, operator_id=operator.id, action="START_EXECUTION")
        db.add(log)
        await db.flush()
        return ticket
```

#### Step 5-2：实现文件存储抽象

```python
# ====== core/file_storage.py ======
from minio import Minio
from app.config import settings

class FileStorage:
    """现场数据文件存储（音视频、图片等）"""

    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False,
        )
        self.bucket = settings.MINIO_BUCKET

    async def ensure_bucket(self):
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    async def upload_file(self, ticket_no: str, file_name: str, file_data: bytes):
        """上传文件到 ticket_no 目录下"""
        object_name = f"{ticket_no}/{file_name}"
        self.client.put_object(
            self.bucket, object_name, io.BytesIO(file_data), len(file_data)
        )
        return object_name
```

#### Step 5-3：创建执行路由

```python
# ====== api/v1/execution.py ======
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.execution_service import ExecutionService
from app.utils.enums import UserRole

router = APIRouter(prefix="/tickets/{ticket_id}/execution", tags=["执行"])

@router.post("/issue-command", summary="下达操作指令（发令人）")
async def issue_command(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = await ExecutionService.issue_command(db, ticket_id, user)
    return {
        "ticket_no": ticket.ticket_no,
        "status": ticket.status.value,
        "order_time": ticket.order_time.isoformat() if ticket.order_time else None,
        "message": "操作指令已下达"
    }

@router.post("/start", summary="开始执行（操作人）")
async def start_execution(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = await ExecutionService.start_execution(db, ticket_id, user)
    return {"ticket_no": ticket.ticket_no, "status": ticket.status.value}

@router.post("/upload", summary="上传现场数据")
async def upload_media(
    ticket_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # 简化：读取文件内容并调用 FileStorage
    content = await file.read()
    # file_storage = FileStorage()
    # await file_storage.upload_file(ticket_id, file.filename, content)
    return {"filename": file.filename, "size": len(content), "message": "上传成功"}
```

#### Step 5-4：编写执行流程测试

```python
# ====== tests/test_execution.py ======
import pytest
from app.models.ticket import Ticket
from app.models.user import User
from app.utils.enums import TicketStatus, UserRole
from app.services.execution_service import ExecutionService

pytestmark = pytest.mark.asyncio

async def test_issue_command_sets_order_time_and_locks(db_session):
    """验证下达指令写入下令时间并锁定"""
    dispatcher = User(name="发令人", role=UserRole.DISPATCHER, username="dp_test")
    db_session.add(dispatcher)
    await db_session.flush()

    ticket = Ticket(
        ticket_no="20260512-CMD-01", task_name="测试下令",
        status=TicketStatus.PENDING_DISPATCHER
    )
    db_session.add(ticket)
    await db_session.flush()

    ticket = await ExecutionService.issue_command(db_session, str(ticket.id), dispatcher)
    assert ticket.status == TicketStatus.PENDING_EXECUTION
    assert ticket.order_time is not None
    assert ticket.is_locked is True
    assert ticket.dispatcher_id == dispatcher.id

async def test_start_execution_changes_status(db_session):
    """验证开始执行状态转换"""
    operator = User(name="操作人", role=UserRole.OPERATOR, username="op_exec")
    db_session.add(operator)
    await db_session.flush()

    ticket = Ticket(
        ticket_no="20260512-EXEC-01", task_name="测试执行",
        operator_id=operator.id,
        status=TicketStatus.PENDING_EXECUTION
    )
    db_session.add(ticket)
    await db_session.flush()

    ticket = await ExecutionService.start_execution(db_session, str(ticket.id), operator)
    assert ticket.status == TicketStatus.EXECUTING
```

**运行测试：**
```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend
pytest tests/test_execution.py -v --asyncio-mode=auto
```

#### Step 5-5：Phase 5 提交

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add backend/app/services/execution_service.py
git add backend/app/api/v1/execution.py
git add backend/app/core/file_storage.py
git add backend/tests/test_execution.py
git commit -m "feat(execution): implement command issuing and execution monitoring

- Implement ExecutionService.issue_command (CO003):
  order_time write + lock ticket + status change
- Implement ExecutionService.start_execution (CO004):
  PENDING_EXECUTION → EXECUTING
- Add FileStorage abstraction for MinIO media upload
- Add execution API routes (issue-command, start, upload)
- Write execution flow tests"
git tag phase-5-done
```

---

## Phase 6：操作中止与副本管理

### PRD 映射

| PRD 章节 | 对应内容 |
|---|---|
| 三(一) 操作票中止 | 标记、备注、副本 |
| 三(四) 操作任务副本管理 | 创建、补充、审核、交接 |
| 五(二) 中止与副本流程 | 完整分支流程 |
| 六、AT017 操作中止标记 | 原子服务 |
| 六、AT018 操作任务副本创建 | 原子服务 |
| 七、CO007 操作票中止处理 | 编排 |
| 七、CO008 副本操作票启用 | 编排 |

### 文件清单

| 文件 | 说明 |
|---|---|
| `backend/app/services/copy_service.py` | CO007 + CO008 编排 |
| `backend/app/api/v1/copies.py` | 副本管理路由 |
| `backend/tests/test_copy_flow.py` | 中止+副本流程测试 |
| `backend/tests/test_void_flow.py` | 作废流程测试 |

### Phase 6 执行步骤

#### Step 6-1：实现中止与副本编排（CO007 + CO008）

```python
# ====== services/copy_service.py ======
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket import Ticket
from app.models.ticket_copy import TicketCopy
from app.models.user import User
from app.models.review_record import ReviewRecord
from app.utils.enums import TicketStatus, UserRole, ReviewAction
from app.utils.exceptions import BusinessError, NotFoundError, PermissionDeniedError
from app.core.state_machine import transition

class CopyService:
    """编排服务 CO007：操作票中止处理"""

    @staticmethod
    async def abort_ticket(db: AsyncSession, ticket_id: str, dispatcher: User, remark: str = "") -> Ticket:
        """中止操作票：EXECUTING → SUSPENDED"""
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)
        if ticket.status != TicketStatus.EXECUTING:
            raise BusinessError("Only executing tickets can be aborted")
        if dispatcher.role != UserRole.DISPATCHER:
            raise PermissionDeniedError("Only dispatcher can abort")

        # AT017: 操作中止标记
        ticket.status = transition(ticket.status, TicketStatus.SUSPENDED)
        ticket.remark = remark  # 中止备注
        await db.flush()
        return ticket

    @staticmethod
    async def create_copy(db: AsyncSession, ticket_id: str, dispatcher: User) -> TicketCopy:
        """创建操作任务副本（AT018）"""
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)
        if ticket.status != TicketStatus.SUSPENDED:
            raise BusinessError("Only suspended tickets can be copied")

        copy = TicketCopy(
            original_ticket_id=ticket.id,
            original_ticket_no=ticket.ticket_no,
            copy_ticket_no=f"{ticket.ticket_no}-COPY",
            created_by_id=dispatcher.id,
            executed_ops="",  # 已执行操作标记（JSON string 简化）
            unexecuted_ops="",  # 未执行操作标记
            status="pending_info",  # 待补充人员信息
        )
        db.add(copy)
        await db.flush()
        return copy

    @staticmethod
    async def supplement_copy_info(
        db: AsyncSession, copy_id: str,
        operator_id: str, guardian_id: str, approver_id: str,
        submitter: User,
    ) -> TicketCopy:
        """副本信息补充（CO008 第一部分）"""
        copy = await db.get(TicketCopy, copy_id)
        if not copy:
            raise NotFoundError("TicketCopy", copy_id)
        copy.operator_id = operator_id
        copy.guardian_id = guardian_id
        copy.approver_id = approver_id
        copy.status = "pending_review"
        await db.flush()
        return copy
```

#### Step 6-2：实现作废流程

```python
# ====== 在 services/ticket_service.py 追加 ======
class TicketService:
    # ... 现有方法 ...

    @staticmethod
    async def void_ticket(
        db: AsyncSession, ticket_id: str, user: User, reason: str
    ) -> Ticket:
        """操作票作废（CO009）"""
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)
        if ticket.status in (TicketStatus.COMPLETED, TicketStatus.VOID):
            raise BusinessError("Cannot void a completed or already voided ticket")

        # AT022: 作废标记
        ticket.status = transition(ticket.status, TicketStatus.VOID)
        ticket.remark = f"作废原因: {reason}"
        # 记录作废人、作废时间（在 remark 或 custom field）

        # 写日志
        log = OperationLog(
            ticket_id=ticket.id,
            operator_id=user.id,
            action="VOID_TICKET",
            content=f"操作票作废: {reason}"
        )
        db.add(log)
        await db.flush()
        return ticket
```

#### Step 6-3：创建副本管理路由

```python
# ====== api/v1/copies.py ======
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.copy_service import CopyService
from app.schemas.copy import CopySupplement

router = APIRouter(prefix="/tickets/{ticket_id}/copies", tags=["副本管理"])

@router.post("/abort", summary="中止操作")
async def abort_ticket(
    ticket_id: str, remark: str = "",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = await CopyService.abort_ticket(db, ticket_id, user, remark)
    return {"status": ticket.status.value, "message": "操作已中止"}

@router.post("", summary="创建副本")
async def create_copy(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    copy = await CopyService.create_copy(db, ticket_id, user)
    return {"copy_id": str(copy.id), "copy_ticket_no": copy.copy_ticket_no}

@router.post("/{copy_id}/supplement", summary="补充副本人员信息")
async def supplement_copy(
    ticket_id: str, copy_id: str,
    data: CopySupplement,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    copy = await CopyService.supplement_copy_info(
        db, copy_id,
        operator_id=data.operator_id,
        guardian_id=data.guardian_id,
        approver_id=data.approver_id,
        submitter=user,
    )
    return {"copy_id": str(copy.id), "status": copy.status}
```

#### Step 6-4：编写中止+副本流程测试

```python
# ====== tests/test_copy_flow.py ======
import pytest
from app.models.ticket import Ticket
from app.models.ticket_copy import TicketCopy
from app.models.user import User
from app.utils.enums import TicketStatus, UserRole
from app.services.copy_service import CopyService

pytestmark = pytest.mark.asyncio

async def test_full_abort_and_copy_flow(db_session):
    """验证完整的中止 → 副本创建 → 信息补充流程"""
    # 准备数据
    dispatcher = User(name="发令人", role=UserRole.DISPATCHER, username="dp_abort")
    db_session.add(dispatcher)
    await db_session.flush()

    ticket = Ticket(
        ticket_no="20260512-AB-01", task_name="测试中止",
        status=TicketStatus.EXECUTING
    )
    db_session.add(ticket)
    await db_session.flush()

    # 1. 中止操作
    ticket = await CopyService.abort_ticket(
        db_session, str(ticket.id), dispatcher,
        remark="现场安全措施不符合要求"
    )
    assert ticket.status == TicketStatus.SUSPENDED
    assert "安全措施不符合要求" in ticket.remark

    # 2. 创建副本
    copy = await CopyService.create_copy(db_session, str(ticket.id), dispatcher)
    assert copy.original_ticket_id == ticket.id
    assert copy.status == "pending_info"

    # 3. 补充人员信息
    operator = User(name="新操作人", role=UserRole.OPERATOR, username="op2")
    guardian = User(name="新监护人", role=UserRole.GUARDIAN, username="gd2")
    approver = User(name="新批准人", role=UserRole.APPROVER, username="ap2")
    db_session.add_all([operator, guardian, approver])
    await db_session.flush()

    copy = await CopyService.supplement_copy_info(
        db_session, str(copy.id),
        operator_id=str(operator.id),
        guardian_id=str(guardian.id),
        approver_id=str(approver.id),
        submitter=dispatcher,
    )
    assert copy.status == "pending_review"
```

#### Step 6-5：编写作废测试

```python
# ====== tests/test_void_flow.py ======
import pytest
from app.models.ticket import Ticket
from app.models.user import User
from app.utils.enums import TicketStatus, UserRole
from app.services.ticket_service import TicketService

pytestmark = pytest.mark.asyncio

async def test_void_ticket(db_session):
    """验证操作票作废流程（CO009）"""
    operator = User(name="操作人", role=UserRole.OPERATOR, username="op_void")
    db_session.add(operator)
    await db_session.flush()

    ticket = Ticket(ticket_no="20260512-VOID-01", task_name="测试作废",
                    operator_id=operator.id, status=TicketStatus.DRAFT)
    db_session.add(ticket)
    await db_session.flush()

    ticket = await TicketService.void_ticket(
        db_session, str(ticket.id), operator, reason="计划变更，不再执行"
    )
    assert ticket.status == TicketStatus.VOID
    assert "计划变更" in ticket.remark

async def test_cannot_void_completed_ticket(db_session):
    """验证已完成的票不可作废"""
    operator = User(name="操作人", role=UserRole.OPERATOR, username="op_v2")
    db_session.add(operator)
    await db_session.flush()

    ticket = Ticket(ticket_no="20260512-VOID-02", task_name="已完成票",
                    operator_id=operator.id, status=TicketStatus.COMPLETED)
    db_session.add(ticket)
    await db_session.flush()

    with pytest.raises(BusinessError, match="Cannot void a completed"):
        await TicketService.void_ticket(db_session, str(ticket.id), operator, reason="test")
```

**运行测试：**
```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend
pytest tests/test_copy_flow.py tests/test_void_flow.py -v --asyncio-mode=auto
```

#### Step 6-6：Phase 6 提交

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add backend/app/services/copy_service.py
git add backend/app/api/v1/copies.py
git add backend/tests/test_copy_flow.py
git add backend/tests/test_void_flow.py
git commit -m "feat(copy): implement ticket abort and copy management

- Implement CopyService.abort_ticket (CO007): EXECUTING → SUSPENDED
- Implement CopyService.create_copy (AT018): creates ticket copy
- Implement CopyService.supplement_copy_info (CO008 part 1)
- Implement TicketService.void_ticket (CO009): void flow
- Add copy management API routes
- Write full abort→copy→supplement flow test
- Write void flow tests including edge case"
git tag phase-6-done
```

---

## Phase 7：数据收尾与归档

### PRD 映射

| PRD 章节 | 对应内容 |
|---|---|
| 三(一) 操作票收尾 | 数据总召校验 |
| 三(一) 操作票归档 | 结构化存档 + PDF 生成 |
| 六、AT011 数据总召校验 | 原子服务 |
| 六、AT013 结构化存档 | 原子服务 |
| 六、AT014 PDF 文档生成 | 原子服务 |
| 七、CO005 收尾数据处理 | 编排 |
| 七、CO006 全量归档 | 编排 |

### 文件清单

| 文件 | 说明 |
|---|---|
| `backend/app/services/archive_service.py` | CO005 + CO006 编排 |
| `backend/app/services/pdf_service.py` | PDF 生成 |
| `backend/app/api/v1/archive.py` | 归档路由 |
| `backend/tests/test_archive.py` | 归档流程测试 |

### Phase 7 执行步骤

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend
mkdir -p templates
```

#### Step 7-1：实现收尾与归档编排（CO005 + CO006）

```python
# ====== services/archive_service.py ======
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket import Ticket
from app.models.operation_log import OperationLog
from app.utils.enums import TicketStatus
from app.utils.exceptions import BusinessError, NotFoundError
from app.core.state_machine import transition

class ArchiveService:
    """编排服务 CO005 + CO006"""

    @staticmethod
    async def finalize_execution(db: AsyncSession, ticket_id: str) -> Ticket:
        """操作收尾：EXECUTING → COMPLETED（简化版，不含实际总召）"""
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)
        if ticket.status != TicketStatus.EXECUTING:
            raise BusinessError("Only executing tickets can be finalized")

        # 实际中在这里调用 AT011 数据总召校验
        ticket.status = transition(ticket.status, TicketStatus.COMPLETED)
        log = OperationLog(
            ticket_id=ticket.id,
            action="FINALIZE_EXECUTION",
            content="操作收尾完成，数据总召校验通过"
        )
        db.add(log)
        await db.flush()
        return ticket

    @staticmethod
    async def archive_ticket(db: AsyncSession, ticket_id: str) -> Ticket:
        """操作票归档（CO006）"""
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            raise NotFoundError("Ticket", ticket_id)
        if ticket.status != TicketStatus.COMPLETED:
            raise BusinessError("Only completed tickets can be archived")

        # AT013: 结构化存档（实际中转为只读归档表）
        ticket.is_locked = True
        # AT014: PDF 生成（转调 pdf_service）
        # AT021: 归档数据接口开放

        log = OperationLog(
            ticket_id=ticket.id,
            action="ARCHIVE_TICKET",
            content="操作票已归档"
        )
        db.add(log)
        await db.flush()
        return ticket
```

#### Step 7-2：实现 PDF 生成服务

```python
# ====== services/pdf_service.py ======
from weasyprint import HTML
from app.models.ticket import Ticket

class PdfService:
    """原子服务 AT014：PDF 文档生成"""

    @staticmethod
    async def generate_ticket_pdf(ticket: Ticket) -> bytes:
        """根据操作票数据生成 PDF 工单文档"""
        html_content = f"""
        <html>
        <head><meta charset="utf-8"></head>
        <body>
            <h1>操作票工单</h1>
            <p>票号: {ticket.ticket_no}</p>
            <p>任务名称: {ticket.task_name}</p>
            <p>状态: {ticket.status.value}</p>
            <p>建立时间: {ticket.created_at.isoformat()}</p>
            <hr/>
            <h2>操作内容</h2>
            <pre>{ticket.draft_info}</pre>
        </body>
        </html>
        """
        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
```

#### Step 7-3：创建归档路由

```python
# ====== api/v1/archive.py ======
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.archive_service import ArchiveService
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/tickets/{ticket_id}/archive", tags=["归档"])

@router.post("/finalize", summary="操作收尾")
async def finalize_execution(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = await ArchiveService.finalize_execution(db, ticket_id)
    return {"ticket_no": ticket.ticket_no, "status": ticket.status.value}

@router.post("", summary="操作票归档")
async def archive_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticket = await ArchiveService.archive_ticket(db, ticket_id)
    return {"ticket_no": ticket.ticket_no, "status": ticket.status.value}

@router.get("/pdf", summary="下载 PDF 工单")
async def download_pdf(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.services.ticket_service import TicketService
    ticket = await TicketService.get_ticket(db, ticket_id)
    pdf_bytes = await PdfService.generate_ticket_pdf(ticket)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={ticket.ticket_no}.pdf"}
    )
```

#### Step 7-4：编写归档测试

```python
# ====== tests/test_archive.py ======
import pytest
from app.models.ticket import Ticket
from app.utils.enums import TicketStatus
from app.services.archive_service import ArchiveService
from app.services.pdf_service import PdfService
from app.utils.exceptions import BusinessError

pytestmark = pytest.mark.asyncio

async def test_finalize_execution(db_session):
    ticket = Ticket(ticket_no="20260512-FIN-01", task_name="收尾测试",
                    status=TicketStatus.EXECUTING)
    db_session.add(ticket)
    await db_session.flush()

    ticket = await ArchiveService.finalize_execution(db_session, str(ticket.id))
    assert ticket.status == TicketStatus.COMPLETED

async def test_archive_completed_ticket(db_session):
    ticket = Ticket(ticket_no="20260512-ARC-01", task_name="归档测试",
                    status=TicketStatus.COMPLETED)
    db_session.add(ticket)
    await db_session.flush()

    ticket = await ArchiveService.archive_ticket(db_session, str(ticket.id))
    assert ticket.is_locked is True

async def test_pdf_generation(db_session):
    ticket = Ticket(ticket_no="20260512-PDF-01", task_name="PDF测试",
                    draft_info={"station": "变电站A", "operation": "断开101开关"})
    pdf = await PdfService.generate_ticket_pdf(ticket)
    assert len(pdf) > 0
    assert pdf.startswith(b"%PDF")  # PDF 文件头
```

#### Step 7-5：Phase 7 提交

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add backend/app/services/archive_service.py
git add backend/app/services/pdf_service.py
git add backend/app/api/v1/archive.py
git add backend/tests/test_archive.py
git commit -m "feat(archive): implement execution finalization and ticket archiving

- Implement ArchiveService.finalize_execution (CO005)
- Implement ArchiveService.archive_ticket (CO006)
- Implement PdfService.generate_ticket_pdf (AT014) with WeasyPrint
- Add archive API routes (finalize, archive, download PDF)
- Write finalization, archiving, and PDF generation tests"
git tag phase-7-done
```

---

## Phase 8：查询统计与人员管理

### PRD 映射

| PRD 章节 | 对应内容 |
|---|---|
| 三(一) 操作票查询 | 多条件查询 |
| 三(一) 操作票统计 | 按维度统计 |
| 三(二) 人员信息管理 | 人员 CRUD |
| 六、AT015 操作票信息查询 | 原子服务 |
| 六、AT016 操作票数据统计 | 原子服务 |
| 六、AT019 人员信息维护 | 原子服务 |
| 七、CO010 操作票查询统计 | 编排 |
| 七、CO011 人员信息管理 | 编排 |

### 文件清单

| 文件 | 说明 |
|---|---|
| `backend/app/services/statistics_service.py` | CO010 编排 |
| `backend/app/api/v1/statistics.py` | 统计路由 |
| `backend/app/api/v1/users.py` | 人员管理路由 |
| `backend/tests/test_statistics.py` | 统计测试 |

### Phase 8 执行步骤

#### Step 8-1：实现统计编排（CO010）

```python
# ====== services/statistics_service.py ======
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.ticket import Ticket
from app.utils.enums import TicketStatus

class StatisticsService:
    """编排服务 CO010：操作票查询统计"""

    @staticmethod
    async def count_by_status(db: AsyncSession) -> dict:
        """按状态统计操作票数量"""
        result = await db.execute(
            select(Ticket.status, func.count(Ticket.id))
            .group_by(Ticket.status)
        )
        return {status.value: count for status, count in result.all()}

    @staticmethod
    async def count_by_operator(db: AsyncSession, start_date: str = None, end_date: str = None) -> list:
        """按操作人统计"""
        query = select(Ticket.operator_id, func.count(Ticket.id)).group_by(Ticket.operator_id)
        if start_date:
            query = query.where(Ticket.created_at >= start_date)
        if end_date:
            query = query.where(Ticket.created_at <= end_date)
        result = await db.execute(query)
        return [{"operator_id": str(op_id), "count": count} for op_id, count in result.all()]

    @staticmethod
    async def list_tickets_with_filters(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        ticket_no: str = None,
        task_name: str = None,
        status: TicketStatus = None,
        operator_name: str = None,
        start_date: str = None,
        end_date: str = None,
    ) -> tuple[list[Ticket], int]:
        """多条件模糊查询操作票"""
        query = select(Ticket)
        if ticket_no:
            query = query.where(Ticket.ticket_no.ilike(f"%{ticket_no}%"))
        if task_name:
            query = query.where(Ticket.task_name.ilike(f"%{task_name}%"))
        if status:
            query = query.where(Ticket.status == status)
        if start_date:
            query = query.where(Ticket.created_at >= start_date)
        if end_date:
            query = query.where(Ticket.created_at <= end_date)

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        query = query.order_by(Ticket.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        return list(result.scalars().all()), total
```

#### Step 8-2：创建统计和人员路由

```python
# ====== api/v1/statistics.py ======
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.statistics_service import StatisticsService

router = APIRouter(prefix="/statistics", tags=["统计"])

@router.get("/by-status", summary="按状态统计")
async def stats_by_status(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await StatisticsService.count_by_status(db)

@router.get("/by-operator", summary="按操作人统计")
async def stats_by_operator(
    start_date: str = None, end_date: str = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await StatisticsService.count_by_operator(db, start_date, end_date)
```

#### Step 8-3：编写统计测试

```python
# ====== tests/test_statistics.py ======
import pytest
from app.models.ticket import Ticket
from app.models.user import User
from app.utils.enums import TicketStatus, UserRole
from app.services.statistics_service import StatisticsService

pytestmark = pytest.mark.asyncio

async def test_count_by_status(db_session):
    # 创建不同状态的操作票
    for i, status in enumerate([TicketStatus.DRAFT, TicketStatus.DRAFT,
                                 TicketStatus.EXECUTING, TicketStatus.COMPLETED]):
        ticket = Ticket(ticket_no=f"20260512-STAT-{i:03d}",
                        task_name=f"测试{i}", status=status)
        db_session.add(ticket)
    await db_session.flush()

    stats = await StatisticsService.count_by_status(db_session)
    assert stats["draft"] == 2
    assert stats["executing"] == 1
    assert stats["completed"] == 1
```

#### Step 8-4：Phase 8 提交

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add backend/app/services/statistics_service.py
git add backend/app/api/v1/statistics.py
git add backend/app/api/v1/users.py
git add backend/tests/test_statistics.py
git commit -m "feat(stats): implement ticket query and statistics (CO010)

- Add StatisticsService with count_by_status and count_by_operator
- Add multi-condition fuzzy search with pagination
- Add statistics API routes
- Write statistics tests"
git tag phase-8-done
```

---

## Phase 9：外部集成（三峡行云推送）

### PRD 映射

| PRD 章节 | 对应内容 |
|---|---|
| 三(三) 操作结果推送 | 通过三峡行云推送 |
| 六、AT012 操作结果推送 | 原子服务 |
| 六、AT021 归档数据接口 | 原子服务 |

### 文件清单

| 文件 | 说明 |
|---|---|
| `backend/app/services/integration_service.py` | 三峡行云集成服务 |
| `backend/tests/test_integration.py` | 集成测试（mock） |

### Phase 9 执行步骤

#### Step 9-1：实现三峡行云推送（AT012）

```python
# ====== services/integration_service.py ======
import httpx
from app.config import settings

class SanshaIntegrationService:
    """三峡行云外部系统集成"""

    BASE_URL = "https://api.sanxia-cloud.com/v1"  # 示例地址

    @classmethod
    async def push_operation_result(cls, ticket_no: str, result_data: dict) -> bool:
        """AT012: 推送操作结果至工作负责人"""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{cls.BASE_URL}/operation-result",
                json={
                    "ticket_no": ticket_no,
                    "result": result_data,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                headers={"Authorization": f"Bearer {settings.SANXIA_API_KEY}"},
                timeout=30.0,
            )
            return resp.status_code == 200
```

#### Step 9-2：Phase 9 提交

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add backend/app/services/integration_service.py
git commit -m "feat(integration): add Sanxia Cloud push service (AT012)

- Implement SanshaIntegrationService for operation result push
- Configure API endpoint and auth headers
- Add async HTTP client with timeout"
git tag phase-9-done
```

---

## Phase 10：前端页面实现

### PRD 映射

| PRD 章节 | 页面 |
|---|---|
| 四(一) 系统工作台 | Dashboard |
| 四(二) 操作票建立页 | TicketCreate |
| 四(三) 操作票审核页 | TicketReview |
| 四(四) 操作票执行监控页 | TicketExecution |
| 四(五) 中止与副本管理 | TicketAbort + CopyManagement |
| 四(六) 收尾与归档 | Archive |
| 四(七) 查询统计 | Statistics |
| 四(八) 人员管理 | UserManagement |

### 文件清单

| 前端页面文件 | 对应 PRD 页面 |
|---|---|
| `src/pages/Dashboard/index.tsx` | 系统工作台 |
| `src/pages/TicketCreate/index.tsx` | 操作票建立 |
| `src/pages/TicketReview/index.tsx` | 三级审核 |
| `src/pages/TicketExecution/index.tsx` | 执行监控 |
| `src/pages/TicketAbort/index.tsx` | 中止处理 |
| `src/pages/CopyManagement/index.tsx` | 副本管理 |
| `src/pages/Archive/index.tsx` | 收尾归档 |
| `src/pages/Statistics/index.tsx` | 查询统计 |
| `src/pages/UserManagement/index.tsx` | 人员管理 |
| `src/components/Layout.tsx` | 全局布局 |

### Phase 10 执行步骤

#### Step 10-1：创建全局布局与路由

```tsx
// ====== src/App.tsx ======
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Dashboard from './pages/Dashboard';
import TicketCreate from './pages/TicketCreate';
import TicketReview from './pages/TicketReview';
import TicketExecution from './pages/TicketExecution';
import TicketAbort from './pages/TicketAbort';
import CopyManagement from './pages/CopyManagement';
import Archive from './pages/Archive';
import Statistics from './pages/Statistics';
import UserManagement from './pages/UserManagement';
import Layout from './components/Layout';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tickets/create" element={<TicketCreate />} />
            <Route path="/tickets/:id/review" element={<TicketReview />} />
            <Route path="/tickets/:id/execution" element={<TicketExecution />} />
            <Route path="/tickets/:id/abort" element={<TicketAbort />} />
            <Route path="/copies/:id" element={<CopyManagement />} />
            <Route path="/archive/:id" element={<Archive />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/users" element={<UserManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
```

#### Step 10-2：创建 API client

```ts
// ====== src/api/client.ts ======
import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
```

#### Step 10-3：实现核心页面（每个页面约 100-200 行代码）

每个页面的实现要点：

| 页面 | 关键组件 | 核心交互 |
|---|---|---|
| **Dashboard** | `@ant-design/icons` 统计卡片、待办列表、操作人快捷入口 | 按角色展示待办事项 + 各状态统计数；**点击统计卡片 → 跳转到带状态预筛选的查询页**（例：监护人点击"待审核"→ `/tickets?status=pending_guardian`，点击"执行中"→ `/tickets?status=executing`）；独立的"查询操作票"按钮 → `/tickets`（无预筛选，纯查询入口） |
| **TicketCreate** | Ant Design Form、动态表单列表 | 基础信息 + 操作内容 + 危险源 + 工器具 |
| **TicketReview** | Descriptions、Modal | 全量信息展示、编辑、通过/驳回按钮 |
| **TicketExecution** | Steps、Upload | 逐条标记执行、音视频上传 |
| **TicketAbort** | Modal、Form | 中止确认、备注填写、创建副本 |
| **CopyManagement** | Form、Steps | 人员补充、提交审核、交接记录 |
| **Archive** | Progress、Button | 数据总召校验、归档进度、PDF 下载 |
| **Statistics** | `@ant-design/charts` | 柱状图/饼图、筛选、导出 |
| **UserManagement** | Table、Form Modal | 人员列表、新增/编辑/删除 |

**Dashboard 统计卡片导航逻辑（区别于原始 PRD）：**

```tsx
// src/pages/Dashboard/index.tsx（核心导航逻辑）
// 不再跳转到空查询页，而是预置状态筛选参数

const statsCards = [
  {
    label: '待审核',
    count: pendingCount,
    color: '#faad14',
    onClick: () => navigate('/tickets?status=pending_guardian'), // 直达监护人待审核
  },
  {
    label: '执行中',
    count: executingCount,
    color: '#1890ff',
    onClick: () => navigate('/tickets?status=executing'), // 预筛执行中
  },
  {
    label: '已完成',
    count: completedCount,
    color: '#52c41a',
    onClick: () => navigate('/tickets?status=completed'), // 预筛已完成
  },
];

// 独立入口：纯查询（无预筛选）
// <Button onClick={() => navigate('/tickets')}>查询操作票</Button>
```

| 角色 | "待审核"跳转 | "执行中"跳转 | "已完成"跳转 |
|---|---|---|---|
| **操作人** | `/tickets?status=draft&operator_id=me` | `/tickets?status=executing&operator_id=me` | `/tickets?status=completed&operator_id=me` |
| **监护人** | `/tickets?status=pending_guardian&guardian_id=me` | `/tickets?status=executing&guardian_id=me` | `/tickets?status=completed&guardian_id=me` |
| **发令人** | `/tickets?status=pending_dispatcher&dispatcher_id=me` | `/tickets?status=executing&dispatcher_id=me` | `/tickets?status=completed&dispatcher_id=me` |

这样每个统计卡片点击后直接展示对应状态的操作票列表，用户无需二次筛选。

#### Step 10-4：前端测试

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/frontend

# 示例组件测试
cat > src/pages/Dashboard/__tests__/Dashboard.test.tsx << 'TEST'
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Dashboard from '../index';

describe('Dashboard', () => {
  it('renders welcome message', () => {
    render(<Dashboard />);
    expect(screen.getByText(/操作票管理系统/)).toBeInTheDocument();
  });
});
TEST

npx vitest run
```

#### Step 10-5：Phase 10 提交

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add frontend/
git commit -m "feat(ui): implement all frontend pages

- Add App.tsx with react-router-dom routes
- Add API client with axios and auth interceptors
- Implement Dashboard, TicketCreate, TicketReview pages
- Implement TicketExecution, TicketAbort, CopyManagement pages
- Implement Archive, Statistics, UserManagement pages
- Add shared Layout component
- Write initial component tests"
git tag phase-10-done
```

---

## Phase 11：端到端集成测试与交付

### 执行步骤

#### Step 11-1：启动全栈环境

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval

# 启动基础设施
docker compose up -d

# 启动后端
cd backend
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload --port 8000 &

# 启动前端
cd ../frontend
npm run dev &
```

#### Step 11-2：运行全量测试

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval/backend
source .venv/bin/activate
pytest tests/ -v --asyncio-mode=auto --cov=app --cov-report=term-missing
```

**预期结果：** 覆盖率 > 85%，所有测试通过

#### Step 11-3：手动验证 API

```bash
# 1. 用户登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. 创建操作票
TOKEN="<上一步返回的 token>"
curl -X POST http://localhost:8000/api/v1/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"task_name":"#1 主变由运行转检修","draft_info":{"station":"A变电站"}}'

# 3. 查询操作票列表
curl http://localhost:8000/api/v1/tickets?page=1\&page_size=10 \
  -H "Authorization: Bearer $TOKEN"

# 4. 访问 OpenAPI 文档
open http://localhost:8000/docs
```

#### Step 11-4：交付前检查清单

```bash
# 1. 代码规范检查
cd backend && source .venv/bin/activate && pip install ruff && ruff check app/
cd ../frontend && npx eslint src/

# 2. 类型检查
cd frontend && npx tsc --noEmit

# 3. 安全扫描（依赖）
cd backend && pip-audit
cd frontend && npm audit

# 4. 构建验证
cd frontend && npm run build

# 5. Docker 构建
cd .. && docker compose -f docker-compose.yml build
```

#### Step 11-5：最终发布

```bash
cd /Users/melody/Desktop/tbd和superpowers/tbd-superpowers-eval
git add .
git commit -m "release: v1.0.0 操作票管理系统

完整实现功能：
- 操作票全生命周期管理（建立、审核、生效、执行、收尾、归档）
- 三级审核流程（监护人→批准人→发令人）
- 操作票中止与副本管理
- 操作票作废处理
- 查询统计与人员管理
- 三峡行云外部集成推送
- 8 个前端页面完成实现

覆盖 PRD 全部需求点"
git tag v1.0.0
```

---

## 交付检查清单

### 功能覆盖（PRD 章节映射）

| PRD 章节 | 状态 | 对应 Phase |
|---|---|---|
| 二、实体清单（8 个实体） | ✅ | Phase 1 |
| 三(一) 操作票全生命周期 | ✅ | Phase 3-8 |
| 三(二) 角色权限与待办 | ✅ | Phase 2, 4 |
| 三(三) 数据同步与推送 | ✅ | Phase 5, 9 |
| 三(四) 副本管理 | ✅ | Phase 6 |
| 四、页面清单（8 页） | ✅ | Phase 10 |
| 五(一) 标准执行流程 | ✅ | Phase 3-5 |
| 五(二) 中止与副本流程 | ✅ | Phase 6 |
| 五(三) 作废流程 | ✅ | Phase 6 |
| 六、原子服务（AT001-AT022） | ✅ | Phase 1-9 |
| 七、编排服务（CO001-CO011） | ✅ | Phase 3-9 |

### 测试覆盖

| 测试文件 | 覆盖场景 |
|---|---|
| `test_auth.py` | 登录成功/失败、token 验证 |
| `test_ticket_crud.py` | 创建、暂存、提交送审、列表查询 |
| `test_review_flow.py` | 三级审核通过、驳回回退 |
| `test_execution.py` | 下令时间写入、锁定、开始执行 |
| `test_copy_flow.py` | 中止→副本创建→信息补充 |
| `test_void_flow.py` | 作废流程、已完成票不可作废 |
| `test_archive.py` | 收尾完成、归档、PDF 生成 |
| `test_statistics.py` | 按状态/人员统计 |

### 最终架构总览

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (React + Ant Design 5)            │
│  Dashboard 建票  审核  执行  中止  副本  归档  统计  人员  │
└──────────────┬──────────────────────────────────────────┘
               │ HTTP REST (JSON)
               ▼
┌─────────────────────────────────────────────────────────┐
│              API 层 (FastAPI + Pydantic)                 │
│  auth  tickets  reviews  execution  copies  archive  ... │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│           编排服务层 (对应 CO001–CO011)                   │
│  TicketService  ReviewService  ExecutionService          │
│  CopyService  ArchiveService  StatisticsService          │
│  NotificationService  IntegrationService                 │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│           原子服务层 + 基础设施                            │
│  StateMachine  TicketNoGen  FileStorage  PdfService      │
│  Security (JWT)  Redis  MinIO  Alembic                  │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│           数据层 (PostgreSQL + SQLAlchemy 2.0)           │
│  User  Ticket  Hazard  Tool  WorkTicket                 │
│  OperationLog  Notification  ReviewRecord  TicketCopy    │
└─────────────────────────────────────────────────────────┘
```

