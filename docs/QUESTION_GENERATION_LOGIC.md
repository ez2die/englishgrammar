# 新题目生成控制逻辑说明

## 📋 概述

系统采用**智能混合策略**，在AI生成和本地题库（bank.json）之间动态选择，确保用户体验和系统稳定性。

---

## 🎯 决策流程

### 第一阶段：优先尝试题库（如果题库充足）

```typescript
// App.tsx: initGame()
const bankSize = await storageService.getBankSize(level);

if (bankSize >= 5) {
  // 根据题库大小决定使用概率
  const useBank = bankSize >= 10 
    ? Math.random() > 0.3  // 题库>=10个：70%概率使用题库
    : Math.random() > 0.5; // 题库5-9个：50%概率使用题库
  
  if (useBank) {
    const bankData = await storageService.getRandomQuestion(level, previousSentence);
    if (bankData) {
      setSourceInfo('Review Mode'); // 标记为复习模式
      return; // ✅ 使用题库，结束
    }
  }
}
```

**决策规则：**
- **题库 >= 10个**：70%概率使用题库，30%概率生成新题
- **题库 5-9个**：50%概率使用题库，50%概率生成新题
- **题库 < 5个**：跳过此阶段，直接进入AI生成

---

### 第二阶段：AI生成新题目

```typescript
try {
  const newData = await generateSentenceAnalysis(level);
  setData(newData);
  setSourceInfo('New Challenge'); // 标记为新挑战
  await storageService.saveQuestion(newData); // 保存到题库
  return; // ✅ AI生成成功，结束
} catch (generateError) {
  // 进入降级策略
}
```

**AI生成流程：**
1. 调用 `/api/generate` 端点
2. 后端使用 `SentenceAnalysisService` 生成
3. AI提供商优先级：**Qwen → DeepSeek → Gemini → OpenAI**
4. 成功后自动保存到 `bank.json`
5. 标记为 `'New Challenge'`

---

### 第三阶段：AI失败后的降级策略

当AI生成失败时，系统会**自动降级到题库**，采用**4层渐进式降级**：

```typescript
// 策略1: 精确匹配（level + excludeSentence）
bankData = await storageService.getRandomQuestion(level, previousSentence);

// 策略2: 只匹配level（允许重复）
if (!bankData) {
  bankData = await storageService.getRandomQuestion(level);
}

// 策略3: 检查级别数据，智能降级
if (!bankData) {
  const levelBankSize = await storageService.getBankSize(level);
  if (levelBankSize === 0) {
    // 该级别无数据，直接尝试所有级别
    bankData = await storageService.getRandomQuestion();
  } else {
    // 该级别有数据，但excludeSentence过滤掉了，尝试不带excludeSentence
    bankData = await storageService.getRandomQuestion(level);
    if (!bankData) {
      bankData = await storageService.getRandomQuestion(); // 降级到所有级别
    }
  }
}

// 策略4: 最后尝试，无任何限制
if (!bankData) {
  bankData = await storageService.getRandomQuestion();
}
```

**降级特点：**
- ✅ **静默处理**：成功从题库加载时不显示错误
- ✅ **渐进放宽**：从最严格到最宽松的条件
- ✅ **最大化成功率**：确保用户总能获得题目

---

### 第四阶段：外层错误处理（最终保障）

如果所有策略都失败，外层catch会再次尝试题库加载：

```typescript
catch (e) {
  // 再次尝试题库（三层降级）
  bankData = await storageService.getRandomQuestion(level, previousSentence);
  if (!bankData) {
    bankData = await storageService.getRandomQuestion(level);
  }
  if (!bankData) {
    bankData = await storageService.getRandomQuestion();
  }
  
  if (bankData) {
    setSourceInfo('Review Mode');
    setErrorMsg(null); // 不显示错误
    return;
  }
  
  // 如果题库也没有，才显示错误
  setErrorMsg('无法加载题目，请稍后重试');
}
```

---

## 🔄 完整流程图

```
用户点击"开始游戏"
    ↓
检查题库大小 (bankSize)
    ↓
┌─────────────────────────────────────┐
│ 题库 >= 5个？                        │
└─────────────────────────────────────┘
    │                    │
  是│                    │否
    ↓                    ↓
随机决定使用题库        直接进入AI生成
    │                    │
    ↓                    ↓
┌─────────────┐    ┌──────────────────┐
│ 使用题库？   │    │ 调用AI生成        │
└─────────────┘    └──────────────────┘
    │                    │
  是│                    │
    ↓                    ↓
从bank.json加载    ┌──────────────────┐
    │            │ AI生成成功？      │
    │            └──────────────────┘
    │                    │
    │                  是│
    │                    ↓
    │            保存到bank.json
    │                    │
    │                    │
    └──────────┬────────┘
                │
                ↓
        显示题目给用户
```

---

## 📊 后端API端点

### 1. POST `/api/generate` - AI生成

**请求：**
```json
{
  "level": "Intermediate",
  "preferredProvider": "qwen" // 可选
}
```

**响应：**
```json
{
  "originalSentence": "...",
  "words": [...],
  "wordRoles": {...},
  "structureType": "主谓宾 (SVO)",
  ...
}
```

**错误处理：**
- `503`: 所有AI提供商失败 → 建议使用题库
- `429`: 请求过于频繁
- `500`: 服务器错误

---

### 2. GET `/api/questions/random` - 从题库随机获取

**请求参数：**
- `level` (可选): 难度级别过滤
- `excludeSentence` (可选): 排除特定句子

**响应：**
- 成功：返回题目对象
- 无匹配：返回 `null`

**逻辑：**
```javascript
// server.js: /api/questions/random
1. 读取 bank.json
2. 按 level 过滤（如果提供）
3. 排除 excludeSentence（如果提供）
4. 随机选择一个返回
```

---

## 🎨 用户体验标识

系统通过 `sourceInfo` 标识题目来源：

- **`'New Challenge'`**: AI新生成的题目
- **`'Review Mode'`**: 从题库加载的题目

---

## 🔧 配置参数

### 题库使用概率阈值

```typescript
// App.tsx:44-80
bankSize >= 10: 70%概率使用题库
bankSize 5-9:  50%概率使用题库
bankSize < 5:  跳过题库，直接AI生成
```

### AI提供商优先级

```javascript
// server/services/ai/config/AIConfig.js
1. Qwen (priority: 1)      ← 最高优先级
2. DeepSeek (priority: 2)
3. Gemini (priority: 3)
4. OpenAI (priority: 3)
```

---

## 📝 关键代码位置

| 功能 | 文件 | 行数 |
|------|------|------|
| 前端决策逻辑 | `App.tsx` | 44-210 |
| AI生成服务 | `server/services/application/SentenceAnalysisService.js` | 24-77 |
| 题库随机API | `server.js` | 247-286 |
| 题库大小API | `server.js` | 288-300 |
| 前端存储服务 | `services/storageService.ts` | 38-61 |

---

## 🎯 设计优势

1. **智能平衡**：根据题库大小动态调整策略
2. **用户体验**：优先使用题库（快速响应），必要时生成新题（保持新鲜感）
3. **稳定性**：多层降级确保总能获得题目
4. **静默降级**：AI失败时自动切换到题库，用户无感知
5. **数据积累**：AI生成的题目自动保存，题库持续增长

---

## 🔍 调试建议

查看最后一笔请求的详细信息：
```bash
bash check_last_request.sh
```

检查题库状态：
```bash
curl "http://localhost:3001/api/questions/size?level=Intermediate"
```

测试题库随机获取：
```bash
curl "http://localhost:3001/api/questions/random?level=Intermediate"
```
