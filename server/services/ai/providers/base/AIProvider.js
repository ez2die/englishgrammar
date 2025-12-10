/**
 * AI提供商基础接口
 * 所有AI提供商必须实现此接口
 */

export class AIError extends Error {
  constructor(message, type, provider, status, retryable = true) {
    super(message);
    this.name = 'AIError';
    this.type = type;
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
  }
}

export const AIErrorType = {
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMIT: 'RATE_LIMIT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  AUTH_ERROR: 'AUTH_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * 生成选项
 */
export class GenerateOptions {
  constructor(options = {}) {
    this.model = options.model;
    this.temperature = options.temperature ?? 0.7;
    this.maxTokens = options.maxTokens ?? 2000;
    this.responseFormat = options.responseFormat ?? 'json';
    this.schema = options.schema; // JSON Schema for structured output
    this.timeout = options.timeout ?? 30000; // 30 seconds default
  }
}

/**
 * 生成结果
 */
export class GenerateResult {
  constructor(content, model, provider, usage = {}, metadata = {}) {
    this.content = content;
    this.model = model;
    this.provider = provider;
    this.usage = usage;
    this.metadata = metadata;
  }
}

/**
 * 提供商状态
 */
export class ProviderStatus {
  constructor(available, name, quotaRemaining = null, rateLimitRemaining = null, lastError = null, lastErrorTime = null) {
    this.available = available;
    this.name = name;
    this.quotaRemaining = quotaRemaining;
    this.rateLimitRemaining = rateLimitRemaining;
    this.lastError = lastError;
    this.lastErrorTime = lastErrorTime;
  }
}

/**
 * AI提供商基础类
 * 所有AI提供商应该继承此类并实现抽象方法
 */
export class BaseAIProvider {
  constructor(config) {
    if (!config || !config.name) {
      throw new Error('Provider config must include name');
    }
    this.name = config.name;
    this.config = config;
    this.lastError = null;
    this.lastErrorTime = null;
  }

  /**
   * 检查提供商是否可用
   * @returns {boolean}
   */
  isAvailable() {
    return this.config.enabled && !!this.config.apiKey;
  }

  /**
   * 生成内容（抽象方法，子类必须实现）
   * @param {string} prompt - 提示词
   * @param {GenerateOptions} options - 生成选项
   * @returns {Promise<GenerateResult>}
   */
  async generate(prompt, options = {}) {
    throw new Error('generate() must be implemented by subclass');
  }

  /**
   * 获取提供商状态
   * @returns {ProviderStatus}
   */
  getStatus() {
    return new ProviderStatus(
      this.isAvailable(),
      this.name,
      null, // quotaRemaining - 子类可以覆盖
      null, // rateLimitRemaining - 子类可以覆盖
      this.lastError,
      this.lastErrorTime
    );
  }

  /**
   * 记录错误
   * @param {Error} error
   */
  recordError(error) {
    this.lastError = error.message;
    this.lastErrorTime = new Date();
  }

  /**
   * 清除错误记录
   */
  clearError() {
    this.lastError = null;
    this.lastErrorTime = null;
  }

  /**
   * 解析错误类型
   * @param {Error} error
   * @returns {string}
   */
  parseErrorType(error) {
    if (error.status === 429) {
      return AIErrorType.RATE_LIMIT;
    }
    if (error.status === 503 || error.message?.includes('quota')) {
      return AIErrorType.QUOTA_EXCEEDED;
    }
    if (error.status === 401 || error.status === 403) {
      return AIErrorType.AUTH_ERROR;
    }
    if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
      return AIErrorType.TIMEOUT;
    }
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return AIErrorType.NETWORK_ERROR;
    }
    return AIErrorType.UNKNOWN_ERROR;
  }

  /**
   * 判断错误是否可重试
   * @param {Error} error
   * @returns {boolean}
   */
  isRetryable(error) {
    const errorType = this.parseErrorType(error);
    return [
      AIErrorType.RATE_LIMIT,
      AIErrorType.NETWORK_ERROR,
      AIErrorType.TIMEOUT,
      AIErrorType.UNKNOWN_ERROR,
    ].includes(errorType);
  }
}
