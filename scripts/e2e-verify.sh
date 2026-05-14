#!/usr/bin/env bash
#
# e2e-verify.sh — 操作票管理系统端到端流程验证脚本
#
# 覆盖流程：登录 → 创建 → 提交 → 三级审核（监护人/批准人/发令人）
#           → 下令 → 开始执行 → 逐项执行 → 完成 → 校验
#
# 前置条件：
#   1. 数据库已启动 (docker compose up -d)
#   2. 后端已在 localhost:3000 运行 (pnpm start:dev)
#   3. 种子数据已填充 (pnpm prisma:seed)
#
# 用法：
#   bash scripts/e2e-verify.sh
#

set -euo pipefail

API="http://localhost:3000/api/v1"
PASS=0
FAIL=0

green() { echo -e "\033[32m✓ $1\033[0m"; }
red()   { echo -e "\033[31m✗ $1\033[0m"; }
info()  { echo -e "\033[36m▶ $1\033[0m"; }

check_response() {
  local step="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    green "$step"
    PASS=$((PASS + 1))
  else
    red "$step (expected: $expected)"
    echo "  response: $actual"
    FAIL=$((FAIL + 1))
  fi
}

# ==================== 开始验证 ====================
echo ""
info "操作票管理系统 — 端到端流程验证"
echo "========================================"
echo ""

# ---- Step 1: 操作人登录 ----
info "Step 1: 操作人 (zs) 登录"
LOGIN_ZS=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"personnelId":"zs","password":"123"}')
TOKEN_ZS=$(echo "$LOGIN_ZS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
check_response "  操作人登录" "access_token" "$LOGIN_ZS"
if [ -z "$TOKEN_ZS" ]; then red "  无法获取 token，终止验证"; exit 1; fi

# ---- Step 2: 监护人登录 ----
LOGIN_ZL=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"personnelId":"zl","password":"123"}')
TOKEN_ZL=$(echo "$LOGIN_ZL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
check_response "  监护人登录" "access_token" "$LOGIN_ZL"

# ---- Step 3: 批准人登录 ----
LOGIN_SB=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"personnelId":"sb","password":"123"}')
TOKEN_SB=$(echo "$LOGIN_SB" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
check_response "  批准人登录" "access_token" "$LOGIN_SB"

# ---- Step 4: 发令人登录 ----
LOGIN_WS=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"personnelId":"ws","password":"123"}')
TOKEN_WS=$(echo "$LOGIN_WS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
check_response "  发令人登录" "access_token" "$LOGIN_WS"

# ---- Step 5: 创建操作票 ----
info "Step 2: 创建操作票"
CREATE_RES=$(curl -s -X POST "$API/tickets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZS" \
  -d '{
    "taskName": "E2E验证-1号主变停电操作",
    
    "supervisorId": "zl",
    "approverId": "sb",
    "dispatcherId": "ws",
    "basicInfo": {"team":"运行一班","area":"主变区"},
    "workTicketNo": "WT-E2E-001",
    "items": [
      {"stepContent":"检查现场安全措施"},
      {"stepContent":"断开相关开关"},
      {"stepContent":"确认设备已停电"}
    ]
  }')
TICKET_ID=$(echo "$CREATE_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ticketId',''))" 2>/dev/null || echo "")
check_response "  创建操作票" "ticketId" "$CREATE_RES"
if [ -z "$TICKET_ID" ]; then red "  无法获取 ticketId，终止验证"; exit 1; fi
info "  操作票 ID: $TICKET_ID"

# ---- Step 6: 提交送审 ----
SUBMIT_RES=$(curl -s -X POST "$API/tickets/$TICKET_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZS")
check_response "  提交送审" "PENDING_SUPERVISOR" "$SUBMIT_RES"
sleep 2

# ---- Step 7: 监护人审核通过 ----
SUPERVISOR_RES=$(curl -s -X POST "$API/tickets/$TICKET_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZL" \
  -d '{"action":"approve","comment":"监护人审核通过"}')
check_response "  监护人审核" "PENDING_APPROVER" "$SUPERVISOR_RES"
sleep 2

# ---- Step 8: 批准人审核通过 ----
APPROVER_RES=$(curl -s -X POST "$API/tickets/$TICKET_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SB" \
  -d '{"action":"approve","comment":"批准人审核通过"}')
check_response "  批准人审核" "PENDING_DISPATCHER" "$APPROVER_RES"
sleep 2

# ---- Step 9: 发令人审核通过并下令 ----
DISPATCHER_RES=$(curl -s -X POST "$API/tickets/$TICKET_ID/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_WS" \
  -d '{"action":"approve","comment":"发令人审核通过"}' 2>/dev/null || echo "{}")

# 发令人审核通过 + 下达指令（服务端自动映射为 approve_and_dispatch 并写入 dispatchTime）
check_response "  发令人审核+下令" "PENDING_EXECUTE" "$DISPATCHER_RES"
sleep 2

# ---- Step 10: 开始执行 ----
START_EXEC_RES=$(curl -s -X POST "$API/tickets/$TICKET_ID/start-execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZS")
check_response "  开始执行" "EXECUTING" "$START_EXEC_RES"
sleep 2

# ---- Step 11: 逐项执行 ----
# 获取操作项列表
TICKET_DETAIL=$(curl -s -X GET "$API/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $TOKEN_ZS")
ITEM1_ID=$(echo "$TICKET_DETAIL" | python3 -c "
import sys,json
t=json.load(sys.stdin)
items=t.get('items',[])
if items: print(items[0].get('itemId',''))
" 2>/dev/null || echo "")
ITEM2_ID=$(echo "$TICKET_DETAIL" | python3 -c "
import sys,json
t=json.load(sys.stdin)
items=t.get('items',[])
if len(items)>1: print(items[1].get('itemId',''))
" 2>/dev/null || echo "")
ITEM3_ID=$(echo "$TICKET_DETAIL" | python3 -c "
import sys,json
t=json.load(sys.stdin)
items=t.get('items',[])
if len(items)>2: print(items[2].get('itemId',''))
" 2>/dev/null || echo "")

if [ -n "$ITEM1_ID" ]; then
  EXEC_ITEM1=$(curl -s -X PUT "$API/tickets/$TICKET_ID/items/$ITEM1_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_ZS" \
    -d '{"action":"execute"}')
  check_response "  执行第1项" "COMPLETED" "$EXEC_ITEM1"
  sleep 2
fi

if [ -n "$ITEM2_ID" ]; then
  EXEC_ITEM2=$(curl -s -X PUT "$API/tickets/$TICKET_ID/items/$ITEM2_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_ZS" \
    -d '{"action":"skip"}')
  check_response "  跳过第2项" "SKIPPED" "$EXEC_ITEM2"
  sleep 2
fi

if [ -n "$ITEM3_ID" ]; then
  EXEC_ITEM3=$(curl -s -X PUT "$API/tickets/$TICKET_ID/items/$ITEM3_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_ZS" \
    -d '{"action":"execute"}')
  check_response "  执行第3项" "COMPLETED" "$EXEC_ITEM3"
  sleep 2
fi

# ---- Step 12: 完成执行 ----
COMPLETE_RES=$(curl -s -X POST "$API/tickets/$TICKET_ID/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ZS")
check_response "  完成执行" "COMPLETED" "$COMPLETE_RES"
sleep 2

# ---- Step 13: 数据校验通过 ----
VERIFY_RES=$(curl -s -X POST "$API/tickets/$TICKET_ID/verify" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_WS" \
  -d '{"action":"verify_pass","comment":"校验通过，归档"}')
check_response "  校验通过" "COMPLETED\|verify_pass\|校验通过" "$VERIFY_RES"

# ---- Step 14: 查询时间线 ----
TIMELINE_RES=$(curl -s -X GET "$API/tickets/$TICKET_ID/timeline" \
  -H "Authorization: Bearer $TOKEN_ZS")
check_response "  查询时间线" "logs" "$TIMELINE_RES"

# ---- Step 15: 查询状态信息 ----
STATUS_RES=$(curl -s -X GET "$API/tickets/$TICKET_ID/status" \
  -H "Authorization: Bearer $TOKEN_ZS")
check_response "  查询状态" "currentStatus" "$STATUS_RES"

# ---- Step 16: 查询列表 ----
LIST_RES=$(curl -s -X GET "$API/tickets" \
  -H "Authorization: Bearer $TOKEN_ZS")
check_response "  查询列表" "data" "$LIST_RES"

# ---- Step 17: 健康检查 ----
HEALTH_RES=$(curl -s -X GET "$API/health" \
  -H "Authorization: Bearer $TOKEN_ZS")
check_response "  健康检查" "ok\|status" "$HEALTH_RES"

# ==================== 汇总 ====================
echo ""
echo "========================================"
echo -e "\033[36m验证完成：通过 $PASS / 失败 $FAIL\033[0m"
echo "========================================"
echo ""

if [ $FAIL -eq 0 ]; then
  green "所有验证通过！"
  exit 0
else
  red "存在 $FAIL 个验证失败，请检查日志。"
  exit 1
fi
