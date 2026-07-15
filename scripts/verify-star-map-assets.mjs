import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const managementRoot = path.resolve('design-assets/star-map');
const runtimeRoot = path.resolve('public/assets/star-map');
const plan = JSON.parse(fs.readFileSync(path.join(managementRoot, 'production-plan.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(managementRoot, 'manifest.json'), 'utf8'));
const requireComplete = process.argv.includes('--require-complete');
const errors = [];

if (plan.items.length !== plan.requiredDeliverables) {
  errors.push(`计划数量不一致:声明 ${plan.requiredDeliverables},实际 ${plan.items.length}`);
}

const ids = new Set();
const outputs = new Set();
const manifestIds = new Set();
const manifestById = new Map();
const manifestPaths = [];

for (const asset of manifest.assets) {
  if (manifestIds.has(asset.id)) errors.push(`manifest 重复 id:${asset.id}`);
  manifestIds.add(asset.id);
  manifestById.set(asset.id, asset);

  const assetPath = path.join(asset.status === 'production' ? runtimeRoot : managementRoot, asset.path);
  if (!fs.existsSync(assetPath)) {
    errors.push(`manifest 文件不存在:${asset.id}:${asset.path}`);
  } else {
    manifestPaths.push(assetPath);
  }

  if (asset.prompt && !fs.existsSync(path.join(managementRoot, asset.prompt))) {
    errors.push(`提示词文件不存在:${asset.id}:${asset.prompt}`);
  }
  for (const reference of asset.references ?? []) {
    if (!manifestIds.has(reference) && !manifest.assets.some((candidate) => candidate.id === reference)) {
      errors.push(`参考资产不存在:${asset.id}:${reference}`);
    }
  }
}

const outputPaths = plan.items
  .filter((item) => item.status !== 'planned')
  .map((item) => path.join(runtimeRoot, item.output));
const inspectionPaths = [...new Set([...manifestPaths, ...outputPaths])];
const inspection = spawnSync('python3', [
  path.resolve('scripts/inspect-star-map-images.py'),
  ...inspectionPaths,
], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

if (inspection.status !== 0) {
  errors.push(`像素检查器失败:${inspection.stderr.trim() || inspection.stdout.trim()}`);
}

let inspectedByPath = new Map();
if (inspection.status === 0) {
  try {
    inspectedByPath = new Map(JSON.parse(inspection.stdout).map((entry) => [entry.path, entry]));
  } catch (error) {
    errors.push(`像素检查器输出无效:${error.message}`);
  }
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

for (const asset of manifest.assets) {
  const assetPath = path.join(asset.status === 'production' ? runtimeRoot : managementRoot, asset.path);
  if (!fs.existsSync(assetPath)) continue;
  const inspected = inspectedByPath.get(assetPath);
  if (!inspected) {
    errors.push(`manifest 缺少像素检查结果:${asset.id}`);
    continue;
  }
  if (JSON.stringify(inspected.dimensions) !== JSON.stringify(asset.dimensions)) {
    errors.push(`manifest 实际尺寸不一致:${asset.id}:${inspected.dimensions.join('x')}`);
  }
  if (inspected.mode !== asset.mode) {
    errors.push(`manifest 实际颜色模式不一致:${asset.id}:${inspected.mode}/${asset.mode}`);
  }
  if (sha256(assetPath) !== asset.sha256) errors.push(`manifest SHA-256 不一致:${asset.id}`);
}

function resolvesToPrompt(assetId, visited = new Set()) {
  if (!assetId || visited.has(assetId)) return false;
  visited.add(assetId);
  const asset = manifestById.get(assetId);
  if (!asset) return false;
  if (asset.prompt && fs.existsSync(path.join(managementRoot, asset.prompt))) return true;
  return resolvesToPrompt(asset.source, visited) || resolvesToPrompt(asset.batchSource, visited);
}

for (const item of plan.items) {
  if (ids.has(item.id)) errors.push(`重复 id:${item.id}`);
  if (outputs.has(item.output)) errors.push(`重复输出:${item.output}`);
  ids.add(item.id);
  outputs.add(item.output);

  if (item.status !== 'planned') {
    const asset = manifestById.get(item.id);
    if (!asset) {
      errors.push(`非 planned 项缺少 manifest:${item.id}`);
      continue;
    }
    const outputPath = path.join(runtimeRoot, item.output);
    if (!fs.existsSync(outputPath)) {
      errors.push(`文件不存在:${item.output}`);
      continue;
    }
    if (asset.status !== item.status) errors.push(`状态不一致:${item.id}:${item.status}/${asset.status}`);
    if (asset.path !== item.output) errors.push(`输出路径不一致:${item.id}:${item.output}/${asset.path}`);
    if (JSON.stringify(asset.dimensions) !== JSON.stringify(item.dimensions)) {
      errors.push(`尺寸元数据不一致:${item.id}`);
    }
    if (item.alpha && asset.mode !== 'RGBA') errors.push(`透明资产不是 RGBA:${item.id}`);

    const inspected = inspectedByPath.get(outputPath);
    if (!inspected) {
      errors.push(`缺少像素检查结果:${item.id}`);
      continue;
    }
    if (JSON.stringify(inspected.dimensions) !== JSON.stringify(item.dimensions)) {
      errors.push(`实际尺寸不一致:${item.id}:${inspected.dimensions.join('x')}`);
    }
    if (inspected.mode !== asset.mode) {
      errors.push(`实际颜色模式不一致:${item.id}:${inspected.mode}/${asset.mode}`);
    }
    const actualHash = sha256(outputPath);
    if (actualHash !== asset.sha256) errors.push(`SHA-256 不一致:${item.id}`);

    if (item.alpha) {
      if (!inspected.hasAlpha) errors.push(`实际文件缺少 Alpha:${item.id}`);
      if ((inspected.alphaCorners ?? []).some((value) => value !== 0)) {
        errors.push(`透明四角不合格:${item.id}:${inspected.alphaCorners?.join(',')}`);
      }
      if (!inspected.contentBbox) {
        errors.push(`透明资产无可见内容:${item.id}`);
      } else {
        const [left, top, right, bottom] = inspected.contentBbox;
        const longest = Math.max(right - left, bottom - top);
        const occupancy = longest / Math.max(...item.dimensions);
        if (occupancy < 0.6 || occupancy > 0.82) {
          errors.push(`主体安全边距不合格:${item.id}:${occupancy.toFixed(3)}`);
        }
        if (JSON.stringify(asset.contentBbox) !== JSON.stringify(inspected.contentBbox)) {
          errors.push(`Alpha 包围盒元数据不一致:${item.id}`);
        }
      }
    } else if (inspected.hasAlpha) {
      errors.push(`不透明资产意外包含 Alpha:${item.id}`);
    }

    if (!resolvesToPrompt(asset.source)) {
      errors.push(`生产资产缺少可追溯提示词来源:${item.id}`);
    }
  }
}

const counts = plan.items.reduce((result, item) => {
  result[item.status] = (result[item.status] ?? 0) + 1;
  return result;
}, {});

if (requireComplete) {
  const incomplete = plan.items.filter((item) => item.status !== 'production');
  if (incomplete.length) errors.push(`仍有 ${incomplete.length} 项未达到 production`);
}

console.log(JSON.stringify({ total: plan.items.length, counts, errors }, null, 2));
if (errors.length) process.exit(1);
