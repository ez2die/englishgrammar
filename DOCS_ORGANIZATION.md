# 文档整理说明

## 📅 整理时间
2024-12-10

## 📁 新的文档结构

所有技术文档已按类别整理到 `docs/` 目录下：

```
docs/
├── README.md                    # 文档索引（总目录）
├── deployment/                  # 部署相关文档
│   ├── README.md               # 部署文档索引
│   ├── PRODUCTION_DEPLOYMENT.md
│   ├── QUICK_DEPLOY.md
│   ├── DEPLOY_READY.md
│   ├── DEPLOYMENT_SUCCESS.md
│   ├── PRODUCTION_REDEPLOY.md
│   ├── DEPLOYMENT.md
│   └── README_DEPLOY.md
├── concurrency/                 # 并发问题文档
│   ├── README.md               # 并发文档索引
│   ├── 并发问题分析-中文.md
│   ├── CONCURRENCY_ANALYSIS.md
│   ├── FIX_APPLIED.md
│   ├── README_CONCURRENCY.md
│   ├── TEST_RESULTS.md
│   └── 测试结果总结.md
├── fixes/                       # 问题修复文档
│   ├── README.md               # 修复文档索引
│   ├── ERROR_HANDLING_FIX.md
│   ├── FINAL_ERROR_FIX.md
│   ├── PROBLEM_ANALYSIS.md
│   ├── RATE_LIMIT_FIX.md
│   └── BANK_JSON_FIX.md
└── diagnosis/                   # 诊断报告文档
    ├── README.md               # 诊断文档索引
    ├── GEMINI_API_DIAGNOSIS.md
    ├── COMPLETE_DIAGNOSIS.md
    └── DEBUG_ANALYSIS.md
```

## 📝 根目录保留的文件

根目录只保留最重要的文档：

- `README.md` - 项目主文档
- `QUICK_START.md` - 快速开始指南

## 🔍 查找文档

### 按主题查找

- **部署相关** → `docs/deployment/`
- **并发问题** → `docs/concurrency/`
- **问题修复** → `docs/fixes/`
- **诊断报告** → `docs/diagnosis/`

### 查看所有文档

→ 查看 [`docs/README.md`](./docs/README.md)

## ✅ 整理完成

所有文档已按类别整理，项目根目录更加清晰。
