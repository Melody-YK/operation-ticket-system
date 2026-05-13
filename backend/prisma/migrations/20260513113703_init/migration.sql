-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('draft', 'pending_supervisor', 'pending_approver', 'pending_dispatcher', 'pending_execute', 'executing', 'suspended', 'completed', 'voided', 'rejected');

-- CreateEnum
CREATE TYPE "item_status" AS ENUM ('pending', 'executing', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "personnel_role" AS ENUM ('operator', 'supervisor', 'approver', 'dispatcher');

-- CreateEnum
CREATE TYPE "review_action" AS ENUM ('approve', 'reject');

-- CreateTable
CREATE TABLE "operation_tickets" (
    "ticket_id" TEXT NOT NULL,
    "task_name" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "supervisor_id" TEXT NOT NULL,
    "approver_id" TEXT,
    "dispatcher_id" TEXT,
    "status" "ticket_status" NOT NULL DEFAULT 'draft',
    "basic_info" JSONB,
    "work_ticket_no" TEXT,
    "remarks" TEXT,
    "dispatch_time" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "media_data" BYTEA,
    "tag_data" JSONB,
    "equipment_state" JSONB,
    "signature_info" JSONB,

    CONSTRAINT "operation_tickets_pkey" PRIMARY KEY ("ticket_id")
);

-- CreateTable
CREATE TABLE "operation_items" (
    "item_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "step_content" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "execute_status" "item_status" NOT NULL DEFAULT 'pending',
    "execute_result" TEXT,
    "remarks" TEXT,

    CONSTRAINT "operation_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "operation_copies" (
    "copy_id" TEXT NOT NULL,
    "original_ticket_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_items" JSONB NOT NULL,
    "unexecuted_items" JSONB NOT NULL,
    "handover_group" TEXT,
    "handover_person" TEXT,
    "new_operator_id" TEXT,
    "new_supervisor_id" TEXT,
    "new_approver_id" TEXT,
    "new_dispatcher_id" TEXT,
    "review_status" TEXT NOT NULL DEFAULT 'pending_info',

    CONSTRAINT "operation_copies_pkey" PRIMARY KEY ("copy_id")
);

-- CreateTable
CREATE TABLE "hazards" (
    "hazard_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "measure" TEXT,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "hazards_pkey" PRIMARY KEY ("hazard_id")
);

-- CreateTable
CREATE TABLE "tools" (
    "tool_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "quantity" INTEGER,
    "status" TEXT,
    "recipient" TEXT,
    "received_at" TIMESTAMP(3),
    "return_person" TEXT,
    "returned_at" TIMESTAMP(3),

    CONSTRAINT "tools_pkey" PRIMARY KEY ("tool_id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "log_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "action_node" TEXT NOT NULL,
    "action_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action_detail" TEXT,
    "result" TEXT,
    "remarks" TEXT,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "work_ticket_info" (
    "work_ticket_no" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "safety_measures" TEXT,
    "worker_id" TEXT,
    "worker_name" TEXT,
    "push_status" TEXT,
    "push_time" TIMESTAMP(3),

    CONSTRAINT "work_ticket_info_pkey" PRIMARY KEY ("work_ticket_no")
);

-- CreateTable
CREATE TABLE "personnel" (
    "personnel_id" TEXT NOT NULL,
    "role" "personnel_role" NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "team" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "qualification" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personnel_pkey" PRIMARY KEY ("personnel_id")
);

-- CreateTable
CREATE TABLE "review_locks" (
    "lock_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewer_name" TEXT NOT NULL,
    "lock_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "released" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "review_locks_pkey" PRIMARY KEY ("lock_id")
);

-- CreateTable
CREATE TABLE "todos" (
    "todo_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "todo_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "todos_pkey" PRIMARY KEY ("todo_id")
);

-- CreateIndex
CREATE INDEX "operation_tickets_status_idx" ON "operation_tickets"("status");

-- CreateIndex
CREATE INDEX "operation_tickets_operator_id_idx" ON "operation_tickets"("operator_id");

-- CreateIndex
CREATE INDEX "operation_tickets_supervisor_id_idx" ON "operation_tickets"("supervisor_id");

-- CreateIndex
CREATE INDEX "operation_tickets_created_at_idx" ON "operation_tickets"("created_at");

-- CreateIndex
CREATE INDEX "operation_tickets_status_created_at_idx" ON "operation_tickets"("status", "created_at");

-- CreateIndex
CREATE INDEX "operation_tickets_work_ticket_no_idx" ON "operation_tickets"("work_ticket_no");

-- CreateIndex
CREATE INDEX "operation_items_ticket_id_idx" ON "operation_items"("ticket_id");

-- CreateIndex
CREATE INDEX "operation_items_ticket_id_sequence_idx" ON "operation_items"("ticket_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "operation_items_ticket_id_sequence_key" ON "operation_items"("ticket_id", "sequence");

-- CreateIndex
CREATE INDEX "operation_copies_original_ticket_id_idx" ON "operation_copies"("original_ticket_id");

-- CreateIndex
CREATE INDEX "hazards_ticket_id_idx" ON "hazards"("ticket_id");

-- CreateIndex
CREATE INDEX "tools_ticket_id_idx" ON "tools"("ticket_id");

-- CreateIndex
CREATE INDEX "operation_logs_ticket_id_idx" ON "operation_logs"("ticket_id");

-- CreateIndex
CREATE INDEX "operation_logs_ticket_id_action_time_idx" ON "operation_logs"("ticket_id", "action_time");

-- CreateIndex
CREATE UNIQUE INDEX "work_ticket_info_ticket_id_key" ON "work_ticket_info"("ticket_id");

-- CreateIndex
CREATE INDEX "personnel_role_idx" ON "personnel"("role");

-- CreateIndex
CREATE INDEX "personnel_team_idx" ON "personnel"("team");

-- CreateIndex
CREATE UNIQUE INDEX "personnel_personnel_id_role_key" ON "personnel"("personnel_id", "role");

-- CreateIndex
CREATE INDEX "review_locks_ticket_id_idx" ON "review_locks"("ticket_id");

-- CreateIndex
CREATE INDEX "review_locks_ticket_id_released_idx" ON "review_locks"("ticket_id", "released");

-- CreateIndex
CREATE INDEX "todos_user_id_is_read_idx" ON "todos"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "todos_ticket_id_idx" ON "todos"("ticket_id");

-- AddForeignKey
ALTER TABLE "operation_items" ADD CONSTRAINT "operation_items_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "operation_tickets"("ticket_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_copies" ADD CONSTRAINT "operation_copies_original_ticket_id_fkey" FOREIGN KEY ("original_ticket_id") REFERENCES "operation_tickets"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hazards" ADD CONSTRAINT "hazards_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "operation_tickets"("ticket_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "operation_tickets"("ticket_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "operation_tickets"("ticket_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_ticket_info" ADD CONSTRAINT "work_ticket_info_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "operation_tickets"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;
