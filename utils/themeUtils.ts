import { ThemeConfig } from '../themes';
import { DifficultyLevel } from '../types';

export const getThemeClasses = (themeConfig: ThemeConfig) => {
  return {
    // 背景
    background: {
      home: themeConfig.colors.background.home,
      game: themeConfig.colors.background.game,
      loading: themeConfig.colors.background.loading,
    },
    // UI 元素
    card: themeConfig.colors.ui.card,
    cardBorder: themeConfig.colors.ui.cardBorder,
    header: themeConfig.colors.ui.header,
    headerBorder: themeConfig.colors.ui.headerBorder,
    // 按钮
    buttonPrimary: `bg-gradient-to-r ${themeConfig.colors.ui.button.primary}`,
    buttonSecondary: `bg-gradient-to-r ${themeConfig.colors.ui.button.secondary}`,
    buttonDisabled: themeConfig.colors.ui.button.disabled,
    // 进度条
    progress: `bg-gradient-to-r ${themeConfig.colors.ui.progress}`,
    // Skeleton
    skeleton: {
      bg: `bg-gradient-to-br ${themeConfig.colors.ui.skeleton.bg}`,
      border: themeConfig.colors.ui.skeleton.border,
      text: themeConfig.colors.ui.skeleton.text,
    },
    // Word Role
    wordRole: {
      bg: `bg-gradient-to-br ${themeConfig.colors.ui.wordRole.bg}`,
      border: themeConfig.colors.ui.wordRole.border,
      text: themeConfig.colors.ui.wordRole.text,
    },
    // 结果
    result: {
      bg: `bg-gradient-to-br ${themeConfig.colors.ui.result.bg}`,
      text: themeConfig.colors.ui.result.text,
    },
    // 状态
    status: themeConfig.colors.status,
    // 文字
    text: themeConfig.colors.text,
    // Level 配置
    levels: themeConfig.colors.levels,
  };
};

export const getLevelButtonClasses = (themeConfig: ThemeConfig, level: DifficultyLevel) => {
  const levelConfig = themeConfig.colors.levels[level.toLowerCase() as keyof typeof themeConfig.colors.levels];
  return {
    button: `w-full bg-gradient-to-r ${levelConfig.gradient} ${levelConfig.text} p-6 rounded-3xl shadow-xl border-2 ${levelConfig.border} active:scale-95 transition-all transform hover:shadow-2xl`,
    subtitle: levelConfig.subtitle,
  };
};
