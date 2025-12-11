/**
 * OCR服务
 * 使用Tesseract.js进行浏览器端OCR文字识别
 */

import { createWorker } from 'tesseract.js';

export interface OCRProgress {
  status: string;
  progress: number;
}

/**
 * 识别图片中的英文文本
 * @param imageFile - 图片文件
 * @param onProgress - 进度回调函数（可选）
 * @returns 识别到的文本
 */
export async function recognizeText(
  imageFile: File,
  onProgress?: (progress: OCRProgress) => void
): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress) {
        onProgress({
          status: m.status || 'processing',
          progress: m.progress || 0,
        });
      }
    },
  });

  try {
    const { data: { text } } = await worker.recognize(imageFile);
    
    // 清理识别结果
    const cleanedText = cleanText(text);
    
    return cleanedText;
  } finally {
    await worker.terminate();
  }
}

/**
 * 清理识别文本
 * - 多个连续换行符替换为单个空格
 * - 多个连续空格替换为单个空格
 * - 去除首尾空白字符
 * @param text - 原始识别文本
 * @returns 清理后的文本
 */
function cleanText(text: string): string {
  if (!text) return '';
  
  // 多个连续换行符替换为单个空格
  let cleaned = text.replace(/\n+/g, ' ');
  
  // 多个连续空格替换为单个空格
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // 去除首尾空白字符
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * 验证识别文本的有效性
 * @param text - 识别文本
 * @returns 是否有效
 */
export function validateRecognizedText(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }
  
  // 检查是否包含英文字符
  const hasEnglishChar = /[a-zA-Z]/.test(text);
  
  return hasEnglishChar;
}
