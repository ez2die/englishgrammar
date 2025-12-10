/**
 * 准确的重复概率分析
 * 考虑exclude机制只排除上一题，不排除历史所有题目
 */

function calculateAccurateRepeatProbability() {
  console.log('=== 准确的重复概率分析 ===\n');

  // 关键理解：
  // excludeSentence只排除上一题，不排除历史所有题目
  // 所以用户可能遇到"非上一题"的历史题目

  console.log('📌 关键机制理解：');
  console.log('• excludeSentence只排除上一题（previousSentence）');
  console.log('• 不排除历史所有题目');
  console.log('• 所以用户可能遇到"非上一题"的历史题目\n');

  // 场景分析
  console.log('📊 场景分析：\n');

  // 场景1：题库10题，用户连续练习
  console.log('场景1：题库10题，用户连续练习');
  console.log('─'.repeat(60));
  
  const bankSize = 10;
  const bankUsageProb = 0.7; // 70%概率使用题库
  
  for (let session = 1; session <= 10; session++) {
    // 已做题目数（假设每次都是新题，且都保存到题库）
    const doneCount = Math.min(session - 1, bankSize);
    
    // exclude后可选题目数
    const availableAfterExclude = bankSize - 1; // 排除上一题
    
    // 可能重复的题目数（除了上一题外的所有已做题目）
    const possibleRepeatCount = Math.max(0, doneCount - 1);
    
    // 重复概率 = 可能重复的题目数 / 可选题目数
    const repeatProb = doneCount > 1 
      ? possibleRepeatCount / availableAfterExclude 
      : 0;
    
    // 实际重复概率 = 题库使用概率 × 重复概率
    const actualRepeatProb = bankUsageProb * repeatProb;
    
    console.log(`第${session.toString().padStart(2)}次: ` +
      `已做${doneCount}题, ` +
      `可选${availableAfterExclude}题, ` +
      `可能重复${possibleRepeatCount}题, ` +
      `重复概率${(actualRepeatProb * 100).toFixed(2)}%`);
  }

  console.log('\n场景2：题库20题，用户连续练习20次');
  console.log('─'.repeat(60));
  
  const bankSize2 = 20;
  let cumulativeRepeatProb = 0;
  
  for (let session = 1; session <= 20; session++) {
    const doneCount = Math.min(session - 1, bankSize2);
    const availableAfterExclude = bankSize2 - 1;
    const possibleRepeatCount = Math.max(0, doneCount - 1);
    const repeatProb = doneCount > 1 
      ? possibleRepeatCount / availableAfterExclude 
      : 0;
    const actualRepeatProb = bankUsageProb * repeatProb;
    
    if (session % 5 === 0 || session <= 3) {
      console.log(`第${session.toString().padStart(2)}次: ` +
        `重复概率${(actualRepeatProb * 100).toFixed(2)}%`);
    }
    
    cumulativeRepeatProb += actualRepeatProb;
  }
  
  console.log(`\n平均重复概率: ${(cumulativeRepeatProb / 20 * 100).toFixed(2)}%`);

  console.log('\n场景3：考虑AI生成新题（题库动态增长）');
  console.log('─'.repeat(60));
  
  let currentBankSize = 10;
  let seenQuestions = new Set();
  let repeatCount = 0;
  const sessions = 20;
  
  for (let session = 1; session <= sessions; session++) {
    const doneCount = seenQuestions.size;
    const useBank = Math.random() < bankUsageProb;
    
    if (useBank && currentBankSize > 0) {
      // 使用题库
      const availableAfterExclude = currentBankSize - 1;
      const possibleRepeatCount = Math.max(0, doneCount - 1);
      const repeatProb = doneCount > 1 
        ? possibleRepeatCount / availableAfterExclude 
        : 0;
      
      if (Math.random() < repeatProb) {
        repeatCount++;
      }
      
      // 假设从题库选择一题（简化：随机选择）
      seenQuestions.add(`bank-${session}`);
    } else {
      // AI生成新题
      currentBankSize++;
      seenQuestions.add(`new-${session}`);
    }
    
    if (session % 5 === 0 || session <= 3) {
      console.log(`第${session.toString().padStart(2)}次: ` +
        `题库${currentBankSize}题, ` +
        `已做${seenQuestions.size}题, ` +
        `累计重复${repeatCount}次`);
    }
  }
  
  console.log(`\n总重复次数: ${repeatCount}/${sessions}`);
  console.log(`重复率: ${(repeatCount / sessions * 100).toFixed(2)}%`);

  console.log('\n📈 总结：');
  console.log('─'.repeat(60));
  console.log('1. exclude机制只排除上一题，不排除历史所有题目');
  console.log('2. 用户可能遇到"非上一题"的历史题目');
  console.log('3. 重复概率 = (已做题目数-1) / (题库大小-1) × 题库使用概率');
  console.log('4. 题库动态增长会降低重复概率');
  console.log('5. 长期练习，重复概率会逐渐增加（直到题库足够大）');
}

calculateAccurateRepeatProbability();
