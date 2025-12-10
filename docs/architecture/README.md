# 架构文档

## 📚 文档索引

### 核心架构设计
- **[多AI支持架构设计](./MULTI_AI_ARCHITECTURE.md)** - 完整的三层架构设计文档
- **[实现计划](./IMPLEMENTATION_PLAN.md)** - 详细的实现步骤和检查清单

## 🏗️ 架构概览

### 三层解耦架构

```
AI应用层 (Application Layer)
    ↓
Prompt控制层 (Prompt Layer)  
    ↓
AI访问层 (Provider Layer)
```

### 核心组件

1. **AI访问层** (`server/services/ai/providers/`)
   - 负责与各AI提供商的API交互
   - 统一的`AIProvider`接口
   - 支持Gemini、OpenAI、Claude等

2. **Prompt控制层** (`server/services/prompts/`)
   - 负责Prompt的构建和管理
   - 模板化Prompt管理
   - JSON Schema定义

3. **AI应用层** (`server/services/application/`)
   - 业务逻辑编排
   - 错误处理和降级策略
   - 统一的对外接口

### 关键特性

✅ **多AI支持** - 支持多个AI提供商
✅ **降级策略** - 自动切换到备用AI
✅ **解耦设计** - 三层架构清晰分离
✅ **可扩展性** - 易于添加新的AI提供商
✅ **配置灵活** - 通过配置管理AI提供商

## 🚀 快速开始

查看 [实现计划](./IMPLEMENTATION_PLAN.md) 了解详细的实现步骤。

## 📖 相关文档

- [并发问题分析](../concurrency/并发问题分析-中文.md)
- [部署文档](../deployment/PRODUCTION_DEPLOYMENT.md)
- [问题修复记录](../fixes/README.md)
