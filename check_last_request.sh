#!/bin/bash
# 追踪最后一笔API请求的详细信息

# 自动查找最新的服务器日志文件
LOG_DIR="/Users/sy/.cursor/projects/Users-sy-Desktop-English-master-english-analysis/terminals"
LOG_FILE=$(ls -t "$LOG_DIR"/*.txt 2>/dev/null | head -1)

if [ -z "$LOG_FILE" ]; then
    echo "❌ 未找到日志文件"
    exit 1
fi

echo "=== 追踪最后一笔请求 ==="
echo "📁 日志文件: $LOG_FILE"
echo ""

# 查找最后一笔请求的相关日志
echo "📊 API调用日志（总耗时）："
API_LOG=$(tail -1000 "$LOG_FILE" | grep -E "\[API\].*completed in" | tail -1)
if [ -z "$API_LOG" ]; then
    echo "  ⚠️  暂无API请求记录"
else
    echo "  $API_LOG"
fi

echo ""
echo "🤖 AI提供商调用详情："
FALLBACK_LOGS=$(tail -1000 "$LOG_FILE" | grep -E "\[Fallback\].*Success with|\[Fallback\].*failed" | tail -10)
if [ -z "$FALLBACK_LOGS" ]; then
    echo "  ⚠️  暂无AI提供商调用记录"
else
    echo "$FALLBACK_LOGS" | while read line; do
        echo "  $line"
    done
fi

echo ""
echo "📝 服务层处理日志："
SERVICE_LOGS=$(tail -1000 "$LOG_FILE" | grep -E "\[SentenceAnalysisService\]" | tail -5)
if [ -z "$SERVICE_LOGS" ]; then
    echo "  ⚠️  暂无服务层日志"
else
    echo "$SERVICE_LOGS" | while read line; do
        echo "  $line"
    done
fi

echo ""
echo "🔍 最新日志（最后30行，包含所有相关信息）："
tail -30 "$LOG_FILE" | grep -E "\[API\]|\[Fallback\]|\[SentenceAnalysisService\]|POST|GET|Error|error" || tail -30 "$LOG_FILE"
