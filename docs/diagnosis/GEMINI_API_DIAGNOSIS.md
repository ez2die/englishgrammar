# Gemini API 不可用问题诊断报告

## 🔍 问题确认

使用 curl 直接测试 Gemini API，确认问题原因。

---

## ✅ 诊断结果

### 1. API 连接状态
- ✅ API Key 已配置
- ✅ API Key 格式正确（长度 39 字符）
- ✅ 网络连接正常
- ❌ **API 返回 429 错误**

### 2. 错误详情

**HTTP 状态码**: `429 Too Many Requests`

**错误信息**:
```json
{
  "code": 429,
  "message": "You exceeded your current quota, please check your plan and billing details.",
  "status": "RESOURCE_EXHAUSTED",
  "quotaLimit": "20",
  "quotaMetric": "generativelanguage.googleapis.com/generate_content_free_tier_requests",
  "quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
  "model": "gemini-2.5-flash-lite"
}
```

### 3. 根本原因

**Gemini API 免费层配额限制**:
- ⚠️ **每日配额**: 20 次请求
- ⚠️ **模型**: gemini-2.5-flash-lite
- ⚠️ **配额类型**: `GenerateRequestsPerDayPerProjectPerModel-FreeTier`
- ⚠️ **当前状态**: 配额已用完

---

## 📊 配额限制说明

### Gemini API 免费层限制

根据错误信息，免费层限制：

| 限制项 | 限制值 |
|--------|--------|
| **每日请求数** | 20 次/天 |
| **模型** | gemini-2.5-flash-lite |
| **配额重置** | 每日（UTC 时间） |

### 配额耗尽影响

1. **API 返回 429 错误**
2. **所有生成请求失败**
3. **系统自动降级到问题库**（已实现）

---

## 🧪 测试命令

### 使用 curl 直接测试

```bash
# 获取 API Key
API_KEY=$(cat .env | grep -E "^GEMINI_API_KEY=|^API_KEY=" | head -1 | cut -d'=' -f2)

# 测试 API
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Say hello"
      }]
    }]
  }'
```

### 预期响应

**配额已用完时**:
```json
{
  "error": {
    "code": 429,
    "message": "You exceeded your current quota...",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

**配额正常时**:
```json
{
  "candidates": [{
    "content": {
      "parts": [{"text": "Hello! How can I help you?"}]
    }
  }]
}
```

---

## 🔧 解决方案

### 方案 1: 等待配额重置（短期）

**配额重置时间**:
- Gemini API 配额每天 UTC 时间重置
- 通常在北京时间早上 8 点左右重置

**操作**:
- 等待到明天配额重置
- 系统在此期间会自动使用问题库

### 方案 2: 升级到付费计划（推荐）

**升级步骤**:
1. 访问 https://ai.google.dev/
2. 登录 Google Cloud Console
3. 启用付费功能
4. 配置账单

**付费计划优势**:
- 更高的配额限制
- 更好的性能
- 优先支持

### 方案 3: 优化 API 使用（当前实现）

**已实现的优化**:
1. ✅ **优先使用问题库**: 问题库有足够问题时，70% 概率使用问题库
2. ✅ **智能降级**: 生成失败时自动切换到问题库
3. ✅ **静默处理**: 降级时不显示错误消息

**建议**:
- 保持问题库大小 >= 50 个问题
- 减少不必要的 API 调用
- 利用问题库满足大部分需求

### 方案 4: 使用其他模型（如果可用）

**尝试其他模型**:
```javascript
// 如果其他模型有更高的配额，可以尝试
model: "gemini-pro"  // 或其他可用模型
```

**检查模型配额**:
- 访问 Google Cloud Console
- 查看不同模型的配额限制

---

## 📈 监控配额使用

### 查看配额状态

1. **访问 Google Cloud Console**:
   ```
   https://console.cloud.google.com/
   ```

2. **查看 API 配额**:
   ```
   APIs & Services → Dashboard → Generative Language API
   ```

3. **查看使用量**:
   ```
   https://ai.dev/usage?tab=rate-limit
   ```

### 配额使用建议

1. **监控每日使用量**
2. **在接近限制时增加问题库使用率**
3. **避免不必要的 API 调用**

---

## 🎯 当前系统状态

### 已实现的功能

1. ✅ **智能降级**: 生成失败时自动使用问题库
2. ✅ **多层降级策略**: 多种方式尝试从问题库加载
3. ✅ **静默处理**: 降级成功时不显示错误
4. ✅ **问题库优先**: 问题库有足够问题时优先使用

### 问题库状态

- ✅ **问题库大小**: 50 个问题
- ✅ **数据完整性**: 正常
- ✅ **API 可用**: 正常

### 系统可用性

- ✅ **核心功能**: 正常（使用问题库）
- ⚠️ **新问题生成**: 暂时不可用（配额耗尽）
- ✅ **用户体验**: 正常（自动降级，无感知）

---

## 📝 总结

### 问题确认

✅ **Gemini API 配额已用完**
- 免费层每日限制: 20 次
- 当前状态: 已超出限制
- API 返回: 429 错误

### 系统行为

✅ **系统正常运行**
- 自动降级到问题库
- 用户体验不受影响
- 错误处理已优化

### 建议操作

1. **短期**: 等待配额重置（明天）
2. **中期**: 增加问题库大小
3. **长期**: 考虑升级付费计划

---

## 🔗 相关链接

- [Gemini API 配额说明](https://ai.google.dev/gemini-api/docs/rate-limits)
- [配额使用监控](https://ai.dev/usage?tab=rate-limit)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**诊断完成时间**: 2024-12-10  
**诊断结果**: Gemini API 免费层配额已用完（每日 20 次限制）  
**系统状态**: ✅ 正常运行（自动降级到问题库）
