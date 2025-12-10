<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Kl-jLBajlUrgEpgPSJ7FgaA-ofu-NY0C

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key:
   ```bash
   echo "GEMINI_API_KEY=your_api_key_here" > .env.local
   ```

3. Run the app (both frontend and backend):
   ```bash
   npm run dev:all
   ```
   
   Or run separately:
   - Backend API server (port 3001): `npm run server`
   - Frontend dev server (port 3000): `npm run dev`

## Storage

Questions are now stored in the file system:
- **Location**: `questions/bank.json`
- **Format**: JSON array of question objects
- The backend API server handles all file operations automatically.

## Documentation

📚 **完整文档**: 查看 [`docs/`](./docs/README.md) 目录

**快速导航**:
- 🚀 [部署文档](./docs/deployment/PRODUCTION_DEPLOYMENT.md) - 生产环境部署指南
- ⚡ [并发问题分析](./docs/concurrency/并发问题分析-中文.md) - 并发问题详细分析
- 🔧 [问题修复记录](./docs/fixes/FIX_APPLIED.md) - 已修复的问题
- 🔍 [诊断报告](./docs/diagnosis/GEMINI_API_DIAGNOSIS.md) - API 诊断报告

**快速开始**: 查看 [`QUICK_START.md`](./QUICK_START.md)

---

## 📋 文档目录

所有技术文档已按类别整理到 `docs/` 目录：

```
docs/
├── deployment/    # 部署相关（8个文件）
├── concurrency/   # 并发问题（7个文件）
├── fixes/         # 问题修复（6个文件）
└── diagnosis/     # 诊断报告（4个文件）
```

查看完整文档索引: [`docs/README.md`](./docs/README.md)
