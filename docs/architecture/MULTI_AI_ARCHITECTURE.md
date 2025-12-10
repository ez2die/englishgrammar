# 多AI支持架构设计文档

## 📋 架构目标

1. **支持多AI提供商**：Gemini、OpenAI、Claude等
2. **默认AI和降级方案**：主AI失败时自动切换到备用AI
3. **三层解耦架构**：
   - **AI访问层**：负责与各AI提供商的API交互
   - **Prompt控制层**：负责Prompt的构建和管理
   - **AI应用层**：负责业务逻辑和AI调用编排

---

## 🏗️ 架构设计

### 三层架构图

```
┌─────────────────────────────────────────────────────────┐
│                    AI应用层 (Application Layer)          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  SentenceAnalysisService                         │  │
│  │  - generateSentenceAnalysis(level)               │  │
│  │  - 业务逻辑编排                                   │  │
│  │  - 错误处理和降级策略                             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Prompt控制层 (Prompt Layer)              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PromptBuilder                                   │  │
│  │  - buildPrompt(level, context)                   │  │
│  │  - 管理不同难度级别的Prompt模板                  │  │
│  │  - Prompt优化和版本管理                          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  AI访问层 (Provider Layer)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Gemini   │  │ OpenAI   │  │ Claude   │  │ DeepSeek │  │ Qwen     │  │
│  │ Provider │  │ Provider │  │ Provider │  │ Provider │  │ Provider │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│       ↓              ↓              ↓                  │
│  ┌──────────────────────────────────────────────┐   │
│  │         AIProvider Interface                  │   │
│  │  - generate(prompt, options)                  │   │
│  │  - 统一的调用接口                              │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 目录结构

```
server/
├── services/
│   ├── ai/
│   │   ├── providers/              # AI访问层
│   │   │   ├── base/
│   │   │   │   └── AIProvider.js   # 基础接口
│   │   │   ├── gemini/
│   │   │   │   └── GeminiProvider.js
│   │   │   ├── openai/
│   │   │   │   └── OpenAIProvider.js
│   │   │   └── claude/
│   │   │       └── ClaudeProvider.js
│   │   ├── manager/
│   │   │   ├── AIProviderManager.js  # AI提供商管理器
│   │   │   └── FallbackStrategy.js   # 降级策略
│   │   └── config/
│   │       └── AIConfig.js           # AI配置管理
│   ├── prompts/                     # Prompt控制层
│   │   ├── PromptBuilder.js         # Prompt构建器
│   │   ├── templates/               # Prompt模板
│   │   │   ├── basic.js
│   │   │   ├── intermediate.js
│   │   │   └── advanced.js
│   │   └── schemas/                 # JSON Schema定义
│   │       └── sentenceSchema.js
│   └── application/                 # AI应用层
│       └── SentenceAnalysisService.js
```

---

## 🔌 接口定义

### 1. AI访问层接口 (AIProvider)

```typescript
// server/services/ai/providers/base/AIProvider.js

/**
 * AI提供商基础接口
 */
export interface AIProvider {
  /**
   * 提供商名称
   */
  name: string;
  
  /**
   * 是否可用
   */
  isAvailable(): boolean;
  
  /**
   * 生成内容
   * @param prompt - 提示词
   * @param options - 生成选项
   * @returns 生成结果
   */
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
  
  /**
   * 获取提供商状态
   */
  getStatus(): ProviderStatus;
}

export interface GenerateOptions {
  model?: string;           // 模型名称
  temperature?: number;     // 温度参数
  maxTokens?: number;       // 最大token数
  responseFormat?: 'json' | 'text';  // 响应格式
  schema?: object;          // JSON Schema（用于结构化输出）
}

export interface GenerateResult {
  content: string;          // 生成的内容
  model: string;            // 使用的模型
  provider: string;          // 提供商名称
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  metadata?: Record<string, any>;
}

export interface ProviderStatus {
  available: boolean;
  quotaRemaining?: number;
  rateLimitRemaining?: number;
  lastError?: string;
  lastErrorTime?: Date;
}
```

### 2. Prompt控制层接口

```typescript
// server/services/prompts/PromptBuilder.js

export interface PromptBuilder {
  /**
   * 构建Prompt
   * @param level - 难度级别
   * @param context - 上下文信息
   * @returns 完整的Prompt字符串
   */
  buildPrompt(level: DifficultyLevel, context?: PromptContext): string;
  
  /**
   * 获取JSON Schema（用于结构化输出）
   */
  getSchema(): object;
  
  /**
   * 获取系统提示词
   */
  getSystemPrompt(): string;
}

export interface PromptContext {
  previousSentence?: string;  // 之前的句子（用于避免重复）
  userPreferences?: Record<string, any>;  // 用户偏好
}
```

### 3. AI应用层接口

```typescript
// server/services/application/SentenceAnalysisService.js

export interface SentenceAnalysisService {
  /**
   * 生成句子分析
   * @param level - 难度级别
   * @param options - 选项
   * @returns 句子分析数据
   */
  generateSentenceAnalysis(
    level: DifficultyLevel,
    options?: ServiceOptions
  ): Promise<SentenceAnalysisData>;
}

export interface ServiceOptions {
  preferredProvider?: string;  // 首选的AI提供商
  enableFallback?: boolean;    // 是否启用降级
  fallbackProviders?: string[]; // 降级提供商列表
  retryCount?: number;         // 重试次数
}
```

---

## 🔄 降级策略

### 降级流程

```
1. 尝试使用默认AI（Gemini）
   ↓ 失败
2. 检查错误类型
   ├─ 配额耗尽 → 切换到备用AI（OpenAI）
   ├─ 网络错误 → 重试当前AI
   ├─ 超时 → 切换到备用AI
   └─ 其他错误 → 记录日志，尝试备用AI
   ↓ 失败
3. 尝试备用AI列表（按优先级）
   ↓ 全部失败
4. 返回错误或使用本地fallback数据
```

### 降级策略实现

```typescript
// server/services/ai/manager/FallbackStrategy.js

export class FallbackStrategy {
  /**
   * 执行带降级的AI调用
   */
  async executeWithFallback(
    providers: AIProvider[],
    prompt: string,
    options: GenerateOptions
  ): Promise<GenerateResult> {
    const errors: Error[] = [];
    
    for (const provider of providers) {
      if (!provider.isAvailable()) {
        continue;
      }
      
      try {
        const result = await provider.generate(prompt, options);
        return result;
      } catch (error) {
        errors.push(error);
        
        // 判断是否应该继续尝试下一个提供商
        if (this.shouldContinue(error)) {
          continue;
        } else {
          // 致命错误，停止尝试
          break;
        }
      }
    }
    
    // 所有提供商都失败
    throw new AllProvidersFailedError(errors);
  }
  
  /**
   * 判断是否应该继续尝试下一个提供商
   */
  private shouldContinue(error: Error): boolean {
    // 配额耗尽、限流、超时等可以继续尝试
    if (error.status === 429 || error.status === 503) {
      return true;
    }
    
    // 网络错误可以继续尝试
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      return true;
    }
    
    // 其他错误可能不应该继续
    return false;
  }
}
```

---

## ⚙️ 配置管理

### AI配置结构

```javascript
// server/services/ai/config/AIConfig.js

export const AI_CONFIG = {
  // 默认提供商
  defaultProvider: 'gemini',
  
  // 提供商配置
  providers: {
    gemini: {
      enabled: true,
      priority: 1,  // 优先级（数字越小优先级越高）
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.5-flash-lite',
      fallbackModel: 'gemini-1.5-flash',
      options: {
        temperature: 0.7,
        maxTokens: 2000,
      },
      rateLimit: {
        requestsPerMinute: 15,
        requestsPerDay: 20,
      },
    },
    openai: {
      enabled: true,
      priority: 2,
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      fallbackModel: 'gpt-3.5-turbo',
      options: {
        temperature: 0.7,
        maxTokens: 2000,
      },
    },
    claude: {
      enabled: false,  // 默认禁用，需要配置API Key后启用
      priority: 3,
      apiKey: process.env.CLAUDE_API_KEY,
      model: 'claude-3-haiku-20240307',
      options: {
        temperature: 0.7,
        maxTokens: 2000,
      },
    },
    deepseek: {
      enabled: true,
      priority: 2,  // 与OpenAI同级，作为主要备用
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: 'deepseek-chat',
      fallbackModel: 'deepseek-reasoner',
      options: {
        temperature: 0.7,
        maxTokens: 2000,
      },
      // DeepSeek使用OpenAI兼容的API格式
      apiBase: 'https://api.deepseek.com',
    },
    qwen: {
      enabled: true,
      priority: 2,  // 与OpenAI同级，作为主要备用
      apiKey: process.env.QWEN_API_KEY,
      model: 'qwen-turbo',
      fallbackModel: 'qwen-plus',
      options: {
        temperature: 0.7,
        maxTokens: 2000,
      },
      // Qwen使用DashScope API
      apiBase: 'https://dashscope.aliyuncs.com/api/v1',
    },
  },
  
  // 降级配置
  fallback: {
    enabled: true,
    strategy: 'priority',  // 'priority' | 'round-robin' | 'random'
    retryCount: 2,
    retryDelay: 1000,  // ms
  },
};
```

---

## 🔀 数据流

### 完整调用流程

```
1. 客户端请求
   POST /api/generate { level: "Basic" }
   ↓
2. AI应用层 (SentenceAnalysisService)
   - 接收请求
   - 调用Prompt控制层构建Prompt
   ↓
3. Prompt控制层 (PromptBuilder)
   - 根据level选择模板
   - 构建完整Prompt
   - 返回Prompt和Schema
   ↓
4. AI应用层
   - 调用AI提供商管理器
   - 执行降级策略
   ↓
5. AI提供商管理器 (AIProviderManager)
   - 获取可用提供商列表（按优先级排序）
   - 执行降级策略
   ↓
6. AI访问层 (AIProvider)
   - 调用具体AI提供商的API
   - 处理响应和错误
   ↓
7. 返回结果
   - 成功：返回SentenceAnalysisData
   - 失败：尝试下一个提供商或返回错误
```

---

## 📝 实现步骤

### Phase 1: 基础架构
1. ✅ 创建目录结构
2. ✅ 定义接口和类型
3. ✅ 实现AIProvider基础接口
4. ✅ 实现GeminiProvider（重构现有代码）

### Phase 2: Prompt控制层
1. ✅ 创建PromptBuilder
2. ✅ 提取Prompt模板
3. ✅ 实现Schema管理

### Phase 3: AI应用层
1. ✅ 创建SentenceAnalysisService
2. ✅ 实现业务逻辑编排
3. ✅ 集成Prompt控制层

### Phase 4: 多AI支持
1. ✅ 实现OpenAIProvider
2. ✅ 实现ClaudeProvider（可选）
3. ✅ 实现AIProviderManager

### Phase 5: 降级策略
1. ✅ 实现FallbackStrategy
2. ✅ 集成到AIProviderManager
3. ✅ 添加错误处理和日志

### Phase 6: 配置和测试
1. ✅ 实现配置管理
2. ✅ 添加环境变量支持
3. ✅ 编写测试用例

---

## 🎯 关键设计决策

### 1. 接口统一性
- 所有AI提供商实现相同的`AIProvider`接口
- 统一的错误处理和响应格式
- 便于添加新的AI提供商

### 2. 降级策略
- **优先级降级**：按配置的优先级顺序尝试
- **智能错误判断**：根据错误类型决定是否继续
- **重试机制**：支持重试和延迟

### 3. Prompt管理
- **模板化**：不同难度级别使用不同模板
- **版本控制**：支持Prompt版本管理
- **可扩展**：易于添加新的Prompt模板

### 4. 配置灵活性
- **环境变量**：通过环境变量配置API Key
- **动态启用**：可以动态启用/禁用某个提供商
- **优先级调整**：可以调整提供商优先级

---

## 🔒 错误处理

### 错误类型分类

```typescript
export enum AIErrorType {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',      // 配额耗尽
  RATE_LIMIT = 'RATE_LIMIT',              // 限流
  NETWORK_ERROR = 'NETWORK_ERROR',        // 网络错误
  TIMEOUT = 'TIMEOUT',                    // 超时
  INVALID_RESPONSE = 'INVALID_RESPONSE',  // 无效响应
  AUTH_ERROR = 'AUTH_ERROR',              // 认证错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',        // 未知错误
}

export class AIError extends Error {
  type: AIErrorType;
  provider: string;
  status?: number;
  retryable: boolean;  // 是否可重试
}
```

### 错误处理策略

| 错误类型 | 是否重试 | 是否切换提供商 | 操作 |
|---------|---------|--------------|------|
| QUOTA_EXCEEDED | ❌ | ✅ | 切换到下一个提供商 |
| RATE_LIMIT | ✅ | ✅ | 延迟后重试，或切换提供商 |
| NETWORK_ERROR | ✅ | ✅ | 重试，失败后切换提供商 |
| TIMEOUT | ✅ | ✅ | 重试，失败后切换提供商 |
| INVALID_RESPONSE | ❌ | ✅ | 切换到下一个提供商 |
| AUTH_ERROR | ❌ | ❌ | 记录错误，停止尝试 |
| UNKNOWN_ERROR | ✅ | ✅ | 重试，失败后切换提供商 |

---

## 📊 监控和日志

### 日志记录

```typescript
// 记录每次AI调用
{
  timestamp: Date,
  provider: string,
  model: string,
  level: DifficultyLevel,
  success: boolean,
  duration: number,
  tokensUsed?: number,
  error?: string,
}
```

### 指标收集

- 各提供商的调用次数
- 成功率
- 平均响应时间
- Token使用量
- 降级触发次数

---

## 🧪 测试策略

### 单元测试
- AIProvider接口实现
- PromptBuilder
- FallbackStrategy
- SentenceAnalysisService

### 集成测试
- 多AI提供商切换
- 降级流程
- 错误处理

### 端到端测试
- 完整调用流程
- 真实API调用（使用测试Key）

---

## 🚀 迁移计划

### 向后兼容
- 保持现有API接口不变
- 默认使用Gemini（如果配置了）
- 逐步迁移到新架构

### 部署步骤
1. 部署新代码（GeminiProvider使用新架构）
2. 配置其他AI提供商（可选）
3. 启用降级策略
4. 监控和优化

---

## 📚 后续扩展

### 可能的扩展点
1. **AI提供商选择策略**
   - 基于成本选择
   - 基于响应时间选择
   - 基于质量评分选择

2. **Prompt优化**
   - A/B测试不同Prompt
   - 自动Prompt优化
   - 用户反馈学习

3. **缓存机制**
   - 相似请求缓存
   - 结果缓存
   - Prompt缓存

4. **负载均衡**
   - 多个API Key轮询
   - 智能负载分配
