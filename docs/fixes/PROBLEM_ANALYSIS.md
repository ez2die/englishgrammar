# 问题深入分析

## 🔍 问题现象

用户反馈仍然看到错误消息："生成服务暂时不可用，建议使用已保存的问题。"

从控制台日志看：
1. ✅ 503 错误被正确捕获
2. ✅ "生成失败，尝试从问题库加载" 日志出现
3. ❌ 但最终仍然显示了错误消息

## 🔎 根本原因分析

### 问题 1: 错误对象属性可能未正确传递

当 503 错误从 `geminiService.ts` 抛出时：
```typescript
// geminiService.ts
if (response.status === 503) {
  const error = new Error(errorData.message || errorData.error || '生成服务暂时不可用');
  (error as any).status = 503;
  (error as any).code = errorData.code;
  (error as any).isQuotaExceeded = true;
  (error as any).shouldFallback = true;
  throw error;
}
```

但在 App.tsx 中检查时：
```typescript
if (e.status === 503 || e.isQuotaExceeded || e.code === 'GEMINI_QUOTA_EXCEEDED' || e.shouldFallback) {
  // 降级处理
}
```

**可能的问题**: 
- 如果错误对象在传递过程中属性丢失
- 或者条件判断不匹配
- 会走到 "其他错误" 分支，显示错误消息

### 问题 2: "其他错误" 分支总是显示错误

在 App.tsx 第 149-156 行：
```typescript
// 其他错误，尝试从问题库加载
const bankData = await storageService.getRandomQuestion(level, previousSentence);
if (bankData) {
   setData(bankData);
   setSourceInfo('Review Mode');
   setErrorMsg("生成失败，已从历史问题加载。"); // ❌ 这里设置了错误消息
} else {
   setErrorMsg("生成失败，请稍后再试或检查网络连接。");
}
```

**问题**: 即使成功从问题库加载，也显示了错误消息！

### 问题 3: 内部 catch 可能没有正确处理

内部 try-catch (第 87-101 行)：
```typescript
catch (generateError: any) {
  const bankData = await storageService.getRandomQuestion(level, previousSentence);
  if (bankData) {
    setErrorMsg(null); // ✅ 设置了 null
    return;
  }
  throw generateError; // 如果失败，抛出到外层
}
```

**可能的问题**: 
- 如果 `getRandomQuestion` 返回 `null`（虽然 API 测试正常）
- 或者有异步问题
- 错误会被抛出到外层，可能匹配到 "其他错误" 分支

## ✅ 解决方案

### 方案 1: 统一错误处理逻辑，确保静默降级

1. **简化错误检查逻辑**：使用更宽泛的条件
2. **统一降级处理**：所有错误都先尝试从问题库加载
3. **只有真正失败时才显示错误**

### 方案 2: 改进错误对象传递

确保错误属性正确传递和检查

### 方案 3: 移除"其他错误"分支的错误消息

如果从问题库成功加载，不应该显示错误
