# 多AI支持实现计划

## 📋 实现检查清单

### Phase 1: 基础架构搭建 ✅

- [ ] 创建目录结构
  - [ ] `server/services/ai/providers/base/`
  - [ ] `server/services/ai/providers/gemini/`
  - [ ] `server/services/ai/providers/openai/`
  - [ ] `server/services/ai/manager/`
  - [ ] `server/services/ai/config/`
  - [ ] `server/services/prompts/`
  - [ ] `server/services/prompts/templates/`
  - [ ] `server/services/prompts/schemas/`
  - [ ] `server/services/application/`

- [ ] 定义基础接口和类型
  - [ ] `AIProvider` 接口
  - [ ] `GenerateOptions` 接口
  - [ ] `GenerateResult` 接口
  - [ ] `ProviderStatus` 接口
  - [ ] 错误类型定义

### Phase 2: Prompt控制层实现

- [ ] PromptBuilder实现
  - [ ] `buildPrompt(level, context)` 方法
  - [ ] `getSchema()` 方法
  - [ ] `getSystemPrompt()` 方法

- [ ] Prompt模板提取
  - [ ] Basic级别模板
  - [ ] Intermediate级别模板
  - [ ] Advanced级别模板

- [ ] JSON Schema定义
  - [ ] SentenceAnalysisData的Schema
  - [ ] 验证和转换逻辑

### Phase 3: AI访问层实现

- [ ] GeminiProvider实现
  - [ ] 重构现有`geminiService.js`
  - [ ] 实现`AIProvider`接口
  - [ ] 错误处理和状态管理

- [ ] OpenAIProvider实现
  - [ ] OpenAI API集成
  - [ ] 实现`AIProvider`接口
  - [ ] 错误处理

- [ ] DeepSeekProvider实现
  - [ ] DeepSeek API集成（使用OpenAI兼容格式）
  - [ ] 实现`AIProvider`接口
  - [ ] 错误处理

- [ ] QwenProvider实现
  - [ ] 阿里Qwen DashScope API集成
  - [ ] 实现`AIProvider`接口
  - [ ] 错误处理

- [ ] ClaudeProvider实现（可选）
  - [ ] Claude API集成
  - [ ] 实现`AIProvider`接口

### Phase 4: AI应用层实现

- [ ] SentenceAnalysisService实现
  - [ ] `generateSentenceAnalysis()` 方法
  - [ ] 集成PromptBuilder
  - [ ] 集成AIProviderManager
  - [ ] 业务逻辑编排

### Phase 5: 管理器和降级策略

- [ ] AIProviderManager实现
  - [ ] 提供商注册和发现
  - [ ] 优先级管理
  - [ ] 状态监控

- [ ] FallbackStrategy实现
  - [ ] 降级逻辑
  - [ ] 错误判断
  - [ ] 重试机制

- [ ] AIConfig实现
  - [ ] 配置加载
  - [ ] 环境变量支持
  - [ ] 动态配置更新

### Phase 6: 集成和测试

- [ ] 更新server.js
  - [ ] 替换旧的geminiService调用
  - [ ] 使用新的SentenceAnalysisService

- [ ] 更新前端（如需要）
  - [ ] 错误处理更新
  - [ ] 添加AI提供商选择UI（可选）

- [ ] 测试
  - [ ] 单元测试
  - [ ] 集成测试
  - [ ] 端到端测试

## 🔧 技术选型

### AI提供商SDK

- **Gemini**: `@google/genai` (已使用)
- **OpenAI**: `openai` npm package
- **Claude**: `@anthropic-ai/sdk`

### 依赖安装

```bash
npm install openai @anthropic-ai/sdk @alicloud/dashscope
```

**说明**：
- DeepSeek 使用 OpenAI 兼容的 API，可以直接使用 `openai` SDK
- Qwen 使用阿里云 DashScope API，需要安装 `@alicloud/dashscope`

## 📝 代码示例

### 1. AIProvider基础类

```javascript
// server/services/ai/providers/base/AIProvider.js

export class BaseAIProvider {
  constructor(config) {
    this.name = config.name;
    this.config = config;
  }
  
  isAvailable() {
    return this.config.enabled && !!this.config.apiKey;
  }
  
  async generate(prompt, options = {}) {
    throw new Error('generate() must be implemented by subclass');
  }
  
  getStatus() {
    return {
      available: this.isAvailable(),
      name: this.name,
    };
  }
}
```

### 2. PromptBuilder示例

```javascript
// server/services/prompts/PromptBuilder.js

export class PromptBuilder {
  buildPrompt(level, context = {}) {
    const template = this.getTemplate(level);
    const systemPrompt = this.getSystemPrompt();
    const levelInstruction = this.getLevelInstruction(level);
    
    return `${systemPrompt}

${levelInstruction}

${template}`;
  }
  
  getSchema() {
    return {
      type: 'object',
      properties: {
        originalSentence: { type: 'string' },
        words: { type: 'array', items: { type: 'string' } },
        wordRoles: { type: 'array', items: { type: 'string' } },
        structureType: { type: 'string' },
        skeletonIndices: { type: 'array', items: { type: 'integer' } },
        explanation: { type: 'string' },
        options: { type: 'array', items: { type: 'string' } },
      },
      required: ['originalSentence', 'words', 'wordRoles', 'structureType', 'skeletonIndices', 'explanation', 'options'],
    };
  }
}
```

### 3. AIProviderManager示例

```javascript
// server/services/ai/manager/AIProviderManager.js

export class AIProviderManager {
  constructor(config) {
    this.providers = new Map();
    this.config = config;
    this.fallbackStrategy = new FallbackStrategy();
  }
  
  registerProvider(provider) {
    this.providers.set(provider.name, provider);
  }
  
  getAvailableProviders() {
    return Array.from(this.providers.values())
      .filter(p => p.isAvailable())
      .sort((a, b) => {
        const priorityA = this.config.providers[a.name]?.priority || 999;
        const priorityB = this.config.providers[b.name]?.priority || 999;
        return priorityA - priorityB;
      });
  }
  
  async generateWithFallback(prompt, options) {
    const providers = this.getAvailableProviders();
    return this.fallbackStrategy.executeWithFallback(providers, prompt, options);
  }
}
```

## 🎯 优先级

1. **高优先级**：基础架构 + GeminiProvider重构
2. **中优先级**：Prompt控制层 + OpenAIProvider
3. **低优先级**：ClaudeProvider + 高级功能

## 📅 时间估算

- Phase 1: 1-2小时
- Phase 2: 2-3小时
- Phase 3: 3-4小时
- Phase 4: 2-3小时
- Phase 5: 2-3小时
- Phase 6: 2-3小时

**总计**: 12-18小时
