#!/bin/bash
# 并发测试脚本
# 用于测试多用户同时保存问题时是否存在数据丢失

SERVER_URL="${1:-http://localhost:3001}"
NUM_REQUESTS="${2:-10}"

echo "=========================================="
echo "并发测试脚本"
echo "=========================================="
echo "服务器: $SERVER_URL"
echo "并发请求数: $NUM_REQUESTS"
echo ""

# 获取初始数量
echo "1. 获取初始问题库大小..."
INITIAL_SIZE=$(curl -s "$SERVER_URL/api/questions/size" | grep -o '"size":[0-9]*' | cut -d':' -f2)
echo "   初始大小: $INITIAL_SIZE"
echo ""

# 发送并发请求
echo "2. 发送 $NUM_REQUESTS 个并发请求..."
TIMESTAMP=$(date +%s)
RANDOM_PREFIX=$$  # 使用进程ID确保唯一性
for i in $(seq 1 $NUM_REQUESTS); do
  # 使用更可靠的唯一标识
  UNIQUE_SENTENCE="Test concurrent ${RANDOM_PREFIX}_${i}_${TIMESTAMP}"
  curl -X POST "$SERVER_URL/api/questions" \
    -H "Content-Type: application/json" \
    -d "{
      \"originalSentence\": \"${UNIQUE_SENTENCE}\",
      \"level\": \"Advanced\",
      \"words\": [\"Test\", \"sentence\", \"${i}\"],
      \"wordRoles\": {\"0\": \"主语\", \"1\": \"谓语\", \"2\": \"宾语\"},
      \"structureType\": \"主谓宾 (SVO)\",
      \"skeletonIndices\": [0, 1, 2],
      \"explanation\": \"This is a test sentence ${i}\",
      \"options\": [\"主语\", \"谓语\", \"宾语\"]
    }" \
    -s -o /tmp/curl_output_$i.txt \
    -w "请求 $i: HTTP %{http_code}\n" &
  
  echo "   请求 $i 已发送 (sentence: ${UNIQUE_SENTENCE})"
  # 稍微延迟以产生更好的并发效果
  sleep 0.01
done

# 等待所有请求完成
echo ""
echo "3. 等待所有请求完成..."
wait
echo "   所有请求已完成"
echo ""

# 等待所有请求完成并显示结果
echo ""
echo "   检查请求响应..."
for i in $(seq 1 $NUM_REQUESTS); do
  if [ -f /tmp/curl_output_$i.txt ]; then
    if grep -q "Question saved" /tmp/curl_output_$i.txt; then
      echo "   ✅ 请求 $i 成功"
    elif grep -q "already exists" /tmp/curl_output_$i.txt; then
      echo "   ⚠️  请求 $i 已存在（正常）"
    else
      echo "   ❌ 请求 $i 失败: $(cat /tmp/curl_output_$i.txt)"
    fi
    rm -f /tmp/curl_output_$i.txt
  fi
done

# 等待一秒确保文件写入完成
sleep 2

# 检查最终数量
echo "4. 检查最终问题库大小..."
FINAL_SIZE=$(curl -s "$SERVER_URL/api/questions/size" | grep -o '"size":[0-9]*' | cut -d':' -f2)
echo "   最终大小: $FINAL_SIZE"
echo ""

# 计算结果
EXPECTED_SIZE=$((INITIAL_SIZE + NUM_REQUESTS))
ACTUAL_ADDED=$((FINAL_SIZE - INITIAL_SIZE))

echo "=========================================="
echo "测试结果"
echo "=========================================="
echo "初始大小: $INITIAL_SIZE"
echo "预期最终大小: $EXPECTED_SIZE"
echo "实际最终大小: $FINAL_SIZE"
echo "预期添加: $NUM_REQUESTS"
echo "实际添加: $ACTUAL_ADDED"
echo ""

if [ "$FINAL_SIZE" -eq "$EXPECTED_SIZE" ]; then
  echo "✅ 测试通过！所有问题都成功保存。"
  exit 0
else
  LOST=$((NUM_REQUESTS - ACTUAL_ADDED))
  echo "❌ 测试失败！丢失了 $LOST 个问题。"
  echo ""
  echo "这表明存在并发竞争条件（race condition）问题。"
  echo "建议查看 CONCURRENCY_ANALYSIS.md 了解如何修复。"
  exit 1
fi
