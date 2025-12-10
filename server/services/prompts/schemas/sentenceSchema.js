/**
 * SentenceAnalysisData 的 JSON Schema 定义
 * 用于结构化输出
 */

import { SentenceStructure } from "../../../types.js";

export function getSentenceSchema() {
  return {
    type: 'object',
    properties: {
      originalSentence: { 
        type: 'string',
        description: 'The original English sentence to analyze'
      },
      words: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'Array of words/punctuation tokens from the sentence'
      },
      wordRoles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of grammatical roles corresponding index-by-index to the words array. Each element should be one of: 主语, 谓语, 宾语, 表语, 定语, 状语, 补语, 系动词, 连接词/其他, 定语从句, 状语从句'
      },
      structureType: { 
        type: 'string', 
        enum: Object.values(SentenceStructure),
        description: 'The main sentence structure type'
      },
      skeletonIndices: { 
        type: 'array', 
        items: { type: 'integer' },
        description: 'Indices of words that form the skeleton (main structure)'
      },
      explanation: { 
        type: 'string',
        description: 'Brief explanation in Chinese explaining the skeleton and modifiers/clauses'
      },
      options: { 
        type: 'array', 
        items: { type: 'string' },
        description: 'List of unique role strings for UI buttons, including all used roles plus 2-3 distractors'
      }
    },
    required: ["originalSentence", "words", "wordRoles", "structureType", "skeletonIndices", "explanation", "options"]
  };
}
