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

      // 尝试调用，支持重试
      for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[Fallback] Retrying ${provider.name} (attempt ${attempt + 1}/${this.config.retryCount + 1})`);
            await this.delay(this.config.retryDelay * attempt);
          }

          const result = await provider.generate(prompt, options);
          console.log(`[Fallback] Success with ${provider.name}`);
          return result;

        } catch (error) {
          const isLastAttempt = attempt === this.config.retryCount;
          const shouldContinue = this.shouldContinue(error, isLastAttempt);

          console.log(`[Fallback] ${provider.name} failed (attempt ${attempt + 1}): ${error.message}`);

          if (!shouldContinue) {
            // 致命错误，停止尝试所有提供商
            console.error(`[Fallback] Fatal error from ${provider.name}, stopping fallback`);
            throw error;
          }

          if (isLastAttempt) {
            // 最后一次尝试也失败，记录错误并尝试下一个提供商
            errors.push({
              provider: provider.name,
              error: error,
              attempts: attempt + 1,
            });
            break; // 跳出重试循环，尝试下一个提供商
          }
          // 否则继续重试
        }
      }
    }

    // 所有提供商都失败
    throw new AllProvidersFailedError(triedProviders, errors);
  }

  /**
   * 判断是否应该继续尝试下一个提供商
   * @param {Error} error - 错误对象
   * @param {boolean} isLastAttempt - 是否是最后一次尝试
   * @returns {boolean}
   */
  shouldContinue(error, isLastAttempt) {
    // 如果是AIError，使用其retryable属性
    if (error instanceof AIError) {
      // 认证错误不应该继续
      if (error.type === AIErrorType.AUTH_ERROR) {
        return false;
      }
      // 其他错误可以继续（配额耗尽、限流、网络错误等）
      return true;
    }

    // 对于非AIError，根据状态码判断
    if (error.status === 401 || error.status === 403) {
      return false; // 认证错误，不继续
    }

    // 配额耗尽、限流、网络错误等可以继续
    if (error.status === 429 || error.status === 503) {
      return true;
    }

    // 网络错误可以继续
    if (error.message?.includes('network') || 
        error.message?.includes('timeout') ||
        error.message?.includes('fetch') ||
        error.message?.includes('ECONNREFUSED')) {
      return true;
    }

    // 其他错误默认可以继续（在最后一次尝试时）
    return isLastAttempt;
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
