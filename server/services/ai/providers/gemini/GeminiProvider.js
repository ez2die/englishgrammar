/**
 * Gemini AI Provider
 * 实现AIProvider接口，使用Google Gemini API
 */

import { GoogleGenAI, Type } from "@google/genai";
import { BaseAIProvider, GenerateOptions, GenerateResult, AIError, AIErrorType } from "../base/AIProvider.js";

export class GeminiProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    this.ai = config.apiKey ? new GoogleGenAI({ apiKey: config.apiKey }) : null;
  }

  /**
   * 检查是否可用
   */
  isAvailable() {
    return super.isAvailable() && this.ai !== null;
  }

  /**
   * 生成内容
   * @param {string} prompt - 提示词
   * @param {GenerateOptions} options - 生成选项
   * @returns {Promise<GenerateResult>}
   */
  async generate(prompt, options = {}) {
    if (!this.isAvailable()) {
      throw new AIError(
        'Gemini provider is not available. Please check API key configuration.',
        AIErrorType.AUTH_ERROR,
        this.name,
        401,
        false
      );
    }

    const opts = new GenerateOptions(options);
    const model = opts.model || this.config.model || 'gemini-2.5-flash-lite';

    try {
      const config = {
        responseMimeType: opts.responseFormat === 'json' ? 'application/json' : 'text/plain',
      };

      // 如果提供了schema，添加结构化输出配置
      if (opts.schema && opts.responseFormat === 'json') {
        config.responseSchema = this.convertSchemaToGeminiFormat(opts.schema);
      }

      const response = await this.ai.models.generateContent({
        model: model,
        contents: prompt,
        config: config,
      });

      const content = response.text;
      if (!content) {
        throw new AIError(
          'Empty response from Gemini API',
          AIErrorType.INVALID_RESPONSE,
          this.name,
          200,
          false
        );
      }

      this.clearError();

      return new GenerateResult(
        content,
        model,
        this.name,
        {}, // usage - Gemini doesn't provide detailed usage in this SDK
        {}
      );

    } catch (error) {
      this.recordError(error);
      const errorType = this.parseErrorType(error);
      const status = error.status || error.response?.status || 500;
      const retryable = this.isRetryable(error);

      throw new AIError(
        error.message || 'Gemini API request failed',
        errorType,
        this.name,
        status,
        retryable
      );
    }
  }

  /**
   * 将JSON Schema转换为Gemini格式
   * @param {object} schema - JSON Schema
   * @returns {object} Gemini格式的schema
   */
  convertSchemaToGeminiFormat(schema) {
    // Gemini使用Type枚举和简化的schema格式
    const convertProperty = (prop) => {
      if (prop.type === 'string') {
        return { type: Type.STRING };
      } else if (prop.type === 'integer' || prop.type === 'number') {
        return { type: Type.INTEGER };
      } else if (prop.type === 'boolean') {
        return { type: Type.BOOLEAN };
      } else if (prop.type === 'array') {
        return {
          type: Type.ARRAY,
          items: prop.items ? convertProperty(prop.items) : { type: Type.STRING }
        };
      } else if (prop.type === 'object') {
        const properties = {};
        if (prop.properties) {
          Object.entries(prop.properties).forEach(([key, value]) => {
            properties[key] = convertProperty(value);
          });
        }
        return {
          type: Type.OBJECT,
          properties: properties
        };
      }
      return { type: Type.STRING };
    };

    return {
      type: Type.OBJECT,
      properties: Object.entries(schema.properties || {}).reduce((acc, [key, value]) => {
        acc[key] = convertProperty(value);
        return acc;
      }, {}),
    };
  }

  /**
   * 获取提供商状态
   */
  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      model: this.config.model,
      fallbackModel: this.config.fallbackModel,
    };
  }
}
