/**
 * 降级策略实现
 * 负责在AI提供商失败时自动切换到备用提供商
 */

import { AIError, AIErrorType } from "../providers/base/AIProvider.js";

export class AllProvidersFailedError extends Error {
  constructor(providers, errors) {
    super(`All AI providers failed. Tried: ${providers.join(', ')}`);
    this.name = 'AllProvidersFailedError';
    this.providers = providers;
    this.errors = errors;
  }
}

export class FallbackStrategy {
  constructor(config = {}) {
    this.config = {
      retryCount: config.retryCount ?? 2,
      retryDelay: config.retryDelay ?? 1000,
      ...config,
    };
  }

  /**
   * 执行带降级的AI调用
   * @param {Array<BaseAIProvider>} providers - AI提供商列表（已按优先级排序）
   * @param {string} prompt - 提示词
   * @param {GenerateOptions} options - 生成选项
   * @returns {Promise<GenerateResult>}
   */
  async executeWithFallback(providers, prompt, options) {
    const errors = [];
    const triedProviders = [];

    for (const provider of providers) {
      if (!provider.isAvailable()) {
        console.log(`[Fallback] Skipping ${provider.name} - not available`);
        continue;
      }

      triedProviders.push(provider.name);

      // 尝试调用；仅对「可重试」错误在本提供商内重试，否则立即换下一个提供商
      let lastError;
      for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[Fallback] Retrying ${provider.name} (attempt ${attempt + 1}/${this.config.retryCount + 1})`);
            await this.delay(this.config.retryDelay * attempt);
          }

          const startTime = Date.now();
          const result = await provider.generate(prompt, options);
          const duration = Date.now() - startTime;
          console.log(`[Fallback] Success with ${provider.name} (${duration}ms)`);
          return result;

        } catch (error) {
          lastError = error;
          console.log(`[Fallback] ${provider.name} failed (attempt ${attempt + 1}): ${error.message}`);

          // 不可重试的错误（认证、配额、无效响应）→ 不在本提供商重试，直接换下一个
          if (!this.isRetryable(error)) {
            break;
          }
          // 可重试但已到最后一次 → 换下一个提供商
          if (attempt === this.config.retryCount) {
            break;
          }
          // 否则继续在本提供商重试
        }
      }

      errors.push({ provider: provider.name, error: lastError });
    }

    // 所有提供商都失败
    throw new AllProvidersFailedError(triedProviders, errors);
  }

  /**
   * 判断某个错误是否值得在「同一个提供商」上重试。
   * 优先信任 provider 已计算好的 error.retryable（AIError），
   * 否则退回到基于状态码/消息的启发式判断。
   * 注意：无论是否可重试，失败后都会继续尝试「下一个」提供商。
   * @param {Error} error
   * @returns {boolean}
   */
  isRetryable(error) {
    if (error instanceof AIError) {
      return error.retryable === true;
    }
    if (error.status === 401 || error.status === 403) return false;
    if (error.status === 429) return true;
    if (error.status >= 500 && error.status <= 599) return true;
    if (
      error.message?.includes('network') ||
      error.message?.includes('timeout') ||
      error.message?.includes('fetch') ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT'
    ) {
      return true;
    }
    return false;
  }

  /**
   * 延迟函数
   * @param {number} ms - 毫秒数
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
