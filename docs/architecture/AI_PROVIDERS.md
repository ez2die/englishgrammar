# AI提供商支持详情

## 📋 支持的AI提供商

### 1. Gemini (Google) ✅ 已实现

**状态**: 当前默认提供商

**配置**:
```javascript
{
  name: 'gemini',
  enabled: true,
  priority: 1,
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.5-flash-lite',
  fallbackModel: 'gemini-1.5-flash',
}
```

**SDK**: `@google/genai`

**API文档**: https://ai.google.dev/docs

**特点**:
- ✅ 免费层每日20次请求
- ✅ 响应速度快
- ✅ 支持结构化输出（JSON Schema）

---

### 2. OpenAI (GPT) 🔄 计划实现

**状态**: 待实现

**配置**:
```javascript
{
  name: 'openai',
  enabled: true,
  priority: 2,
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
  fallbackModel: 'gpt-3.5-turbo',
}
```

**SDK**: `openai`

**API文档**: https://platform.openai.com/docs

**特点**:
- ✅ 模型质量高
- ✅ 支持结构化输出
- ✅ 稳定的API

**成本**: 按token计费

---

### 3. DeepSeek 🔄 计划实现

**状态**: 待实现

**配置**:
```javascript
{
  name: 'deepseek',
  enabled: true,
  priority: 2,
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat',
  fallbackModel: 'deepseek-reasoner',
  apiBase: 'https://api.deepseek.com',
}
```

**SDK**: `openai` (兼容OpenAI API格式)

**API文档**: https://platform.deepseek.com/docs

**特点**:
- ✅ 性价比高
- ✅ 兼容OpenAI API格式（可直接使用openai SDK）
- ✅ 支持结构化输出
- ✅ 中文理解能力强

**成本**: 相对较低

---

### 4. Qwen (阿里通义千问) 🔄 计划实现

**状态**: 待实现

**配置**:
```javascript
{
  name: 'qwen',
  enabled: true,
  priority: 2,
  apiKey: process.env.QWEN_API_KEY,
  model: 'qwen-turbo',
  fallbackModel: 'qwen-plus',
  apiBase: 'https://dashscope.aliyuncs.com/api/v1',
}
```

**SDK**: `@alicloud/dashscope` 或直接使用 fetch

**API文档**: https://help.aliyun.com/zh/dashscope/

**特点**:
- ✅ 中文理解能力强
- ✅ 国内访问速度快
- ✅ 支持结构化输出
- ✅ 阿里云生态集成

**成本**: 按token计费，有免费额度

---

### 5. Claude (Anthropic) 🔄 可选实现

**状态**: 可选实现

**配置**:
```javascript
{
  name: 'claude',
  enabled: false,
  priority: 3,
  apiKey: process.env.CLAUDE_API_KEY,
  model: 'claude-3-haiku-20240307',
}
```

**SDK**: `@anthropic-ai/sdk`

**API文档**: https://docs.anthropic.com/

**特点**:
- ✅ 模型质量高
- ✅ 安全性好
- ⚠️ 成本较高

---

## 🔄 降级优先级建议

### 推荐配置（按优先级）

1. **Gemini** (priority: 1) - 默认，免费层
2. **DeepSeek** (priority: 2) - 主要备用，性价比高
3. **Qwen** (priority: 2) - 主要备用，中文友好
4. **OpenAI** (priority: 2) - 主要备用，质量高
5. **Claude** (priority: 3) - 可选备用

### 降级策略

```
Gemini (默认)
  ↓ 配额耗尽/限流
DeepSeek (备用1)
  ↓ 失败
Qwen (备用2)
  ↓ 失败
OpenAI (备用3)
  ↓ 失败
Claude (备用4，可选)
```

---

## 🔑 API Key配置

### 环境变量

在 `.env.local` 文件中配置：

```bash
# Gemini (必需，当前默认)
GEMINI_API_KEY=your_gemini_api_key

# DeepSeek (推荐配置)
DEEPSEEK_API_KEY=your_deepseek_api_key

# Qwen (推荐配置)
QWEN_API_KEY=your_qwen_api_key

# OpenAI (可选)
OPENAI_API_KEY=your_openai_api_key

# Claude (可选)
CLAUDE_API_KEY=your_claude_api_key
```

### 获取API Key

1. **Gemini**: https://ai.google.dev/
2. **DeepSeek**: https://platform.deepseek.com/
3. **Qwen**: https://dashscope.console.aliyun.com/
4. **OpenAI**: https://platform.openai.com/
5. **Claude**: https://console.anthropic.com/

---

## 📊 提供商对比

| 提供商 | 免费额度 | 成本 | 中文支持 | API稳定性 | 推荐度 |
|--------|---------|------|---------|----------|--------|
| Gemini | 20次/天 | 低 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| DeepSeek | 有 | 低 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Qwen | 有 | 低 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| OpenAI | 无 | 中 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Claude | 无 | 高 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 推荐配置方案

### 方案1: 成本优先（推荐）

```javascript
providers: {
  gemini: { priority: 1, enabled: true },      // 默认
  deepseek: { priority: 2, enabled: true },  // 备用1
  qwen: { priority: 2, enabled: true },       // 备用2
}
```

**优势**: 成本低，中文支持好

### 方案2: 质量优先

```javascript
providers: {
  gemini: { priority: 1, enabled: true },      // 默认
  openai: { priority: 2, enabled: true },      // 备用1
  claude: { priority: 3, enabled: true },       // 备用2
}
```

**优势**: 质量高，稳定性好

### 方案3: 平衡方案（推荐）

```javascript
providers: {
  gemini: { priority: 1, enabled: true },      // 默认
  deepseek: { priority: 2, enabled: true },   // 备用1（性价比）
  qwen: { priority: 2, enabled: true },        // 备用2（中文）
  openai: { priority: 3, enabled: true },     // 备用3（质量）
}
```

**优势**: 平衡成本、质量和中文支持

---

## 🔧 实现注意事项

### DeepSeek实现要点

1. **API格式**: 完全兼容OpenAI API
2. **SDK使用**: 可以直接使用 `openai` SDK，只需修改 `baseURL`
3. **示例**:
```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});
```

### Qwen实现要点

1. **API格式**: DashScope API（类似OpenAI但略有不同）
2. **SDK选择**: 
   - 使用 `@alicloud/dashscope` SDK（推荐）
   - 或直接使用 fetch 调用 REST API
3. **示例**:
```javascript
import { DashScope } from '@alicloud/dashscope';

const client = new DashScope({
  apiKey: process.env.QWEN_API_KEY,
});
```

---

## 📝 实现优先级

1. **Phase 1**: GeminiProvider重构（基础架构）
2. **Phase 2**: DeepSeekProvider实现（高优先级，性价比高）
3. **Phase 3**: QwenProvider实现（高优先级，中文友好）
4. **Phase 4**: OpenAIProvider实现（中优先级）
5. **Phase 5**: ClaudeProvider实现（低优先级，可选）
