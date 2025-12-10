/**
 * Qwen (阿里通义千问) AI Provider
 * 使用阿里云DashScope API
 */

import { BaseAIProvider, GenerateOptions, GenerateResult, AIError, AIErrorType } from "../base/AIProvider.js";

export class QwenProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey;
    this.apiBase = config.apiBase || 'https://dashscope.aliyuncs.com/api/v1';
  }

  /**
   * 检查是否可用
   */
  isAvailable() {
    return super.isAvailable() && !!this.apiKey;
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
        'Qwen provider is not available. Please check API key configuration.',
        AIErrorType.AUTH_ERROR,
        this.name,
        401,
        false
      );
    }

    const opts = new GenerateOptions(options);
    const model = opts.model || this.config.model || 'qwen-turbo';

    try {
      // Qwen DashScope API endpoint
      const url = `${this.apiBase}/services/aigc/text-generation/generation`;
      
      const requestBody = {
        model: model,
        input: {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        parameters: {
          temperature: opts.temperature,
          max_tokens: opts.maxTokens,
        },
      };

      // 如果提供了schema且需要JSON格式，添加result_format
      // Qwen的JSON Schema格式需要特殊处理
      if (opts.schema && opts.responseFormat === 'json') {
        // Qwen使用result_format参数，支持json_object和json_schema两种模式
        requestBody.parameters.result_format = 'json_object';
        // 在prompt中明确要求JSON格式（Qwen的json_object模式会自动处理）
        requestBody.input.messages[0].content = `${prompt}\n\nPlease respond in valid JSON format matching the provided schema.`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Qwen API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Qwen API响应格式：data.output.choices[0].message.content
      const content = data.output?.choices?.[0]?.message?.content || data.output?.text;
      if (!content) {
        throw new AIError(
          'Empty response from Qwen API',
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
          promptTokens: data.usage?.input_tokens,
          completionTokens: data.usage?.output_tokens,
          totalTokens: data.usage?.total_tokens,
        },
        {
          requestId: data.request_id,
        }
      );

    } catch (error) {
      this.recordError(error);
      const errorType = this.parseErrorType(error);
      const status = error.status || (error.response ? error.response.status : 500);
      const retryable = this.isRetryable(error);

      throw new AIError(
        error.message || 'Qwen API request failed',
        errorType,
        this.name,
        status,
        retryable
      );
    }
  }
}
