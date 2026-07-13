import React, { useState, useEffect, useRef } from 'react';
import { generateSentenceAnalysis, analyzeSentence } from './services/geminiService';
import { storageService } from './services/storageService';
import { SentenceAnalysisData, GrammarRole, SentenceStructure, DifficultyLevel, Theme } from './types';
import { GRAMMAR_ROLES, SENTENCE_STRUCTURES, SKELETON_CONFIG } from './constants';
import { isGraded, isRoleAcceptable } from './utils/grading';
import WordPill from './components/WordPill';
import ImageUploader from './components/ImageUploader';
import { useTheme } from './contexts/ThemeContext';
import ThemeSwitcher from './components/ThemeSwitcher';
import { useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import HistoryView from './components/HistoryView';

const App: React.FC = () => {
  const { theme, themeConfig } = useTheme();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SentenceAnalysisData | null>(null);

  // Game State
  const [currentLevel, setCurrentLevel] = useState<DifficultyLevel | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  // Points system (server-computed): per-question award + running total
  const [pointsInfo, setPointsInfo] = useState<{ earned: number; perfect: boolean; milestoneBonus: number } | null>(null);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  // Daily check-in
  const [checkin, setCheckin] = useState<{ checkedInToday: boolean; streak: number; nextStreak: number; todayReward: number } | null>(null);
  const [checkinToast, setCheckinToast] = useState<string | null>(null);

  // Phase 1: Sorting State
  const [sortingSelection, setSortingSelection] = useState<number[]>([]);
  const [assignedRoles, setAssignedRoles] = useState<Record<number, GrammarRole>>({});

  // Phase 2: Structure State
  const [selectedStructure, setSelectedStructure] = useState<SentenceStructure | null>(null);

  // Phase 3: Skeleton State
  const [skeletonSelection, setSkeletonSelection] = useState<number[]>([]);
  const [skeletonSlots, setSkeletonSlots] = useState<Record<string, number[]>>({});

  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<string>('');

  // Auth & history UI state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { user, isAuthenticated, token } = useAuth();


  // Drag and Drop State Ref (Only for Phase 1)
  const draggedIndicesRef = useRef<number[]>([]);

  // Ref for Phase 2 section (Skeleton & Word Classification)
  const phase2SectionRef = useRef<HTMLElement>(null);
  // Ref for sticky sentence card to calculate its height
  const stickySentenceRef = useRef<HTMLDivElement>(null);
  // Ref for result section
  const resultRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const initGame = async (level: DifficultyLevel) => {
    const previousSentence = data?.originalSentence;

    scrollToTop();

    setLoading(true);
    setSubmitted(false);
    setShowResult(false);
    setData(null);
    setCurrentLevel(level);

    // Reset game state
    setAssignedRoles({});
    setSelectedStructure(null);
    setSkeletonSlots({});
    setSortingSelection([]);
    setSkeletonSelection([]);
    setErrorMsg(null);
    setSourceInfo('');
    setPointsInfo(null);

    try {
      // Strategy: users mostly get a fresh AI question; a small FIXED chance
      // shows an old question for review. The probability does NOT change with
      // bank size — a bigger bank is just a larger review pool, not more review.
      const REVIEW_PROBABILITY = 0.2; // 20% review · 80% new AI question
      const bankSize = await storageService.getBankSize(level);

      if (bankSize > 0 && Math.random() < REVIEW_PROBABILITY) {
        const bankData = await storageService.getRandomQuestion(level, previousSentence);
        if (bankData) {
          await new Promise(resolve => setTimeout(resolve, 600));
          setData(bankData);
          setSourceInfo('Review Mode');
          setLoading(false);
          return;
        }
      }

      // 如果问题库较少或随机决定生成新问题，尝试生成
      try {
        const newData = await generateSentenceAnalysis(level);
        setData(newData);
        setSourceInfo('New Challenge');
        await storageService.saveQuestion(newData);
        setLoading(false);
        return;
      } catch (generateError: any) {
        // 如果生成失败，自动降级到问题库（静默处理，不显示错误）
        console.log('生成失败，尝试从问题库加载:', generateError);
        let bankData: SentenceAnalysisData | null = null;

        // 尝试多种方式从问题库加载（逐级放宽条件）
        try {
          // 策略 1: 尝试精确匹配（level + excludeSentence）
          bankData = await storageService.getRandomQuestion(level, previousSentence);
          if (bankData) {
            console.log('✅ 策略1成功: 精确匹配');
          }

          // 策略 2: 如果失败，尝试只匹配 level（允许重复）
          if (!bankData) {
            console.log('策略1失败，尝试策略2: 只匹配level');
            bankData = await storageService.getRandomQuestion(level);
            if (bankData) {
              console.log('✅ 策略2成功: 只匹配level');
            }
          }

          // 策略 3: 如果还是失败，检查该级别是否有数据，如果没有则直接跳到所有级别
          if (!bankData) {
            console.log('策略2失败，检查该级别是否有数据');
            const levelBankSize = await storageService.getBankSize(level);
            if (levelBankSize === 0) {
              console.log(`该级别(${level})无数据，直接尝试所有级别`);
              // 该级别没有数据，直接尝试所有级别
              bankData = await storageService.getRandomQuestion();
            } else {
              // 该级别有数据，但 excludeSentence 可能过滤掉了所有数据，尝试不带 excludeSentence
              console.log(`该级别(${level})有数据，但带excludeSentence未找到，尝试不带excludeSentence`);
              bankData = await storageService.getRandomQuestion(level);
              if (!bankData) {
                // 如果还是失败，降级到所有级别
                console.log('策略3失败，降级到所有级别');
                bankData = await storageService.getRandomQuestion();
              }
            }
            if (bankData) {
              console.log('✅ 策略3成功: 所有级别');
            }
          }

          // 策略 4: 最后尝试，不指定任何条件（最大成功率）
          if (!bankData) {
            console.log('策略3失败，尝试策略4: 无任何限制');
            bankData = await storageService.getRandomQuestion();
            if (bankData) {
              console.log('✅ 策略4成功: 无限制');
            }
          }
        } catch (bankError) {
          console.error('从问题库加载失败:', bankError);
        }

        if (bankData) {
          // ✅ 成功从问题库加载，静默处理，不显示任何错误消息
          setData(bankData);
          setSourceInfo('Review Mode');
          setErrorMsg(null); // 明确设置为 null，确保不显示错误
          setLoading(false);
          return;
        }

        // 如果问题库也没有，抛出错误到外层处理（外层会再次尝试并显示错误）
        // 但保留错误的所有属性，方便外层判断
        const errorToThrow = generateError;
        // 确保错误属性正确传递
        if (generateError.status) errorToThrow.status = generateError.status;
        if (generateError.isQuotaExceeded) errorToThrow.isQuotaExceeded = generateError.isQuotaExceeded;
        if (generateError.code) errorToThrow.code = generateError.code;
        if (generateError.shouldFallback) errorToThrow.shouldFallback = generateError.shouldFallback;
        if (generateError.isRateLimit) errorToThrow.isRateLimit = generateError.isRateLimit;
        if (generateError.isNetworkError) errorToThrow.isNetworkError = generateError.isNetworkError;
        throw errorToThrow;
      }

    } catch (e: any) {
      console.error('外层错误捕获:', e);

      // 统一处理：所有错误都先尝试从问题库加载（静默降级）
      let bankData: SentenceAnalysisData | null = null;

      try {
        // 尝试多种方式从问题库加载
        // 先尝试带 excludeSentence 的
        bankData = await storageService.getRandomQuestion(level, previousSentence);

        // 如果返回 null，尝试不带 excludeSentence（允许重复）
        if (!bankData) {
          console.log('外层：带excludeSentence未找到，尝试不带excludeSentence');
          bankData = await storageService.getRandomQuestion(level);
        }

        // 如果还是 null，尝试不指定 level（所有级别）
        if (!bankData) {
          console.log('外层：指定level未找到，尝试所有级别');
          bankData = await storageService.getRandomQuestion();
        }
      } catch (bankError) {
        console.error('从问题库加载失败:', bankError);
      }

      if (bankData) {
        // ✅ 成功从问题库加载，静默处理，不显示任何错误消息
        setData(bankData);
        setSourceInfo('Review Mode');
        setErrorMsg(null); // 确保不显示错误
        setLoading(false);
        return;
      }

      // ⚠️ 问题库也没有可用问题，根据错误类型显示相应消息
      // 但这是最后的选择，只有在所有尝试都失败时才显示
      if (e.status === 503 || e.isQuotaExceeded || e.code === 'GEMINI_QUOTA_EXCEEDED' ||
        (e.message && (e.message.includes('配额') || e.message.includes('quota')))) {
        setErrorMsg("生成服务暂时不可用，问题库暂无可用问题。请稍后再试。");
      } else if (e.status === 429 || e.isRateLimit ||
        (e.message && (e.message.includes('频繁') || e.message.includes('Too many')))) {
        setErrorMsg("请求过于频繁，请稍后再试。");
      } else if (e.isNetworkError ||
        (e.message && (e.message.includes('网络') || e.message.includes('connection') || e.message.includes('fetch')))) {
        setErrorMsg("网络连接失败，请检查您的网络连接。");
      } else {
        setErrorMsg("生成失败，请稍后再试。");
      }
      setLoading(false);
    }
  };

  const handleUserBtnClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAuthenticated) {
      setShowHistory(true);
    } else {
      setShowAuthModal(true);
    }
  };

  // Load the user's running points total + check-in status on login (clear on logout).
  useEffect(() => {
    if (isAuthenticated && token) {
      fetch('/api/user/stats', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (d) setTotalPoints(d.totalPoints ?? 0); })
        .catch(() => { });
      fetch('/api/user/checkin', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (d) setCheckin(d); })
        .catch(() => { });
    } else {
      setTotalPoints(null);
      setCheckin(null);
    }
  }, [isAuthenticated, token]);

  const handleCheckin = async () => {
    if (!token || !checkin || checkin.checkedInToday) return;
    try {
      const r = await fetch('/api/user/checkin', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (!r.ok) return;
      const d = await r.json();
      if (!d.alreadyCheckedIn) {
        setTotalPoints(d.totalPoints);
        setCheckin({ checkedInToday: true, streak: d.streak, nextStreak: d.streak, todayReward: 0 });
        setCheckinToast(`签到成功 +${d.earned}${d.streakBonus > 0 ? ` · 连签 ${d.streak} 天` : ''}`);
        setTimeout(() => setCheckinToast(null), 3000);
      } else {
        setCheckin(c => (c ? { ...c, checkedInToday: true, todayReward: 0 } : c));
      }
    } catch { /* network */ }
  };

  const returnToMenu = () => {
    setData(null);
    setCurrentLevel(null);
    setSubmitted(false);
    setShowResult(false);
  };

  // Reset skeleton slots when structure changes
  useEffect(() => {
    if (selectedStructure) {
      const validSlots = SKELETON_CONFIG[selectedStructure];
      setSkeletonSlots(prev => {
        const cleaned: Record<string, number[]> = {};
        validSlots.forEach(slot => {
          if (prev[slot]) {
            cleaned[slot] = prev[slot];
          }
        });
        return cleaned;
      });
    } else {
      setSkeletonSlots({});
    }
  }, [selectedStructure]);

  // Auto-scroll to Phase 2 when structure is selected
  useEffect(() => {
    if (selectedStructure && phase2SectionRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        const phase2Element = phase2SectionRef.current;
        const stickySentenceElement = stickySentenceRef.current;

        if (phase2Element) {
          // Get the position of Phase 2 section
          const phase2Rect = phase2Element.getBoundingClientRect();
          const currentScrollY = window.scrollY || window.pageYOffset;

          // Calculate the sticky sentence card height (including padding)
          let stickyOffset = 0;
          if (stickySentenceElement) {
            const stickyRect = stickySentenceElement.getBoundingClientRect();
            stickyOffset = stickyRect.height;
          } else {
            // Fallback: estimate height if ref not available
            // Header is ~48px, sentence card has padding and content
            stickyOffset = 100; // Approximate height
          }

          // Calculate target scroll position: Phase 2 position minus sticky card height plus some padding
          const targetScrollY = currentScrollY + phase2Rect.top - stickyOffset - 20;

          window.scrollTo({
            top: Math.max(0, targetScrollY),
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [selectedStructure]);

  // Helper function to check if a word is punctuation
  const isPunctuation = (text: string): boolean => {
    return /^[.,!?;:—–\-'"]+$/.test(text);
  };

  // --- Phase 1: Sorting Interaction Handlers ---
  const handleSortingClick = (index: number) => {
    if (submitted) return;

    const unit = getSelectionUnit(index);
    const isAnyAssigned = unit.some(idx => assignedRoles[idx]);

    if (isAnyAssigned) {
      setAssignedRoles(prev => {
        const next = { ...prev };
        unit.forEach(idx => {
          delete next[idx];
        });
        return next;
      });
      return;
    }

    setSortingSelection(prev => {
      // Check if any index in the unit is already selected
      const isAnySelected = unit.some(idx => prev.includes(idx));
      if (isAnySelected) {
        // Remove all indices in the unit
        return prev.filter(i => !unit.includes(i));
      } else {
        // Add all indices in the unit
        return [...prev.filter(i => !unit.includes(i)), ...unit].sort((a, b) => a - b);
      }
    });
  };

  const assignSelectedToRole = (role: GrammarRole) => {
    if (sortingSelection.length === 0) return;
    // Get skeleton indices - words that are already in skeleton slots
    const skeletonIndicesSet = new Set(Object.values(skeletonSlots).flat());
    // Filter out skeleton words
    const validIndices = sortingSelection.filter(idx => !skeletonIndicesSet.has(idx));
    if (validIndices.length === 0) {
      setSortingSelection([]);
      return;
    }
    setAssignedRoles(prev => {
      const next = { ...prev };
      validIndices.forEach(idx => {
        next[idx] = role;
      });
      return next;
    });
    setSortingSelection([]);
  };

  // --- Phase 1: Drag and Drop Handlers ---
  const onWordDragStart = (e: React.DragEvent, index: number) => {
    if (submitted) return;
    const unit = getSelectionUnit(index);
    let indicesToDrag = unit;

    // Check if any index in the unit is in current selection
    const isAnySelected = unit.some(idx => sortingSelection.includes(idx));
    if (isAnySelected) {
      // Use current selection, but ensure unit is included
      indicesToDrag = [...new Set([...sortingSelection, ...unit])].sort((a, b) => a - b);
    } else {
      // Select the unit
      setSortingSelection(unit);
      indicesToDrag = unit;
    }

    draggedIndicesRef.current = indicesToDrag;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(indicesToDrag));
  };

  const onBasketDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onBasketDrop = (e: React.DragEvent, role: GrammarRole) => {
    e.preventDefault();
    if (submitted) return;
    const indices = draggedIndicesRef.current;
    if (indices.length > 0) {
      // Get skeleton indices - words that are already in skeleton slots
      const skeletonIndicesSet = new Set(Object.values(skeletonSlots).flat());
      // Filter out skeleton words
      const validIndices = indices.filter(idx => !skeletonIndicesSet.has(idx));
      if (validIndices.length > 0) {
        setAssignedRoles(prev => {
          const next = { ...prev };
          validIndices.forEach(idx => {
            next[idx] = role;
          });
          return next;
        });
      }
      setSortingSelection([]);
      draggedIndicesRef.current = [];
    }
  };

  // --- Phase 2: Combined Skeleton & Word Classification Handlers ---
  const handleSkeletonClick = (index: number) => {
    if (submitted) return;

    const unit = getSelectionUnit(index);
    // Check if any word in the unit is already in skeleton or assigned to a role
    const isInSkeleton = unit.some(idx => Object.values(skeletonSlots).flat().includes(idx));
    const isAssigned = unit.some(idx => assignedRoles[idx]);

    if (isInSkeleton || isAssigned) return;

    setSkeletonSelection(prev => {
      // Check if any index in the unit is already selected
      const isAnySelected = unit.some(idx => prev.includes(idx));
      if (isAnySelected) {
        // Remove all indices in the unit
        return prev.filter(i => !unit.includes(i));
      } else {
        // Add all indices in the unit
        return [...prev.filter(i => !unit.includes(i)), ...unit].sort((a, b) => a - b);
      }
    });
  };

  const addToSkeletonSlot = (slotName: string) => {
    // Use sortingSelection if available, otherwise use skeletonSelection
    const indicesToAdd = sortingSelection.length > 0 ? sortingSelection : skeletonSelection;
    if (indicesToAdd.length === 0) return;

    // Filter out words already in skeleton or assigned to roles
    const skeletonIndicesSet = new Set(Object.values(skeletonSlots).flat());
    const validIndices = indicesToAdd.filter(idx =>
      !skeletonIndicesSet.has(idx) && !assignedRoles[idx]
    );

    if (validIndices.length === 0) {
      setSkeletonSelection([]);
      setSortingSelection([]);
      return;
    }

    setSkeletonSlots(prev => {
      const currentList = prev[slotName] || [];
      const newIndices = validIndices.filter(idx => !currentList.includes(idx));
      return {
        ...prev,
        [slotName]: [...currentList, ...newIndices].sort((a, b) => a - b)
      };
    });
    setSkeletonSelection([]);
    setSortingSelection([]);
  };

  const removeFromSkeletonSlot = (slotName: string, indexToRemove: number) => {
    if (submitted) return;
    setSkeletonSlots(prev => ({
      ...prev,
      [slotName]: (prev[slotName] || []).filter(i => i !== indexToRemove)
    }));
  };

  // --- Validation Helpers ---
  const getIsCorrect = (idx: number, correctRole: GrammarRole) => {
    if (!submitted) return null;
    const word = data?.words[idx] ?? '';
    // Ungraded (punctuation / articles / connective) → neutral, never marked wrong.
    if (!isGraded(word, correctRole)) return null;
    return isRoleAcceptable(correctRole, assignedRoles[idx]);
  };

  const checkResults = () => {
    setSubmitted(true);
    setShowResult(true);

    // Calculate score with lenient grading (see utils/grading.ts): punctuation,
    // articles/determiners and 连接词/其他 are not counted; modifier roles are
    // interchangeable; only core skeleton roles need an exact match.
    let correctCount = 0;
    let totalCount = 0;
    currentData.words.forEach((word, idx) => {
      const correctRole = currentData.wordRoles[idx];
      if (isGraded(word, correctRole)) {
        totalCount++;
        if (isRoleAcceptable(correctRole, assignedRoles[idx])) correctCount++;
      }
    });

    const structureCorrect = selectedStructure === currentData.structureType;
    // Require at least one gradable word so an all-connective sentence can't be "fully correct".
    const allWordsCorrect = totalCount > 0 && correctCount === totalCount;
    const fullyCorrect = allWordsCorrect && structureCorrect;

    // 只有在全部正确（角色+结构）时才积分；否则 0 分
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    const rawScore = Math.round(accuracy + (structureCorrect ? 20 : 0));
    const newScore = fullyCorrect ? rawScore : 0;

    setScore(prev => prev + newScore);
    setStreak(prev => (fullyCorrect ? prev + 1 : 0));

    setTimeout(() => {
      if (resultRef.current) {
        const rect = resultRef.current.getBoundingClientRect();
        const currentY = window.scrollY || window.pageYOffset;
        const target = currentY + rect.top - 80; // leave space for header
        window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    }, 150);

    // Save to history if logged in (save all results, including errors)
    if (isAuthenticated && token) {
      // Calculate detailed error information
      const correctSkeletonSet = new Set(currentData.skeletonIndices);
      const userSkeletonSet = new Set(Object.values(skeletonSlots).flat());
      
      // Word-level errors
      const wordErrors: Array<{
        wordIndex: number;
        word: string;
        correctRole: GrammarRole;
        userRole: GrammarRole | null;
        isCorrect: boolean;
        isInCorrectSkeleton: boolean;
        isInUserSkeleton: boolean;
        skeletonSlot?: string;
      }> = [];

      currentData.words.forEach((word, idx) => {
        const correctRole = currentData.wordRoles[idx];
        const userRole = assignedRoles[idx] || null;
        const isInCorrectSkeleton = correctSkeletonSet.has(idx);
        const isInUserSkeleton = userSkeletonSet.has(idx);
        
        // Find which skeleton slot this word is in (if any)
        let skeletonSlot: string | undefined;
        for (const [slotName, indices] of Object.entries(skeletonSlots)) {
          if (indices.includes(idx)) {
            skeletonSlot = slotName;
            break;
          }
        }

        // Check correctness based on whether word should be in skeleton
        let isCorrect = false;
        if (!isGraded(word, correctRole)) {
          isCorrect = true; // punctuation / articles / connectives are not graded
        } else if (isInCorrectSkeleton) {
          // Word should be in skeleton
          if (isInUserSkeleton) {
            // User placed it in skeleton - correctness depends on correct slot placement
            // This will be detailed in skeleton errors, but for word-level we consider it correct
            // if the structure matches and it's in skeleton
            isCorrect = (selectedStructure === currentData.structureType);
          } else {
            // Should be in skeleton but user didn't place it
            isCorrect = false;
          }
        } else {
          // Word should NOT be in skeleton - check role assignment
          if (isInUserSkeleton) {
            // User incorrectly placed non-skeleton word in skeleton
            isCorrect = false;
          } else {
            // Both not in skeleton, check role assignment (lenient)
            isCorrect = isRoleAcceptable(correctRole, userRole);
          }
        }

        wordErrors.push({
          wordIndex: idx,
          word,
          correctRole,
          userRole,
          isCorrect,
          isInCorrectSkeleton,
          isInUserSkeleton,
          skeletonSlot
        });
      });

      // Structure error
      const structureError = {
        correct: structureCorrect,
        correctStructure: currentData.structureType,
        userStructure: selectedStructure || null
      };

      // Skeleton errors - compare user skeleton slots with correct skeleton indices
      const skeletonErrors: Array<{
        slotName: string;
        correctIndices: number[];
        userIndices: number[];
        correctWords: string[];
        userWords: string[];
        isCorrect: boolean;
        missingIndices: number[];
        extraIndices: number[];
      }> = [];

      if (selectedStructure) {
        const validSlots = SKELETON_CONFIG[selectedStructure];
        // Map role names to slot names for correct structure
        const correctStructureSlots = SKELETON_CONFIG[currentData.structureType] || [];
        
        // Create a mapping of correct skeleton indices to their expected roles
        const correctSkeletonRoleMap: Record<number, GrammarRole> = {};
        currentData.skeletonIndices.forEach(idx => {
          correctSkeletonRoleMap[idx] = currentData.wordRoles[idx];
        });

        // Map role to slot name (simplified - for complex structures like SVOO, this may need enhancement)
        const roleToSlotMap: Record<string, string> = {
          [GrammarRole.SUBJECT]: '主语',
          [GrammarRole.PREDICATE]: '谓语',
          [GrammarRole.OBJECT]: '宾语',
          [GrammarRole.PREDICATIVE]: '表语',
          [GrammarRole.LINK_VERB]: '系动词',
          [GrammarRole.COMPLEMENT]: '宾语补足语',
        };

        validSlots.forEach(slotName => {
          // Find correct indices for this slot based on the correct structure
          const correctIndicesForSlot: number[] = [];
          
          // If user selected the correct structure, map skeleton indices to slots
          if (selectedStructure === currentData.structureType) {
            currentData.skeletonIndices.forEach(idx => {
              const role = currentData.wordRoles[idx];
              // Handle SVOO case where there are two object slots
              if (slotName === '间接宾语' || slotName === '直接宾语') {
                // This is simplified - in a real implementation, you'd need logic to distinguish
                // For now, if the role is OBJECT and we're looking for object slots, include it
                if (role === GrammarRole.OBJECT && (slotName === '间接宾语' || slotName === '直接宾语')) {
                  // Try to match based on position or other heuristics
                  // For simplicity, we'll mark both if they exist
                }
              } else if (roleToSlotMap[role] === slotName) {
                correctIndicesForSlot.push(idx);
              }
            });
          }
          
          const userIndicesForSlot = skeletonSlots[slotName] || [];
          const correctWords = correctIndicesForSlot.map(idx => currentData.words[idx]);
          const userWords = userIndicesForSlot.map(idx => currentData.words[idx]);
          
          // Find missing and extra indices
          const missingIndices = correctIndicesForSlot.filter(idx => !userIndicesForSlot.includes(idx));
          const extraIndices = userIndicesForSlot.filter(idx => !correctIndicesForSlot.includes(idx));
          
          // Check if slot is correct (all correct indices present, no extra wrong indices)
          const isCorrect = missingIndices.length === 0 && extraIndices.length === 0 && 
                          correctIndicesForSlot.length > 0;
          
          skeletonErrors.push({
            slotName,
            correctIndices: correctIndicesForSlot,
            userIndices: userIndicesForSlot,
            correctWords,
            userWords,
            isCorrect,
            missingIndices,
            extraIndices
          });
        });
      }

      // Create a comprehensive snapshot with error analysis
      const snapshot = {
        sentence: currentData.originalSentence,
        words: currentData.words,
        roles: currentData.wordRoles,
        skeleton: currentData.skeletonIndices,
        userStructure: selectedStructure,
        userRoles: assignedRoles,
        userSkeleton: skeletonSlots,
        // Error analysis
        errors: {
          structure: structureError,
          words: wordErrors.filter(e => !e.isCorrect && e.correctRole !== GrammarRole.CONNECTIVE),
          skeleton: skeletonErrors.filter(e => !e.isCorrect),
          summary: {
            totalWords: totalCount,
            correctWords: correctCount,
            accuracy: Math.round(accuracy),
            structureCorrect,
            fullyCorrect,
            errorCount: wordErrors.filter(e => !e.isCorrect && e.correctRole !== GrammarRole.CONNECTIVE).length
          }
        }
      };

      fetch('/api/user/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sentence: currentData.originalSentence,
          structure_type: currentData.structureType,
          score: rawScore, // Store raw score regardless of correctness
          analysis_snapshot: snapshot,
          // Result details for server-side points computation
          level: currentLevel ?? currentData.level ?? 'Intermediate',
          correct_count: correctCount,
          total_count: totalCount,
          structure_correct: structureCorrect
        })
      })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (d?.points) {
            setPointsInfo({ earned: d.points.earned, perfect: d.points.perfect, milestoneBonus: d.points.milestoneBonus });
            if (typeof d.points.total === 'number') setTotalPoints(d.points.total);
          }
        })
        .catch(err => console.error('Failed to save history:', err));
    }
  };

  // Calculate progress - New order: Structure -> Combined Skeleton & Word Classification
  const getProgress = () => {
    if (!data) return 0;
    if (submitted) return 100;

    // Step 1: Structure selection (0-25%)
    if (!selectedStructure) return 0;

    // Step 2: Combined Skeleton & Word Classification (25-100%)
    const skeletonComplete = SKELETON_CONFIG[selectedStructure].every(
      slot => (skeletonSlots[slot] || []).length > 0
    );
    const skeletonSlotsValues = Object.values(skeletonSlots) as number[][];
    const skeletonSlotsCount: number = skeletonSlotsValues.reduce((sum: number, arr: number[]) => {
      return sum + (arr?.length || 0);
    }, 0);
    const totalSkeletonSlots = SKELETON_CONFIG[selectedStructure].length;
    const skeletonProgress: number = skeletonComplete ? 1 : (skeletonSlotsCount / totalSkeletonSlots);

    const assignedCount = Object.keys(assignedRoles).length;
    const totalWords = data.words.filter((_, idx) => {
      const isInSkeleton = Object.values(skeletonSlots).flat().includes(idx);
      return data.wordRoles[idx] !== GrammarRole.CONNECTIVE && !isInSkeleton;
    }).length;
    const wordProgress = totalWords > 0 ? assignedCount / totalWords : 1;

    // Combined progress: 25% base + 75% for skeleton and word classification
    return 25 + Math.min(75, (skeletonProgress * 0.4 + wordProgress * 0.6) * 75);
  };

  // Loading Screen
  if (loading) {
    const loadingBg = theme === Theme.FRESH
      ? 'bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50'
      : 'bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50';
    const spinnerBorder = theme === Theme.FRESH
      ? 'border-emerald-200 border-t-emerald-500'
      : 'border-purple-200 border-t-purple-500';
    const textColor = theme === Theme.FRESH
      ? 'text-emerald-600'
      : 'text-purple-600';

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${loadingBg}`}>
        <div className="relative">
          <div className={`w-20 h-20 border-4 ${spinnerBorder} rounded-full animate-spin`}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
        </div>
        <p className={`mt-6 text-xl font-bold ${textColor} animate-pulse`}>Creating Challenge...</p>
      </div>
    );
  }

  // HOME SCREEN (Level Selection)
  if (!data && !loading) {
    const isFresh = theme === Theme.FRESH;

    const homeBg = isFresh
      ? 'bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50'
      : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50';

    const titleGradient = isFresh
      ? 'bg-gradient-to-r from-emerald-600 via-cyan-600 to-sky-500'
      : 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500';

    const cardBg = isFresh
      ? 'bg-white/90 backdrop-blur-sm border-emerald-200'
      : 'bg-white/80 backdrop-blur-sm border-purple-200';

    const scoreColor = isFresh ? 'text-emerald-600' : 'text-purple-600';
    const streakTextColor = isFresh ? 'text-cyan-600' : 'text-orange-600';
    const streakBorderColor = isFresh ? 'border-cyan-200' : 'border-orange-200';

    const level1Btn = isFresh
      ? 'bg-gradient-to-r from-emerald-300 to-teal-400 border-emerald-500 text-emerald-50'
      : 'bg-gradient-to-r from-green-400 to-emerald-500 border-green-600 text-green-100';

    const level2Btn = isFresh
      ? 'bg-gradient-to-r from-cyan-300 to-sky-400 border-cyan-500 text-cyan-50'
      : 'bg-gradient-to-r from-yellow-400 to-orange-500 border-orange-600 text-orange-100';

    const level3Btn = isFresh
      ? 'bg-gradient-to-r from-sky-300 to-blue-400 border-sky-500 text-sky-50'
      : 'bg-gradient-to-r from-pink-500 to-rose-600 border-rose-700 text-pink-100';

    return (
      <div className={`min-h-screen ${homeBg} p-4 pb-8`}>
        {/* Header */}
        <div className="text-center pt-8 pb-6 relative">
          <div className="absolute top-8 right-4 flex gap-3 z-50">
            <ThemeSwitcher />
            <button
              onClick={handleUserBtnClick}
              type="button"
              style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 100 }}
              className={`
                  h-10 px-4 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2
                  ${isFresh
                  ? 'bg-white text-emerald-600 hover:bg-emerald-50'
                  : 'bg-white text-purple-600 hover:bg-purple-50'}
                `}
            >
              <span>{isAuthenticated ? '👤 ' + user?.username : '🔐 Login'}</span>
              {isAuthenticated && totalPoints !== null && (
                <span className={`${isFresh ? 'text-amber-600' : 'text-amber-500'} font-black`}>🏆 {totalPoints}</span>
              )}
            </button>
          </div>
          <h1 className={`text-5xl font-black text-transparent bg-clip-text ${titleGradient} mb-2`}>
            Grammar Master
          </h1>
          <p className={`${isFresh ? 'text-slate-600' : 'text-gray-600'} text-sm font-medium`}>Master English Sentence Structure</p>
        </div>

        {/* Score Display */}
        {(score > 0 || streak > 0 || pointsInfo) && (
          <div className="max-w-md mx-auto mb-6 flex gap-3">
            <div className={`flex-1 ${cardBg} rounded-2xl p-3 border-2 shadow-lg`}>
              <div className={`text-xs ${isFresh ? 'text-slate-500' : 'text-gray-500'} font-bold uppercase mb-1`}>Score</div>
              <div className={`text-2xl font-black ${scoreColor}`}>{score}</div>
            </div>
            {streak > 0 && (
              <div className={`flex-1 ${cardBg} ${streakBorderColor} rounded-2xl p-3 border-2 shadow-lg`}>
                <div className={`text-xs ${isFresh ? 'text-slate-500' : 'text-gray-500'} font-bold uppercase mb-1`}>Streak</div>
                <div className={`text-2xl font-black ${streakTextColor} flex items-center gap-1`}>
                  🔥 {streak}
                </div>
              </div>
            )}
            {pointsInfo && (
              <div className={`flex-1 ${cardBg} border-amber-200 rounded-2xl p-3 border-2 shadow-lg`}>
                <div className={`text-xs ${isFresh ? 'text-slate-500' : 'text-gray-500'} font-bold uppercase mb-1`}>积分</div>
                <div className="text-2xl font-black text-amber-500 flex items-center gap-1">
                  +{pointsInfo.earned}
                  {pointsInfo.perfect && <span className="text-xs">⭐×1.5</span>}
                </div>
                {pointsInfo.milestoneBonus > 0 && (
                  <div className="text-[10px] font-bold text-amber-600">🎯 里程碑 +{pointsInfo.milestoneBonus}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Daily check-in */}
        {isAuthenticated && checkin && (
          <div className="max-w-md mx-auto mb-6">
            <div className={`${cardBg} rounded-2xl p-4 border-2 shadow-lg flex items-center justify-between gap-3`}>
              <div className="min-w-0">
                <div className={`text-sm font-black ${isFresh ? 'text-slate-800' : 'text-gray-800'}`}>📅 每日签到</div>
                <div className={`text-xs font-medium ${isFresh ? 'text-slate-500' : 'text-gray-500'}`}>
                  {checkin.checkedInToday
                    ? `已连续签到 ${checkin.streak} 天 · 明天再来 🔥`
                    : `连签 ${checkin.streak} 天 · 今日可得 +${checkin.todayReward}`}
                </div>
              </div>
              <button
                onClick={handleCheckin}
                disabled={checkin.checkedInToday}
                type="button"
                className={`shrink-0 px-4 h-10 rounded-xl font-black text-sm shadow transition-all
                  ${checkin.checkedInToday
                    ? 'bg-gray-200 text-gray-400 cursor-default'
                    : 'bg-amber-400 text-amber-900 hover:bg-amber-300 active:scale-95'}`}
              >
                {checkin.checkedInToday ? '已签到 ✓' : `签到 +${checkin.todayReward}`}
              </button>
            </div>
          </div>
        )}

        {checkinToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-amber-400 text-amber-900 font-black px-5 py-3 rounded-2xl shadow-2xl animate-fade-in">
            🎉 {checkinToast}
          </div>
        )}

        {errorMsg && (
          <div className={`max-w-md mx-auto mb-4 ${isFresh ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-red-100 text-red-700 border-red-200'} p-4 rounded-2xl border-2 font-bold text-sm`}>
            {errorMsg}
          </div>
        )}

        {/* OCR Image Uploader */}
        <div className="max-w-md mx-auto mb-6">
          <ImageUploader
            onTextRecognized={async (text: string) => {
              setLoading(true);
              setErrorMsg(null);
              setSubmitted(false);
              setShowResult(false);
              setData(null);
              setCurrentLevel(DifficultyLevel.INTERMEDIATE); // 默认使用Intermediate级别

              // Reset game state
              setAssignedRoles({});
              setSelectedStructure(null);
              setSkeletonSlots({});
              setSortingSelection([]);
              setSkeletonSelection([]);

              try {
                const analysisData = await analyzeSentence(text, DifficultyLevel.INTERMEDIATE);
                setData(analysisData);
                setSourceInfo('OCR Analysis');
                setLoading(false);
              } catch (err: any) {
                console.error('Failed to analyze OCR text:', err);
                let errorMessage = '分析失败，请稍后再试';

                if (err.status === 503 || err.isQuotaExceeded || err.code === 'GEMINI_QUOTA_EXCEEDED' ||
                  (err.message && (err.message.includes('配额') || err.message.includes('quota')))) {
                  errorMessage = '分析服务暂时不可用，请稍后再试';
                } else if (err.status === 429 || err.isRateLimit ||
                  (err.message && (err.message.includes('频繁') || err.message.includes('Too many')))) {
                  errorMessage = '请求过于频繁，请稍后再试';
                } else if (err.isNetworkError ||
                  (err.message && (err.message.includes('网络') || err.message.includes('connection') || err.message.includes('fetch')))) {
                  errorMessage = '网络连接失败，请检查您的网络连接';
                } else if (err.message) {
                  errorMessage = err.message;
                }

                setErrorMsg(errorMessage);
                setLoading(false);
              }
            }}
            onError={(error: string) => {
              setErrorMsg(error);
            }}
          />
        </div>

        {/* Level Cards */}
        <div className="max-w-md mx-auto space-y-4">
          <button
            onClick={() => initGame(DifficultyLevel.BASIC)}
            className={`w-full ${level1Btn} text-white p-6 rounded-3xl shadow-xl border-2 active:scale-95 transition-all transform hover:shadow-2xl`}
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🌱</div>
              <div className="text-left flex-1">
                <div className="text-xl font-black mb-1">Level 1: Basic</div>
                <div className={`${level1Btn.split(' ').pop()} text-sm font-semibold`}>Simple Structures</div>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </button>

          <button
            onClick={() => initGame(DifficultyLevel.INTERMEDIATE)}
            className={`w-full ${level2Btn} text-white p-6 rounded-3xl shadow-xl border-2 active:scale-95 transition-all transform hover:shadow-2xl`}
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">⚡</div>
              <div className="text-left flex-1">
                <div className="text-xl font-black mb-1">Level 2: Intermediate</div>
                <div className={`${level2Btn.split(' ').pop()} text-sm font-semibold`}>With Modifiers</div>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </button>

          <button
            onClick={() => initGame(DifficultyLevel.ADVANCED)}
            className={`w-full ${level3Btn} text-white p-6 rounded-3xl shadow-xl border-2 active:scale-95 transition-all transform hover:shadow-2xl`}
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">🔥</div>
              <div className="text-left flex-1">
                <div className="text-xl font-black mb-1">Level 3: Advanced</div>
                <div className={`${level3Btn.split(' ').pop()} text-sm font-semibold`}>Complex Clauses</div>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </button>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        {showHistory && <HistoryView onClose={() => setShowHistory(false)} />}
      </div>
    );
  }

  const currentData = data!;
  const displayOptions = currentData.options && currentData.options.length > 0
    ? currentData.options
    : GRAMMAR_ROLES;

  // Get selection unit: if punctuation, include previous word; if word followed by punctuation, include punctuation
  const getSelectionUnit = (index: number): number[] => {
    if (!currentData || index < 0 || index >= currentData.words.length) return [index];

    const word = currentData.words[index];
    if (isPunctuation(word) && index > 0) {
      // Include punctuation and the word before it
      return [index - 1, index];
    }
    // Check if next word is punctuation, if so include it
    if (index < currentData.words.length - 1 && isPunctuation(currentData.words[index + 1])) {
      return [index, index + 1];
    }
    return [index];
  };

  // Check if an index should be highlighted (either directly selected or part of a selection unit)
  const shouldHighlight = (index: number): boolean => {
    if (sortingSelection.includes(index) || skeletonSelection.includes(index)) {
      return true;
    }
    // Check if this index is part of a selection unit for any selected index
    const allSelected = [...sortingSelection, ...skeletonSelection];
    return allSelected.some(selectedIdx => {
      const unit = getSelectionUnit(selectedIdx);
      return unit.includes(index);
    });
  };

  // Get skeleton indices - words that are already in skeleton slots
  const skeletonIndicesSet = new Set(Object.values(skeletonSlots).flat());

  const unassignedIndices = currentData.words
    .map((_, idx) => idx)
    .filter(idx => !assignedRoles[idx] && !skeletonIndicesSet.has(idx));

  const evaluateResult = () => {
    if (!submitted || !currentData) return null;
    const correctSkeletonSet = new Set(currentData.skeletonIndices);
    const userSkeletonSet = new Set(Object.values(skeletonSlots).flat());
    let correctCount = 0;
    let totalCount = 0;
    currentData.words.forEach((word, idx) => {
      const correctRole = currentData.wordRoles[idx];
      if (isGraded(word, correctRole)) {
        totalCount++;
        const isUserSkeleton = userSkeletonSet.has(idx);
        const isCorrectSkeleton = correctSkeletonSet.has(idx);
        if ((isUserSkeleton && isCorrectSkeleton) || isRoleAcceptable(correctRole, assignedRoles[idx])) {
          correctCount++;
        }
      }
    });
    const structureCorrect = selectedStructure === currentData.structureType;
    const allWordsCorrect = totalCount > 0 && correctCount === totalCount;
    const fullyCorrect = allWordsCorrect && structureCorrect;
    const roleAccuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const status = fullyCorrect ? 'perfect' : (structureCorrect || correctCount > 0 ? 'partial' : 'incorrect');
    return { correctCount, totalCount, roleAccuracy, structureCorrect, fullyCorrect, status };
  };

  const progress = getProgress();
  const isFresh = theme === Theme.FRESH;
  const resultMeta = evaluateResult();

  const renderAnnotatedSentence = () => {
    const skeletonSet = new Set(currentData.skeletonIndices);
    const getBlockType = (idx: number) => {
      if (skeletonSet.has(idx)) return 'skeleton';
      const role = currentData.wordRoles[idx];
      switch (role) {
        case GrammarRole.ATTRIBUTE:
          return 'attribute';
        case GrammarRole.ADVERBIAL:
          return 'adverbial';
        case GrammarRole.ATTRIBUTIVE_CLAUSE:
          return 'attr-clause';
        case GrammarRole.ADVERBIAL_CLAUSE:
          return 'adv-clause';
        case GrammarRole.CONNECTIVE:
          return 'connective';
        default:
          return 'other';
      }
    };

    type BlockType = 'skeleton' | 'attribute' | 'adverbial' | 'attr-clause' | 'adv-clause' | 'connective' | 'other';
    type Block = { type: BlockType; tokens: string[]; indices: number[]; role?: GrammarRole };

    const blocks: Block[] = [];

    currentData.words.forEach((word, idx) => {
      const isPunc = isPunctuation(word);
      const type = getBlockType(idx);

      // Punctuation: attach to previous block if any
      if (isPunc) {
        if (blocks.length > 0) {
          blocks[blocks.length - 1].tokens.push(word);
        } else {
          blocks.push({ type: 'other', tokens: [word], indices: [] });
        }
        return;
      }

      const last = blocks[blocks.length - 1];
      if (last && last.type === type) {
        // 对 skeleton，若角色不同则拆块，保持颜色区分
        if (type === 'skeleton') {
          const role = currentData.wordRoles[idx];
          if (last.role && last.role === role) {
            last.tokens.push(word);
            last.indices.push(idx);
          } else {
            blocks.push({ type, tokens: [word], indices: [idx], role });
          }
        } else {
          last.tokens.push(word);
          last.indices.push(idx);
        }
      } else {
        const role = type === 'skeleton' ? currentData.wordRoles[idx] : undefined;
        blocks.push({ type, tokens: [word], indices: [idx], role });
      }
    });

    const joinTokens = (tokens: string[]) => {
      return tokens.reduce((acc, t, i) => {
        const isP = isPunctuation(t);
        const prevIsP = i > 0 ? isPunctuation(tokens[i - 1]) : true;
        const spacer = i > 0 && !isP && !prevIsP ? ' ' : '';
        return acc + spacer + t;
      }, '');
    };

    const getSkeletonClass = (role?: GrammarRole) => {
      const base = 'font-black underline decoration-2';
      switch (role) {
        case GrammarRole.SUBJECT:
          return `${base} ${isFresh ? 'decoration-emerald-500 text-emerald-900' : 'decoration-emerald-300 text-emerald-100'}`;
        case GrammarRole.PREDICATE:
        case GrammarRole.LINK_VERB:
          return `${base} ${isFresh ? 'decoration-sky-500 text-sky-900' : 'decoration-sky-300 text-sky-100'}`;
        case GrammarRole.OBJECT:
          return `${base} ${isFresh ? 'decoration-amber-500 text-amber-900' : 'decoration-amber-300 text-amber-100'}`;
        case GrammarRole.PREDICATIVE:
          return `${base} ${isFresh ? 'decoration-purple-500 text-purple-900' : 'decoration-purple-300 text-purple-100'}`;
        case GrammarRole.COMPLEMENT:
          return `${base} ${isFresh ? 'decoration-rose-500 text-rose-900' : 'decoration-rose-300 text-rose-100'}`;
        default:
          return `${base} ${isFresh ? 'decoration-emerald-500 text-emerald-900' : 'decoration-pink-500 text-pink-900'}`;
      }
    };

    const renderBlock = (block: Block, key: number) => {
      const content = joinTokens(block.tokens);
      switch (block.type) {
        case 'skeleton':
          return (
            <span key={key} className="inline-flex items-center gap-1">
              <span className={getSkeletonClass(block.role)}>
                {content}
              </span>
            </span>
          );
        case 'attribute':
          return (
            <span key={key} className={`inline-flex items-center ${isFresh ? 'text-sky-800' : 'text-blue-200'}`}>
              <span className="opacity-80">［</span>
              <span className="font-semibold">{content}</span>
              <span className="opacity-80">］</span>
            </span>
          );
        case 'adverbial':
          return (
            <span key={key} className={`inline-flex items-center ${isFresh ? 'text-amber-700' : 'text-amber-200'}`}>
              <span className="opacity-80">{'{'}</span>
              <span className="font-semibold">{content}</span>
              <span className="opacity-80">{'}'}</span>
            </span>
          );
        case 'attr-clause':
          return (
            <span key={key} className={`inline-flex items-center ${isFresh ? 'text-purple-700 italic' : 'text-purple-200 italic'}`}>
              <span className="opacity-80">[AC:</span>
              <span className="ml-1">{content}</span>
              <span className="opacity-80">]</span>
            </span>
          );
        case 'adv-clause':
          return (
            <span key={key} className={`inline-flex items-center ${isFresh ? 'text-rose-700 italic' : 'text-rose-200 italic'}`}>
              <span className="opacity-80">{'{ADV:'}</span>
              <span className="ml-1">{content}</span>
              <span className="opacity-80">{'}'}</span>
            </span>
          );
        case 'connective':
          return (
            <span key={key} className="inline-flex items-center text-gray-400 italic">
              {content}
            </span>
          );
        default:
          return (
            <span key={key} className="inline-flex items-center text-gray-800">
              {content}
            </span>
          );
      }
    };

    return (
      <div className="flex flex-wrap gap-2 items-center">
        {blocks.map((block, idx) => (
          <React.Fragment key={idx}>
            {renderBlock(block, idx)}
            {idx < blocks.length - 1 && <span className="text-gray-300">|</span>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const gameBg = isFresh
    ? 'bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50'
    : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50';

  const headerBg = isFresh
    ? 'bg-white/90 backdrop-blur-md border-emerald-200'
    : 'bg-white/80 backdrop-blur-md border-purple-200';

  const progressBar = isFresh
    ? 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400'
    : 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500';

  const levelBadge = (level: DifficultyLevel) => {
    if (isFresh) {
      return level === DifficultyLevel.BASIC ? 'bg-emerald-100 text-emerald-700' :
        level === DifficultyLevel.INTERMEDIATE ? 'bg-cyan-100 text-cyan-700' :
          'bg-sky-100 text-sky-700';
    } else {
      return level === DifficultyLevel.BASIC ? 'bg-green-100 text-green-700' :
        level === DifficultyLevel.INTERMEDIATE ? 'bg-orange-100 text-orange-700' :
          'bg-pink-100 text-pink-700';
    }
  };

  const phase1Bg = isFresh ? 'bg-emerald-500' : 'bg-pink-500';
  const phase2Bg = isFresh ? 'bg-teal-500' : 'bg-orange-500';
  const selectedBorder = isFresh ? 'border-emerald-500 bg-emerald-50/50' : 'border-pink-500 bg-pink-50/50';
  const selectedRadio = isFresh ? 'border-emerald-500 bg-emerald-500' : 'border-pink-500 bg-pink-500';
  const selectedText = isFresh ? 'text-emerald-700' : 'text-pink-700';

  return (
    <div className={`min-h-screen ${gameBg} pb-32`}>
      {/* Header */}
      <header className={`${headerBg} border-b-2 sticky top-0 z-50 shadow-sm`}>
        <div className="px-4 py-2">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <button
              onClick={returnToMenu}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition active:scale-95 flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-gray-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>

            {/* Progress Bar */}
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${progressBar} rounded-full transition-all duration-500 shadow-lg`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Level Badge */}
            {currentLevel && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex-shrink-0 ${levelBadge(currentLevel)}`}>
                {currentLevel}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Sentence Display - Sticky at top */}
        <div ref={stickySentenceRef} className={`sticky top-[48px] z-30 -mx-4 px-4 pt-3 pb-2 ${gameBg} border-b-2 ${isFresh ? 'border-emerald-200' : 'border-purple-200'} shadow-sm`}>
          <div className={`${isFresh ? 'bg-white/95' : 'bg-white/95'} backdrop-blur-md rounded-2xl p-3 shadow-lg border-2 ${isFresh ? 'border-emerald-200' : 'border-purple-200'}`}>
            <p className={`text-lg font-bold ${isFresh ? 'text-slate-800' : 'text-gray-800'} leading-relaxed text-center`}>
              {currentData.originalSentence}
            </p>
          </div>
        </div>

        {/* Phase 1: Structure Selection */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${phase1Bg} text-white flex items-center justify-center font-black text-sm`}>1</div>
            <h2 className={`text-xl font-black ${isFresh ? 'text-slate-800' : 'text-gray-800'}`}>选择句子结构</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {SENTENCE_STRUCTURES.map(st => (
              <label
                key={st}
                className={`
                  relative flex items-center p-4 bg-white/90 backdrop-blur-sm rounded-2xl border-2 cursor-pointer transition-all active:scale-95
                  ${selectedStructure === st
                    ? `${selectedBorder} shadow-lg`
                    : 'border-gray-200 hover:border-gray-300'}
                `}
              >
                <input
                  type="radio"
                  name="structure"
                  value={st}
                  checked={selectedStructure === st}
                  onChange={() => !submitted && setSelectedStructure(st)}
                  disabled={submitted}
                  className="hidden"
                />
                <div className={`
                  w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center
                  ${selectedStructure === st ? selectedRadio : 'border-gray-300 bg-white'}
                `}>
                  {selectedStructure === st && <div className="w-3 h-3 bg-white rounded-full" />}
                </div>
                <span className={`font-bold text-base ${selectedStructure === st ? selectedText : (isFresh ? 'text-slate-700' : 'text-gray-700')}`}>
                  {st}
                </span>
              </label>
            ))}
          </div>

          {submitted && (
            <div className={`p-4 rounded-2xl border-2 ${selectedStructure === currentData.structureType
              ? (isFresh ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-green-100 border-green-400 text-green-800')
              : (isFresh ? 'bg-rose-100 border-rose-400 text-rose-800' : 'bg-red-100 border-red-400 text-red-800')
              }`}>
              {selectedStructure === currentData.structureType ? (
                <span className="font-bold flex items-center gap-2">
                  <span className="text-xl">✓</span> Correct!
                </span>
              ) : (
                <span className="font-bold">
                  Correct answer: {currentData.structureType}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Phase 2: Combined Skeleton & Word Classification */}
        {selectedStructure && (
          <section ref={phase2SectionRef} className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${phase2Bg} text-white flex items-center justify-center font-black text-sm`}>2</div>
              <h2 className={`text-xl font-black ${isFresh ? 'text-slate-800' : 'text-gray-800'}`}>确定 Skeleton 并定位其他单词</h2>
            </div>

            {/* Word Bank */}
            <div className="min-h-[120px] bg-white/90 backdrop-blur-sm rounded-2xl p-4 border-2 border-purple-200 shadow-lg">
              {unassignedIndices.length === 0 && !submitted && (
                <div className="flex items-center justify-center h-full text-gray-400 font-bold">
                  ✨ All sorted!
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                {currentData.words.map((word, idx) => {
                  const isInSkeleton = Object.values(skeletonSlots).flat().includes(idx);
                  const isAssigned = assignedRoles[idx];

                  // Skip if already assigned or in skeleton (will be shown in assigned areas)
                  if (isAssigned || isInSkeleton) {
                    // If this word is followed by punctuation, check if we should merge
                    if (idx < currentData.words.length - 1 && isPunctuation(currentData.words[idx + 1])) {
                      const nextIdx = idx + 1;
                      const nextInSkeleton = Object.values(skeletonSlots).flat().includes(nextIdx);
                      const nextAssigned = assignedRoles[nextIdx];
                      // If punctuation is also assigned/in skeleton, skip it here (will be shown in assigned areas)
                      if (nextAssigned || nextInSkeleton) {
                        return null;
                      }
                    }
                    return null;
                  }

                  // Skip punctuation if previous word is not assigned/in skeleton (will be merged with previous word)
                  if (isPunctuation(word) && idx > 0) {
                    const prevIdx = idx - 1;
                    const prevInSkeleton = Object.values(skeletonSlots).flat().includes(prevIdx);
                    const prevAssigned = assignedRoles[prevIdx];
                    if (!prevAssigned && !prevInSkeleton) {
                      // Skip this punctuation, it will be shown merged with previous word
                      return null;
                    }
                  }

                  // Check if next word is punctuation and not assigned/in skeleton, merge them
                  if (idx < currentData.words.length - 1 && isPunctuation(currentData.words[idx + 1])) {
                    const nextIdx = idx + 1;
                    const nextInSkeleton = Object.values(skeletonSlots).flat().includes(nextIdx);
                    const nextAssigned = assignedRoles[nextIdx];
                    if (!nextAssigned && !nextInSkeleton) {
                      // Merge word with punctuation
                      return (
                        <WordPill
                          key={idx}
                          index={idx}
                          text={`${word}${currentData.words[nextIdx]}`}
                          isSelected={shouldHighlight(idx) || shouldHighlight(nextIdx)}
                          onClick={() => {
                            if (!submitted) {
                              handleSortingClick(idx);
                              handleSkeletonClick(idx);
                            }
                          }}
                          draggable={!submitted}
                          onDragStart={onWordDragStart}
                        />
                      );
                    }
                  }

                  // Show word alone
                  return (
                    <WordPill
                      key={idx}
                      index={idx}
                      text={word}
                      isSelected={shouldHighlight(idx)}
                      onClick={() => {
                        if (!submitted) {
                          handleSortingClick(idx);
                          handleSkeletonClick(idx);
                        }
                      }}
                      draggable={!submitted}
                      onDragStart={onWordDragStart}
                    />
                  );
                })}
              </div>
            </div>

            {/* All Word Roles - Unified Style */}
            <div className="space-y-2">
              {/* Skeleton Slots */}
              {SKELETON_CONFIG[selectedStructure].map(slot => {
                const slotIndices = skeletonSlots[slot] || [];

                return (
                  <div
                    key={slot}
                    onDragOver={onBasketDragOver}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (submitted) return;
                      const indices = draggedIndicesRef.current;
                      if (indices.length > 0) {
                        const skeletonIndicesSet = new Set(Object.values(skeletonSlots).flat());
                        const validIndices = indices.filter(idx => !skeletonIndicesSet.has(idx) && !assignedRoles[idx]);
                        if (validIndices.length > 0) {
                          setSkeletonSlots(prev => {
                            const currentList = prev[slot] || [];
                            const newIndices = validIndices.filter(idx => !currentList.includes(idx));
                            return {
                              ...prev,
                              [slot]: [...currentList, ...newIndices].sort((a, b) => a - b)
                            };
                          });
                          setSortingSelection([]);
                          setSkeletonSelection([]);
                          draggedIndicesRef.current = [];
                        }
                      }
                    }}
                    onClick={() => !submitted && addToSkeletonSlot(slot)}
                    className={`
                      ${isFresh ? 'bg-gradient-to-br from-teal-50 to-emerald-50' : 'bg-gradient-to-br from-orange-50 to-amber-50'} backdrop-blur-sm rounded-xl p-3 border-2 transition-all flex items-center gap-3
                      ${submitted ? 'border-gray-200' : 'cursor-pointer active:scale-[0.98]'}
                      ${slotIndices.length > 0
                        ? (isFresh ? 'border-teal-400 shadow-md' : 'border-orange-400 shadow-md')
                        : (isFresh ? 'border-dashed border-teal-300 min-h-[56px]' : 'border-dashed border-orange-300 min-h-[56px]')}
                    `}
                  >
                    <div className={`text-xs font-black ${isFresh ? 'text-teal-600' : 'text-orange-600'} uppercase tracking-wider whitespace-nowrap min-w-[80px]`}>
                      {slot}
                    </div>
                    <div className="flex flex-wrap gap-1.5 flex-grow items-center">
                      {slotIndices.length > 0 ? (
                        slotIndices.map(idx => {
                          // Skip punctuation if it's merged with previous word
                          if (idx > 0 && isPunctuation(currentData.words[idx])) {
                            const prevIdx = idx - 1;
                            if (skeletonSlots[slot]?.includes(prevIdx)) {
                              // Skip, punctuation will be shown with previous word
                              return null;
                            }
                          }

                          // Check if next word is punctuation and also in same slot, merge them
                          let displayText = currentData.words[idx];
                          if (idx < currentData.words.length - 1 && isPunctuation(currentData.words[idx + 1])) {
                            const nextIdx = idx + 1;
                            if (skeletonSlots[slot]?.includes(nextIdx)) {
                              displayText = `${currentData.words[idx]}${currentData.words[nextIdx]}`;
                            }
                          }

                          return (
                            <WordPill
                              key={idx}
                              index={idx}
                              text={displayText}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!submitted) {
                                  removeFromSkeletonSlot(slot, idx);
                                }
                              }}
                              draggable={false}
                            />
                          );
                        }).filter(Boolean)
                      ) : (
                        <span className="text-gray-400 text-xs font-medium">Tap to assign selected words</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Other Word Roles */}
              {displayOptions
                .filter(role => {
                  // Filter out skeleton roles that are already shown above
                  const skeletonSlotsList = SKELETON_CONFIG[selectedStructure];
                  // Map skeleton slot names to grammar roles
                  const slotToRoleMap: Record<string, string[]> = {
                    '主语': ['主语'],
                    '谓语': ['谓语'],
                    '宾语': ['宾语'],
                    '系动词': ['系动词'],
                    '表语': ['表语'],
                    '间接宾语': ['宾语'],
                    '直接宾语': ['宾语'],
                    '宾语补足语': ['补语']
                  };

                  // Check if this role is used in skeleton slots
                  const isSkeletonRole = skeletonSlotsList.some(slot => {
                    const roles = slotToRoleMap[slot] || [];
                    return roles.includes(role);
                  });

                  // Only show roles that are actually used in the current sentence
                  const rolesInSentence = new Set(Object.values(currentData.wordRoles));
                  const isUsedInSentence = rolesInSentence.has(role as GrammarRole);

                  return !isSkeletonRole && isUsedInSentence;
                })
                .map(role => {
                  const assignedIndices = currentData.words
                    .map((_, idx) => idx)
                    .filter(idx => assignedRoles[idx] === role);

                  return (
                    <div
                      key={role}
                      onDragOver={onBasketDragOver}
                      onDrop={(e) => onBasketDrop(e, role as GrammarRole)}
                      onClick={() => !submitted && assignSelectedToRole(role as GrammarRole)}
                      className={`
                          ${isFresh ? 'bg-gradient-to-br from-cyan-50 to-sky-50' : 'bg-gradient-to-br from-purple-50 to-blue-50'} backdrop-blur-sm rounded-xl p-3 border-2 transition-all flex items-center gap-3
                          ${submitted ? 'border-gray-200' : 'cursor-pointer active:scale-[0.98]'}
                          ${assignedIndices.length > 0
                          ? (isFresh ? 'border-cyan-400 shadow-md' : 'border-purple-400 shadow-md')
                          : (isFresh ? 'border-dashed border-cyan-300 min-h-[56px]' : 'border-dashed border-purple-300 min-h-[56px]')}
                        `}
                    >
                      <div className={`text-xs font-black ${isFresh ? 'text-cyan-600' : 'text-purple-600'} uppercase tracking-wider whitespace-nowrap min-w-[80px]`}>
                        {role}
                      </div>
                      <div className="flex flex-wrap gap-1.5 flex-grow items-center">
                        {assignedIndices.length > 0 ? (
                          assignedIndices.map(idx => {
                            // Skip punctuation if it's merged with previous word
                            if (idx > 0 && isPunctuation(currentData.words[idx])) {
                              const prevIdx = idx - 1;
                              if (assignedRoles[prevIdx] === role) {
                                // Skip, punctuation will be shown with previous word
                                return null;
                              }
                            }

                            // Check if next word is punctuation and also assigned to same role, merge them
                            let displayText = currentData.words[idx];
                            let displayIndices = [idx];
                            if (idx < currentData.words.length - 1 && isPunctuation(currentData.words[idx + 1])) {
                              const nextIdx = idx + 1;
                              if (assignedRoles[nextIdx] === role) {
                                displayText = `${currentData.words[idx]}${currentData.words[nextIdx]}`;
                                displayIndices = [idx, nextIdx];
                              }
                            }

                            const isCorrect = getIsCorrect(idx, currentData.wordRoles[idx]);
                            return (
                              <WordPill
                                key={idx}
                                index={idx}
                                text={displayText}
                                assignedRole={role as GrammarRole}
                                correctRoleLabel={currentData.wordRoles[idx]}
                                isCorrect={isCorrect}
                                onClick={() => handleSortingClick(idx)}
                                draggable={false}
                              />
                            );
                          }).filter(Boolean)
                        ) : (
                          <span className="text-gray-400 text-xs font-medium">Tap to assign selected words</span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Results */}
        {showResult && resultMeta && (
          <div ref={resultRef} className={`${isFresh ? 'bg-gradient-to-br from-emerald-500 to-cyan-500' : 'bg-gradient-to-br from-purple-600 to-pink-600'} text-white rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in`}>
            <h3 className="text-2xl font-black flex items-center gap-2">
              <span>🎯</span> Results
            </h3>

            <div className="space-y-4">
              {/* Section A: 结果判定 */}
              <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-xs font-black uppercase mb-2 opacity-80">A. 结果判定</div>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-black
                    ${resultMeta.status === 'perfect' ? 'bg-emerald-300 text-emerald-900'
                      : resultMeta.status === 'partial' ? 'bg-amber-200 text-amber-800'
                        : 'bg-rose-200 text-rose-800'}`}>
                    {resultMeta.status === 'perfect' ? '✓' : resultMeta.status === 'partial' ? '≈' : '✕'}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-lg font-black">
                      {resultMeta.status === 'perfect' ? '完全正确' : resultMeta.status === 'partial' ? '部分正确' : '需要改进'}
                    </div>
                    <div className="text-sm font-medium opacity-90">
                      结构 {resultMeta.structureCorrect ? '正确' : '错误'} · 角色准确率 {resultMeta.roleAccuracy}% ({resultMeta.correctCount}/{resultMeta.totalCount})
                    </div>
                  </div>
                  {pointsInfo && (
                    <div className="text-right shrink-0">
                      <div className="text-3xl font-black text-amber-300 leading-none">+{pointsInfo.earned}</div>
                      <div className="text-[10px] font-bold uppercase opacity-80 mt-0.5">积分</div>
                      {pointsInfo.perfect && <div className="text-[10px] font-bold text-amber-200">⭐ 完美 ×1.5</div>}
                      {pointsInfo.milestoneBonus > 0 && <div className="text-[10px] font-bold text-amber-200">🎯 里程碑 +{pointsInfo.milestoneBonus}</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Section B: 原句标注解析 */}
              <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm space-y-3">
                <div className="text-xs font-black uppercase opacity-80">B. 原句标注解析</div>
                <div className={`${isFresh ? 'bg-white text-slate-800' : 'bg-white text-gray-800'} rounded-2xl p-4 border-2 ${isFresh ? 'border-emerald-200' : 'border-purple-200'} leading-relaxed space-x-1 flex flex-wrap`}>
                  {renderAnnotatedSentence()}
                </div>
              </div>

              {/* Section C: Explanation */}
              <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-xs font-black uppercase mb-3 opacity-80">C. Explanation</div>
                <div className="space-y-2.5">
                  {(currentData.explanation ?? '').split('。').filter(s => s.trim()).map((sentence, idx) => {
                    const trimmed = sentence.trim();
                    if (!trimmed) return null;

                    const isMainStructure = trimmed.includes('主干') || trimmed.includes('主谓') || trimmed.includes('主系表');
                    const isClause = trimmed.includes('从句');
                    const isModifier = trimmed.includes('修饰') || trimmed.includes('定语') || trimmed.includes('状语');

                    return (
                      <div
                        key={idx}
                        className={`
                          text-base font-medium leading-relaxed pl-3 border-l-2
                          ${isMainStructure
                            ? 'border-orange-300 bg-orange-500/10'
                            : isClause
                              ? 'border-purple-300 bg-purple-500/10'
                              : isModifier
                                ? 'border-blue-300 bg-blue-500/10'
                                : 'border-white/30'}
                        `}
                      >
                        {trimmed}。
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section D: Skeleton */}
              <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-xs font-black uppercase mb-2 opacity-80">D. Skeleton</div>
                <div className="flex flex-wrap gap-2">
                  {currentData.skeletonIndices.map(idx => (
                    <span key={idx} className="bg-white/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-bold">
                      {currentData.words[idx]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <footer className={`
        fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t-2 ${isFresh ? 'border-emerald-200' : 'border-purple-200'} p-4 z-50 transition-transform duration-300
        ${selectedStructure ? 'translate-y-0' : 'translate-y-full'}
      `}>
        <div className="max-w-2xl mx-auto">
          {!submitted ? (
            <button
              onClick={checkResults}
              disabled={!selectedStructure}
              className={`
                w-full text-white text-lg font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-wider
                ${selectedStructure
                  ? (isFresh ? 'bg-gradient-to-r from-emerald-400 to-cyan-500' : 'bg-gradient-to-r from-purple-500 to-pink-500')
                  : 'bg-gray-300 cursor-not-allowed'}
              `}
            >
              Check Answer ✓
            </button>
          ) : (
            <button
              onClick={() => {
                scrollToTop();
                initGame(currentLevel!);
              }}
              className={`w-full ${isFresh ? 'bg-gradient-to-r from-teal-400 to-emerald-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'} text-white text-lg font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform uppercase tracking-wider`}
            >
              Next Challenge →
            </button>
          )}
        </div>
      </footer>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      {showHistory && <HistoryView onClose={() => setShowHistory(false)} />}
    </div>
  );
};

export default App;
