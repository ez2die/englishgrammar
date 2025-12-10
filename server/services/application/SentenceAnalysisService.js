/**
 * AI应用层：句子分析服务
 * 负责业务逻辑编排，整合Prompt控制层和AI访问层
 */

import { DifficultyLevel, SentenceStructure, GrammarRole } from "../../types.js";
import { PromptBuilder } from "../prompts/PromptBuilder.js";
import { AIProviderManager } from "../ai/manager/AIProviderManager.js";
import { validatePrepositionalPhrases, postProcessRoles } from "../../validationService.js";
import { SAMPLE_DATA_FALLBACK } from "../../constants.js";

export class SentenceAnalysisService {
  constructor(aiProviderManager) {
    this.promptBuilder = new PromptBuilder();
    this.aiProviderManager = aiProviderManager;
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

    // 准备生成选项
    const generateOptions = {
      responseFormat: 'json',
      schema: schema,
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
      // 尝试解析JSON
      let data = JSON.parse(content);

      // 验证必需字段
      if (!data.originalSentence || !data.words || !data.wordRoles) {
        throw new Error('Invalid response format: missing required fields');
      }

      return data;
    } catch (error) {
      console.error('[SentenceAnalysisService] Failed to parse AI response:', error);
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
