/**
 * AI应用层：句子分析服务
 * 负责业务逻辑编排，整合Prompt控制层和AI访问层
 */

import { DifficultyLevel, SentenceStructure, GrammarRole } from "../../types.js";
import { PromptBuilder } from "../prompts/PromptBuilder.js";
import { AIProviderManager } from "../ai/manager/AIProviderManager.js";
import { validatePrepositionalPhrases, postProcessRoles } from "../validationService.js";
import { SAMPLE_DATA_FALLBACK } from "../../constants.js";

export class SentenceAnalysisService {
  constructor(aiProviderManager) {
    this.promptBuilder = new PromptBuilder();
    this.aiProviderManager = aiProviderManager;
  }

  /**
   * 分析自定义句子
   * @param {string} sentence - 要分析的句子文本
   * @param {DifficultyLevel} level - 难度级别
   * @param {object} options - 服务选项
   * @returns {Promise<SentenceAnalysisData>}
   */
  async analyzeCustomSentence(sentence, level, options = {}) {
    const {
      preferredProvider = null,
      enableFallback = true,
      fallbackProviders = null,
    } = options;

    if (!sentence || typeof sentence !== 'string' || sentence.trim().length === 0) {
      throw new Error('Sentence is required and must be a non-empty string');
    }

    // 构建分析Prompt
    const prompt = this.promptBuilder.buildAnalysisPrompt(sentence.trim(), level);
    const schema = this.promptBuilder.getSchema();
    const systemPrompt = this.promptBuilder.getSystemPrompt();

    // 准备生成选项
    const generateOptions = {
      responseFormat: 'json',
      schema: schema,
      systemPrompt: systemPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    };

    try {
      // 调用AI分析
      const result = await this.aiProviderManager.generateWithFallback(
        prompt,
        generateOptions,
        {
          preferredProvider,
          enableFallback,
          fallbackProviders,
        }
      );

      // 解析JSON响应
      const data = this.parseAIResponse(result.content);

      // 确保 originalSentence 与输入的句子一致
      data.originalSentence = sentence.trim();

      // 后处理和验证
      const processedData = this.postProcessData(data, level);

      return processedData;

    } catch (error) {
      console.error('[SentenceAnalysisService] Custom sentence analysis failed:', error);
      
      // 如果所有提供商都失败，抛出错误（不返回fallback，因为这是用户提供的句子）
      if (error.name === 'AllProvidersFailedError') {
        throw new Error('所有AI服务暂时不可用，请稍后再试');
      }

      throw error;
    }
  }

  /**
   * OCR 文本清理（AI规范化）
   * @param {string} sentence - OCR识别的原始文本
   * @param {object} options - 服务选项
   * @returns {Promise<string>} 规范化后的句子
   */
  async normalizeOCRSentence(sentence, options = {}) {
    const {
      preferredProvider = null,
      enableFallback = true,
      fallbackProviders = null,
    } = options;

    if (!sentence || typeof sentence !== 'string' || sentence.trim().length === 0) {
      throw new Error('Sentence is required and must be a non-empty string');
    }

    const prompt = this.promptBuilder.buildOCRNormalizationPrompt(sentence.trim());
    const systemPrompt = this.promptBuilder.getSystemPrompt();

    const generateOptions = {
      responseFormat: 'text',
      systemPrompt,
      temperature: 0.3,
      maxTokens: 200,
    };

    try {
      const result = await this.aiProviderManager.generateWithFallback(
        prompt,
        generateOptions,
        {
          preferredProvider,
          enableFallback,
          fallbackProviders,
        }
      );

      const cleaned = this.parseNormalizedSentence(result.content);
      if (!cleaned) {
        throw new Error('Failed to normalize OCR text');
      }
      return cleaned;
    } catch (error) {
      console.error('[SentenceAnalysisService] OCR normalization failed:', error);
      throw error;
    }
  }

  /**
   * 解析AI返回的规范化句子
   * @param {string} content
   * @returns {string} cleaned sentence
   */
  parseNormalizedSentence(content) {
    if (!content || typeof content !== 'string') return '';
    let text = content.trim();
    // 移除markdown代码块
    text = text.replace(/^```(?:\w+)?\s*/i, '').replace(/```$/i, '').trim();
    // 将多行合并为一行
    text = text.replace(/\s+/g, ' ').trim();
    // 确保以句号或合适标点结束
    if (text && !/[.?!]$/.test(text)) {
      text = `${text}.`;
    }
    return text;
  }

  /**
   * 生成句子分析
   * @param {DifficultyLevel} level - 难度级别
   * @param {object} options - 服务选项
   * @returns {Promise<SentenceAnalysisData>}
   */
  async generateSentenceAnalysis(level, options = {}) {
    const {
      preferredProvider = null,
      enableFallback = true,
      fallbackProviders = null,
      previousSentence = null,
    } = options;

    // 构建Prompt
    const prompt = this.promptBuilder.buildPrompt(level, { previousSentence });
    const schema = this.promptBuilder.getSchema();
    const systemPrompt = this.promptBuilder.getSystemPrompt();

    // 准备生成选项（包含 system prompt - 最佳实践）
    const generateOptions = {
      responseFormat: 'json',
      schema: schema,
      systemPrompt: systemPrompt, // 添加 system prompt
      temperature: 0.7,
      maxTokens: 2000,
    };

    try {
      // 调用AI生成
      const result = await this.aiProviderManager.generateWithFallback(
        prompt,
        generateOptions,
        {
          preferredProvider,
          enableFallback,
          fallbackProviders,
        }
      );

      // 解析JSON响应
      const data = this.parseAIResponse(result.content);

      // 后处理和验证
      const processedData = this.postProcessData(data, level);

      return processedData;

    } catch (error) {
      console.error('[SentenceAnalysisService] Generation failed:', error);
      
      // 如果所有提供商都失败，返回fallback数据
      if (error.name === 'AllProvidersFailedError') {
        console.warn('[SentenceAnalysisService] All providers failed, using fallback data');
        return { ...SAMPLE_DATA_FALLBACK, level };
      }

      throw error;
    }
  }

  /**
   * 解析AI响应
   * @param {string} content - AI返回的内容
   * @returns {object}
   */
  parseAIResponse(content) {
    try {
      // 清理内容：移除 markdown 代码块标记
      let cleanedContent = content.trim();
      
      // 移除开头的 markdown 代码块标记（如 ```json, ```, ```json\n 等）
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*\n?/i, '');
      
      // 移除结尾的 markdown 代码块标记
      cleanedContent = cleanedContent.replace(/\n?```\s*$/i, '');
      
      // 再次清理首尾空白
      cleanedContent = cleanedContent.trim();
      
      // 尝试解析JSON
      let data = JSON.parse(cleanedContent);

      // 字段名映射：处理不同AI提供商可能返回的不同字段名
      // DeepSeek/Qwen 可能返回 "sentence" 而不是 "originalSentence"
      if (data.sentence && !data.originalSentence) {
        data.originalSentence = data.sentence;
        delete data.sentence;
      }
      
      // DeepSeek 可能返回 "mainClauseStructure" 而不是 "structureType"
      if (data.mainClauseStructure && !data.structureType) {
        data.structureType = data.mainClauseStructure;
        delete data.mainClauseStructure;
      }
      
      // 如果仍然缺少 originalSentence，尝试从其他字段推断或使用默认值
      if (!data.originalSentence && data.words && Array.isArray(data.words)) {
        // 尝试从 words 数组重建句子（作为后备方案）
        data.originalSentence = data.words.join(' ').replace(/\s+([.,!?;:])/g, '$1');
        console.warn('[SentenceAnalysisService] Reconstructed originalSentence from words array');
      }

      // 验证必需字段
      if (!data.originalSentence || !data.words || !data.wordRoles) {
        console.error('[SentenceAnalysisService] Missing required fields. Available fields:', Object.keys(data));
        throw new Error('Invalid response format: missing required fields');
      }

      return data;
    } catch (error) {
      console.error('[SentenceAnalysisService] Failed to parse AI response:', error);
      console.error('[SentenceAnalysisService] Raw content (first 200 chars):', content.substring(0, 200));
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  /**
   * 后处理数据
   * @param {object} data - 原始数据
   * @param {DifficultyLevel} level - 难度级别
   * @returns {SentenceAnalysisData}
   */
  postProcessData(data, level) {
    // 规范化wordRoles：从数组转换为Record<number, GrammarRole>
    const normalizedRoles = {};
    if (Array.isArray(data.wordRoles)) {
      data.wordRoles.forEach((role, index) => {
        normalizedRoles[index] = role;
      });
    }

    // 验证结构类型
    const validStructures = Object.values(SentenceStructure);
    let structure = data.structureType;
    if (!validStructures.includes(structure)) {
      console.warn(`[SentenceAnalysisService] Invalid structure type: ${structure}, using default SVO`);
      structure = SentenceStructure.SVO;
    }

    let result = {
      originalSentence: data.originalSentence,
      words: data.words,
      wordRoles: normalizedRoles,
      structureType: structure,
      skeletonIndices: data.skeletonIndices || [],
      explanation: data.explanation || '',
      options: data.options || [],
      level: level,
    };

    // 后处理修复常见错误
    const beforePostProcess = JSON.parse(JSON.stringify(result));
    result = postProcessRoles(result);

    // 记录后处理变更
    const rolesChanged = JSON.stringify(beforePostProcess.wordRoles) !== JSON.stringify(result.wordRoles);
    const skeletonChanged = JSON.stringify(beforePostProcess.skeletonIndices) !== JSON.stringify(result.skeletonIndices);
    const structureChanged = beforePostProcess.structureType !== result.structureType;

    if (rolesChanged || skeletonChanged || structureChanged) {
      console.log('[SentenceAnalysisService] Post-processing changes detected:');
      if (rolesChanged) {
        console.log('  - Word roles changed');
      }
      if (skeletonChanged) {
        console.log('  - Skeleton indices changed');
      }
      if (structureChanged) {
        console.log('  - Structure type changed');
      }
    }

    // 验证介词短语
    const validation = validatePrepositionalPhrases(result);
    if (!validation.isValid) {
      console.warn('[SentenceAnalysisService] Validation issues found:');
      validation.issues.forEach(issue => {
        console.warn(`  - ${issue.message}`);
      });
    }

    return result;
  }
}
