/**
 * AI配置管理
 */

export const AI_CONFIG = {
  // 默认提供商
  defaultProvider: 'gemini',
  
  // 提供商配置
  providers: {
    gemini: {
      enabled: true,
      priority: 1,
      apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '',
      model: 'gemini-2.5-flash-lite',
      fallbackModel: 'gemini-1.5-flash',
      options: {
        temperature: 0.7,
        maxTokens: 2000,
      },
      rateLimit: {
        requestsPerMinute: 15,
        requestsPerDay: 20,
      },
    },
    deepseek: {
      enabled: true,
      priority: 2,
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: 'deepseek-chat',
      fallbackModel: 'deepseek-reasoner',
      options: {
        temperature: 0.7,
        maxTokens: 2000,
      },
      apiBase: 'https://api.deepseek.com',
    },
    qwen: {
      enabled: true,
      priority: 2,
      apiKey: process.env.QWEN_API_KEY || '',
      model: 'qwen-turbo',
      fallbackModel: 'qwen-plus',
      options: {
        temperature: 0.7,
        maxTokens: 2000,
      },
      apiBase: 'https://dashscope.aliyuncs.com/api/v1',
    },
    openai: {
      enabled: true,
      priority: 3,
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4o-mini',
      fallbackModel: 'gpt-3.5-turbo',
      options: {
        temperature: 0.7,
        maxTokens: 2000,
      },
    },
    claude: {
      enabled: false,
      priority: 4,
      apiKey: process.env.CLAUDE_API_KEY || '',
      model: 'claude-3-haiku-20240307',
      options: {
        temperature: 0.7,
        maxTokens: 2000,
      },
    },
  },
  
  // 降级配置
  fallback: {
    enabled: true,
    strategy: 'priority', // 'priority' | 'round-robin' | 'random'
    retryCount: 2,
    retryDelay: 1000, // ms
  },
};

/**
 * 获取提供商配置
 * @param {string} providerName
 * @returns {object|null}
 */
export function getProviderConfig(providerName) {
  return AI_CONFIG.providers[providerName] || null;
}

/**
 * 获取所有启用的提供商配置（按优先级排序）
 * @returns {Array<{name: string, config: object}>}
 */
export function getEnabledProviders() {
  return Object.entries(AI_CONFIG.providers)
    .filter(([name, config]) => config.enabled && config.apiKey)
    .map(([name, config]) => ({ name, config }))
    .sort((a, b) => a.config.priority - b.config.priority);
}

/**
 * 获取默认提供商配置
 * @returns {object|null}
 */
export function getDefaultProviderConfig() {
  const defaultName = AI_CONFIG.defaultProvider;
  const config = AI_CONFIG.providers[defaultName];
  if (config && config.enabled && config.apiKey) {
    return { name: defaultName, config };
  }
  // 如果没有默认提供商，返回第一个可用的
  const enabled = getEnabledProviders();
  return enabled.length > 0 ? enabled[0] : null;
}
