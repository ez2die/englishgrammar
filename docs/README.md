# 项目文档索引

本文档目录包含项目的所有技术文档，按类别组织。

---

## 📁 文档目录结构

```
docs/
├── architecture/     # 架构设计文档（新增）
├── deployment/        # 部署相关文档
├── concurrency/       # 并发问题分析文档
├── fixes/            # 问题修复文档
├── diagnosis/        # 诊断报告文档
└── README.md         # 本文档（文档索引）
```

---

## 📚 文档分类

### 🏗️ 架构文档 (architecture/)

**多AI支持架构**:
- `MULTI_AI_ARCHITECTURE.md` - 完整的三层架构设计文档
- `IMPLEMENTATION_PLAN.md` - 详细的实现计划和检查清单
- `README.md` - 架构文档索引

**核心设计**:
- 三层解耦架构（AI访问层、Prompt控制层、AI应用层）
- 多AI提供商支持（Gemini、OpenAI、Claude）
- 智能降级策略
- 配置管理

**使用场景**:
- 了解架构设计 → `MULTI_AI_ARCHITECTURE.md`
- 开始实现 → `IMPLEMENTATION_PLAN.md`

---

### 🚀 部署文档 (deployment/)

**生产环境部署**:
- `PRODUCTION_DEPLOYMENT.md` - 完整生产环境部署指南
- `QUICK_DEPLOY.md` - 快速部署指南
- `DEPLOY_READY.md` - 部署就绪确认清单
- `DEPLOYMENT_SUCCESS.md` - 部署成功报告
- `PRODUCTION_REDEPLOY.md` - 生产环境重新部署报告

**部署说明**:
- `DEPLOYMENT.md` - 原始部署文档
- `README_DEPLOY.md` - 部署 README

**使用顺序**:
1. 首次部署：查看 `PRODUCTION_DEPLOYMENT.md`
2. 快速部署：查看 `QUICK_DEPLOY.md`
3. 部署验证：查看 `DEPLOY_READY.md`

---

### ⚡ 并发问题文档 (concurrency/)

**问题分析**:
- `CONCURRENCY_ANALYSIS.md` - 英文详细技术分析
- `并发问题分析-中文.md` - 中文详细分析报告

**修复记录**:
- `FIX_APPLIED.md` - 并发修复详情
- `README_CONCURRENCY.md` - 并发问题快速参考

**测试验证**:
- `TEST_RESULTS.md` - 测试结果（英文）
- `测试结果总结.md` - 测试结果总结（中文）

**阅读顺序**:
1. 了解问题：`并发问题分析-中文.md`
2. 查看修复：`FIX_APPLIED.md`
3. 验证结果：`测试结果总结.md`

---

### 🔧 问题修复文档 (fixes/)

**错误处理修复**:
- `ERROR_HANDLING_FIX.md` - 错误处理优化说明
- `FINAL_ERROR_FIX.md` - 最终错误处理修复

**限流修复**:
- `RATE_LIMIT_FIX.md` - API 限流问题修复

**其他修复**:
- `PROBLEM_ANALYSIS.md` - 问题深入分析
- `BANK_JSON_FIX.md` - bank.json 格式修复

**使用场景**:
- 遇到错误处理问题 → `ERROR_HANDLING_FIX.md`
- 遇到限流问题 → `RATE_LIMIT_FIX.md`
- 遇到 JSON 格式问题 → `BANK_JSON_FIX.md`

---

### 🔍 诊断文档 (diagnosis/)

**API 诊断**:
- `GEMINI_API_DIAGNOSIS.md` - Gemini API 不可用问题诊断

**完整诊断**:
- `COMPLETE_DIAGNOSIS.md` - 完整问题诊断报告

**调试分析**:
- `DEBUG_ANALYSIS.md` - 调试分析文档

**使用场景**:
- API 不可用 → `GEMINI_API_DIAGNOSIS.md`
- 全面排查问题 → `COMPLETE_DIAGNOSIS.md`
- 调试问题 → `DEBUG_ANALYSIS.md`

---

## 🎯 快速导航

### 我想...

**部署项目**:
→ `deployment/PRODUCTION_DEPLOYMENT.md`

**了解并发问题**:
→ `concurrency/并发问题分析-中文.md`

**查看已修复的问题**:
→ `fixes/FIX_APPLIED.md`

**排查 API 问题**:
→ `diagnosis/GEMINI_API_DIAGNOSIS.md`

**了解架构设计**:
→ `architecture/MULTI_AI_ARCHITECTURE.md`

**快速开始**:
→ 查看根目录 `README.md` 或 `QUICK_START.md`

---

## 📝 文档维护

### 添加新文档

请按照类别将新文档放入相应目录：

- **部署相关** → `docs/deployment/`
- **并发相关** → `docs/concurrency/`
- **修复相关** → `docs/fixes/`
- **诊断相关** → `docs/diagnosis/`

### 更新索引

添加新文档后，请更新 `docs/README.md` 添加索引。

---

## 🔗 相关链接

- 项目主 README: `../README.md`
- 快速开始: `../QUICK_START.md`

---

**最后更新**: 2024-12-10
