/**
 * AI提供商管理器
 * 负责管理所有AI提供商，提供统一的调用接口和降级策略
 */

import { FallbackStrategy, AllProvidersFailedError } from "./FallbackStrategy.js";
import { getEnabledProviders, getDefaultProviderConfig } from "../config/AIConfig.js";

export class AIProviderManager {
  constructor(config, fallbackConfig) {
    this.providers = new Map();
    this.config = config;
    this.fallbackStrategy = new FallbackStrategy(fallbackConfig);
  }

  /**
   * 注册AI提供商
   * @param {BaseAIProvider} provider - AI提供商实例
   */
  registerProvider(provider) {
    if (!provider || !provider.name) {
      throw new Error('Provider must have a name');
    }
    this.providers.set(provider.name, provider);
    console.log(`[AIProviderManager] Registered provider: ${provider.name}`);
  }

  /**
   * 获取提供商
   * @param {string} name - 提供商名称
   * @returns {BaseAIProvider|null}
   */
  getProvider(name) {
    return this.providers.get(name) || null;
  }

  /**
   * 获取所有可用的提供商（按优先级排序）
   * @param {string} preferredProvider - 首选的提供商名称（可选）
   * @returns {Array<BaseAIProvider>}
   */
  getAvailableProviders(preferredProvider = null) {
    let providers = Array.from(this.providers.values())
      .filter(p => p.isAvailable());

    // 如果指定了首选提供商，将其放在最前面
    if (preferredProvider) {
      const preferred = providers.find(p => p.name === preferredProvider);
      if (preferred) {
        providers = [
          preferred,
          ...providers.filter(p => p.name !== preferredProvider)
        ];
      }
    } else {
      // 否则按配置的优先级排序
      providers.sort((a, b) => {
        const priorityA = this.config.providers[a.name]?.priority || 999;
        const priorityB = this.config.providers[b.name]?.priority || 999;
        return priorityA - priorityB;
      });
    }

    return providers;
  }

  /**
   * 使用降级策略生成内容
   * @param {string} prompt - 提示词
   * @param {object} options - 生成选项
   * @param {object} serviceOptions - 服务选项（preferredProvider, enableFallback等）
   * @returns {Promise<GenerateResult>}
   */
  async generateWithFallback(prompt, options = {}, serviceOptions = {}) {
    const {
      preferredProvider = null,
      enableFallback = true,
      fallbackProviders = null,
    } = serviceOptions;

    let providers = this.getAvailableProviders(preferredProvider);

    // 如果指定了降级提供商列表，只使用这些提供商
    if (fallbackProviders && fallbackProviders.length > 0) {
      providers = providers.filter(p => 
        p.name === preferredProvider || fallbackProviders.includes(p.name)
      );
    }

    if (providers.length === 0) {
      throw new Error('No available AI providers');
    }

    // 如果禁用降级，只使用第一个提供商
    if (!enableFallback) {
      const provider = providers[0];
      return provider.generate(prompt, options);
    }

    // 使用降级策略
    try {
      return await this.fallbackStrategy.executeWithFallback(
        providers,
        prompt,
        options
      );
    } catch (error) {
      if (error instanceof AllProvidersFailedError) {
        console.error('[AIProviderManager] All providers failed:', error.errors);
        // 可以在这里添加额外的错误处理逻辑
      }
      throw error;
    }
  }

  /**
   * 获取所有提供商的状态
   * @returns {Array<object>}
   */
  getAllProviderStatus() {
    return Array.from(this.providers.values()).map(provider => ({
      name: provider.name,
      status: provider.getStatus(),
    }));
  }
}
