/**
 * OpenAI (GPT) AI Provider
 */

import OpenAI from 'openai';
import { BaseAIProvider, GenerateOptions, GenerateResult, AIError, AIErrorType } from "../base/AIProvider.js";

export class OpenAIProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    this.client = config.apiKey ? new OpenAI({
      apiKey: config.apiKey,
    }) : null;
  }

  /**
   * 检查是否可用
   */
  isAvailable() {
    return super.isAvailable() && this.client !== null;
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
        'OpenAI provider is not available. Please check API key configuration.',
        AIErrorType.AUTH_ERROR,
        this.name,
        401,
        false
      );
    }

    const opts = new GenerateOptions(options);
    const model = opts.model || this.config.model || 'gpt-4o-mini';

    try {
      // 构建 messages 数组，支持 system prompt（最佳实践）
      const messages = [];
      
      // 添加 system prompt（如果提供）
      if (opts.systemPrompt) {
        messages.push({
          role: 'system',
          content: opts.systemPrompt,
        });
      }
      
      // 构建 user prompt，包含 schema 说明（如果提供）
      let userContent = prompt;
      if (opts.schema && opts.responseFormat === 'json') {
        // 将 schema 的关键字段要求明确添加到 prompt 中
        const schemaFields = Object.keys(opts.schema.properties || {});
        const requiredFields = opts.schema.required || [];
        userContent = `${prompt}

IMPORTANT: Return a valid JSON object with these exact field names:
${requiredFields.map(field => `- "${field}": ${opts.schema.properties[field]?.description || 'required'}`).join('\n')}

The JSON must use these exact field names: ${requiredFields.join(', ')}.
Do NOT use alternative names like "sentence" or "mainClauseStructure".`;
      }
      
      messages.push({
        role: 'user',
        content: userContent,
      });

      const requestOptions = {
        model: model,
        messages: messages,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
      };

      // 如果提供了schema且需要JSON格式，添加response_format
      if (opts.schema && opts.responseFormat === 'json') {
        requestOptions.response_format = {
          type: 'json_object',
        };
      }

      const response = await this.client.chat.completions.create(requestOptions);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AIError(
          'Empty response from OpenAI API',
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
        {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        },
        {
          finishReason: response.choices[0]?.finish_reason,
        }
      );

    } catch (error) {
      this.recordError(error);
      const errorType = this.parseErrorType(error);
      const status = error.status || error.response?.status || 500;
      const retryable = this.isRetryable(error);

      throw new AIError(
        error.message || 'OpenAI API request failed',
        errorType,
        this.name,
        status,
        retryable
      );
    }
  }
}
