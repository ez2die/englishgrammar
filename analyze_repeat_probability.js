/**
 * 分析用户遇到重复题目的概率
 */

// 当前决策逻辑参数
const DECISION_LOGIC = {
  // 题库使用概率
  bankSize10Plus: 0.7,  // 题库>=10个时，70%概率使用题库
  bankSize5to9: 0.5,    // 题库5-9个时，50%概率使用题库
  bankSizeBelow5: 0.0,  // 题库<5个时，0%概率使用题库（直接AI生成）
};

/**
 * 计算单次遇到重复题目的概率
 * @param {number} bankSize - 题库大小
 * @param {number} excludeCount - 排除的题目数（previousSentence）
 * @returns {object} 概率分析结果
 */
function calculateRepeatProbability(bankSize, excludeCount = 1) {
  if (bankSize === 0) {
    return {
      bankUsageProb: 0,
      repeatProb: 0,
      newQuestionProb: 1,
      description: '题库为空，100%生成新题'
    };
  }

  // 确定题库使用概率
  let bankUsageProb;
  if (bankSize >= 10) {
    bankUsageProb = DECISION_LOGIC.bankSize10Plus;
  } else if (bankSize >= 5) {
    bankUsageProb = DECISION_LOGIC.bankSize5to9;
  } else {
    bankUsageProb = DECISION_LOGIC.bankSizeBelow5;
  }

  // 计算从题库选择时遇到重复的概率
  // excludeSentence会排除上一题，如果排除后还有题可选，则不会重复
  // 如果排除后没题（excludeCount >= bankSize），会降级到不exclude，此时可能重复
  
  let repeatProb;
  if (excludeCount >= bankSize) {
    // exclude后没题，会降级到不exclude，重复概率 = excludeCount / bankSize
    // 但实际代码中，如果exclude后返回null，会尝试不带exclude，此时重复概率为 excludeCount / bankSize
    repeatProb = excludeCount / bankSize;
  } else if (excludeCount === 0) {
    // 没有exclude，不会重复（第一次练习）
    repeatProb = 0;
  } else {
    // exclude后还有题可选，理论上不会重复（因为exclude了上一题）
    // 但如果降级到不exclude，重复概率 = excludeCount / bankSize
    // 简化：假设exclude后还有题时，重复概率很低（接近0）
    // 但如果exclude后只剩1题，且这题恰好是上一题，则重复概率为0（因为exclude了）
    // 实际上，exclude机制确保不会选择上一题，所以重复概率应该是0
    // 但降级策略可能导致重复
    const availableAfterExclude = bankSize - excludeCount;
    // 如果exclude后还有足够题目，不会重复；如果exclude后题目很少，可能降级导致重复
    repeatProb = availableAfterExclude > 0 ? 0 : excludeCount / bankSize;
  }

  // 实际重复概率 = 题库使用概率 × 从题库选择时遇到重复的概率
  const actualRepeatProb = bankUsageProb * repeatProb;

  // 生成新题的概率
  const newQuestionProb = 1 - bankUsageProb + (bankUsageProb * (1 - repeatProb));

  return {
    bankSize,
    excludeCount,
    bankUsageProb,
    repeatProb,
    actualRepeatProb,
    newQuestionProb,
    description: `题库${bankSize}题，排除${excludeCount}题，实际重复概率${(actualRepeatProb * 100).toFixed(2)}%`
  };
}

/**
 * 计算连续N次练习的重复概率
 * @param {number} bankSize - 初始题库大小
 * @param {number} sessions - 练习次数
 * @param {boolean} aiGeneratesNew - AI是否总是生成新题
 * @returns {object} 概率分析结果
 */
function calculateContinuousRepeatProbability(bankSize, sessions, aiGeneratesNew = true) {
  let currentBankSize = bankSize;
  let seenQuestions = new Set();
  const results = [];
  let totalRepeatCount = 0;

  for (let i = 0; i < sessions; i++) {
    const excludeCount = seenQuestions.size;
    const prob = calculateRepeatProbability(currentBankSize, excludeCount);
    
    // 模拟选择：是否使用题库
    const useBank = Math.random() < prob.bankUsageProb;
    
    if (useBank) {
      // 使用题库
      const isRepeat = excludeCount > 0 && Math.random() < prob.repeatProb;
      if (isRepeat) {
        totalRepeatCount++;
      }
      // 假设题库中的题目都会被看到（简化模型）
      if (currentBankSize > 0) {
        seenQuestions.add(`bank-${i}`);
      }
    } else {
      // AI生成新题
      if (aiGeneratesNew) {
        currentBankSize++; // 新题加入题库
        seenQuestions.add(`new-${i}`);
      }
    }

    results.push({
      session: i + 1,
      bankSize: currentBankSize,
      seenCount: seenQuestions.size,
      ...prob
    });
  }

  return {
    initialBankSize: bankSize,
    sessions,
    totalRepeatCount,
    repeatRate: totalRepeatCount / sessions,
    results
  };
}

/**
 * 理论计算：连续N次遇到至少一次重复的概率
 */
function theoreticalRepeatProbability(bankSize, sessions) {
  if (bankSize === 0) return 0;
  
  // 简化计算：假设题库使用概率为0.7（bankSize>=10的情况）
  const bankUsageProb = bankSize >= 10 ? 0.7 : bankSize >= 5 ? 0.5 : 0;
  
  // 每次练习排除1题（previousSentence）
  // 第i次练习时，已见过的题目数为 min(i-1, bankSize)
  
  let probNoRepeat = 1;
  for (let i = 1; i <= sessions; i++) {
    const seenCount = Math.min(i - 1, bankSize);
    const availableCount = Math.max(0, bankSize - seenCount);
    
    // 本次使用题库的概率
    const useBankProb = bankUsageProb;
    
    // 本次遇到重复的概率（如果使用题库）
    const repeatProbThisSession = availableCount < bankSize 
      ? (bankSize - availableCount) / bankSize 
      : 0;
    
    // 本次不重复的概率
    const noRepeatThisSession = 1 - (useBankProb * repeatProbThisSession);
    probNoRepeat *= noRepeatThisSession;
  }
  
  return {
    probAtLeastOneRepeat: 1 - probNoRepeat,
    probNoRepeat,
    sessions
  };
}

// 主分析函数
function analyze() {
  console.log('=== 重复题目概率分析 ===\n');

  // 1. 单次练习的重复概率（不同题库大小）
  console.log('1. 单次练习遇到重复题目的概率：');
  console.log('─'.repeat(80));
  
  const bankSizes = [0, 5, 10, 20, 50, 100];
  bankSizes.forEach(size => {
    const prob = calculateRepeatProbability(size, 1);
    console.log(`题库${size.toString().padStart(3)}题: ` +
      `题库使用率${(prob.bankUsageProb * 100).toFixed(0)}%, ` +
      `重复概率${(prob.actualRepeatProb * 100).toFixed(2)}%, ` +
      `新题概率${(prob.newQuestionProb * 100).toFixed(2)}%`);
  });

  console.log('\n2. 连续练习的重复概率（理论计算）：');
  console.log('─'.repeat(80));
  
  const testCases = [
    { bankSize: 10, sessions: 10 },
    { bankSize: 10, sessions: 20 },
    { bankSize: 20, sessions: 20 },
    { bankSize: 20, sessions: 50 },
    { bankSize: 50, sessions: 50 },
    { bankSize: 50, sessions: 100 },
    { bankSize: 100, sessions: 100 },
  ];

  testCases.forEach(({ bankSize, sessions }) => {
    const prob = theoreticalRepeatProbability(bankSize, sessions);
    console.log(`题库${bankSize.toString().padStart(3)}题，连续${sessions.toString().padStart(3)}次: ` +
      `至少1次重复概率${(prob.probAtLeastOneRepeat * 100).toFixed(2)}%`);
  });

  console.log('\n3. 实际场景分析（考虑AI生成新题）：');
  console.log('─'.repeat(80));
  
  // 模拟：题库初始10题，连续练习20次
  const simulation = calculateContinuousRepeatProbability(10, 20, true);
  console.log(`初始题库${simulation.initialBankSize}题，连续${simulation.sessions}次练习：`);
  console.log(`  重复次数: ${simulation.totalRepeatCount}`);
  console.log(`  重复率: ${(simulation.repeatRate * 100).toFixed(2)}%`);
  console.log(`  最终题库: ${simulation.results[simulation.results.length - 1].bankSize}题`);

  console.log('\n4. 关键发现：');
  console.log('─'.repeat(80));
  console.log('• excludeSentence机制：每次会排除上一题，降低重复概率');
  console.log('• 题库增长：AI生成的新题会自动加入题库，题库持续增长');
  console.log('• 降级策略：如果exclude后无题，会降级到允许重复，但概率较低');
  console.log('• 实际重复概率主要取决于：');
  console.log('  1) 题库大小（越大重复概率越低）');
  console.log('  2) 题库使用概率（70%或50%）');
  console.log('  3) excludeSentence的效果');
}

// 运行分析
analyze();
