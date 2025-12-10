import { Theme } from './types';

export interface ThemeConfig {
  name: string;
  displayName: string;
  colors: {
    // 背景渐变
    background: {
      home: string;           // 首页背景
      game: string;           // 游戏页面背景
      loading: string;        // 加载页面背景
    };
    // 主色调
    primary: {
      main: string;           // 主色
      light: string;          // 浅色
      dark: string;           // 深色
      text: string;           // 文字色
    };
    // 次要色调
    secondary: {
      main: string;
      light: string;
      dark: string;
      text: string;
    };
    // Level 卡片颜色
    levels: {
      basic: {
        gradient: string;
        border: string;
        text: string;
        subtitle: string;
      };
      intermediate: {
        gradient: string;
        border: string;
        text: string;
        subtitle: string;
      };
      advanced: {
        gradient: string;
        border: string;
        text: string;
        subtitle: string;
      };
    };
    // UI 元素
    ui: {
      card: string;           // 卡片背景
      cardBorder: string;    // 卡片边框
      header: string;        // 头部背景
      headerBorder: string;  // 头部边框
      button: {
        primary: string;     // 主要按钮
        secondary: string;   // 次要按钮
        disabled: string;    // 禁用按钮
      };
      progress: string;      // 进度条
      skeleton: {
        bg: string;          // Skeleton 背景
        border: string;      // Skeleton 边框
        text: string;         // Skeleton 文字
      };
      wordRole: {
        bg: string;          // 单词角色背景
        border: string;      // 单词角色边框
        text: string;         // 单词角色文字
      };
      result: {
        bg: string;          // 结果背景
        text: string;        // 结果文字
      };
    };
    // 状态颜色
    status: {
      success: string;       // 成功
      error: string;         // 错误
      warning: string;      // 警告
      info: string;         // 信息
    };
    // 文字颜色
    text: {
      primary: string;       // 主要文字
      secondary: string;     // 次要文字
      muted: string;         // 弱化文字
    };
  };
}

export const themes: Record<Theme, ThemeConfig> = {
  [Theme.DEFAULT]: {
    name: 'default',
    displayName: '活力主题',
    colors: {
      background: {
        home: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50',
        game: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
        loading: 'bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50',
      },
      primary: {
        main: 'purple-600',
        light: 'purple-100',
        dark: 'purple-700',
        text: 'purple-600',
      },
      secondary: {
        main: 'pink-600',
        light: 'pink-100',
        dark: 'pink-700',
        text: 'pink-600',
      },
      levels: {
        basic: {
          gradient: 'from-green-400 to-emerald-500',
          border: 'border-green-600',
          text: 'text-white',
          subtitle: 'text-green-100',
        },
        intermediate: {
          gradient: 'from-yellow-400 to-orange-500',
          border: 'border-orange-600',
          text: 'text-white',
          subtitle: 'text-orange-100',
        },
        advanced: {
          gradient: 'from-pink-500 to-rose-600',
          border: 'border-rose-700',
          text: 'text-white',
          subtitle: 'text-pink-100',
        },
      },
      ui: {
        card: 'bg-white/80 backdrop-blur-sm',
        cardBorder: 'border-purple-200',
        header: 'bg-white/80 backdrop-blur-md',
        headerBorder: 'border-purple-200',
        button: {
          primary: 'from-purple-500 to-pink-500',
          secondary: 'from-green-500 to-emerald-500',
          disabled: 'bg-gray-300',
        },
        progress: 'from-purple-500 via-pink-500 to-orange-500',
        skeleton: {
          bg: 'from-orange-50 to-amber-50',
          border: 'border-orange-400',
          text: 'text-orange-600',
        },
        wordRole: {
          bg: 'from-purple-50 to-blue-50',
          border: 'border-purple-400',
          text: 'text-purple-600',
        },
        result: {
          bg: 'from-purple-600 to-pink-600',
          text: 'text-white',
        },
      },
      status: {
        success: 'bg-green-100 border-green-400 text-green-800',
        error: 'bg-red-100 border-red-400 text-red-800',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-800',
        info: 'bg-blue-100 border-blue-400 text-blue-800',
      },
      text: {
        primary: 'text-gray-800',
        secondary: 'text-gray-600',
        muted: 'text-gray-400',
      },
    },
  },
  [Theme.FRESH]: {
    name: 'fresh',
    displayName: '小清新',
    colors: {
      background: {
        home: 'bg-gradient-to-br from-emerald-50 via-cyan-50 to-sky-50',
        game: 'bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50',
        loading: 'bg-gradient-to-br from-mint-50 via-cyan-50 to-sky-50',
      },
      primary: {
        main: 'emerald-500',
        light: 'emerald-100',
        dark: 'emerald-600',
        text: 'emerald-600',
      },
      secondary: {
        main: 'cyan-500',
        light: 'cyan-100',
        dark: 'cyan-600',
        text: 'cyan-600',
      },
      levels: {
        basic: {
          gradient: 'from-emerald-300 to-teal-400',
          border: 'border-emerald-500',
          text: 'text-white',
          subtitle: 'text-emerald-50',
        },
        intermediate: {
          gradient: 'from-cyan-300 to-sky-400',
          border: 'border-cyan-500',
          text: 'text-white',
          subtitle: 'text-cyan-50',
        },
        advanced: {
          gradient: 'from-sky-300 to-blue-400',
          border: 'border-sky-500',
          text: 'text-white',
          subtitle: 'text-sky-50',
        },
      },
      ui: {
        card: 'bg-white/90 backdrop-blur-sm',
        cardBorder: 'border-emerald-200',
        header: 'bg-white/90 backdrop-blur-md',
        headerBorder: 'border-emerald-200',
        button: {
          primary: 'from-emerald-400 to-cyan-500',
          secondary: 'from-teal-400 to-emerald-500',
          disabled: 'bg-gray-300',
        },
        progress: 'from-emerald-400 via-cyan-400 to-sky-400',
        skeleton: {
          bg: 'from-teal-50 to-emerald-50',
          border: 'border-teal-400',
          text: 'text-teal-600',
        },
        wordRole: {
          bg: 'from-cyan-50 to-sky-50',
          border: 'border-cyan-400',
          text: 'text-cyan-600',
        },
        result: {
          bg: 'from-emerald-500 to-cyan-500',
          text: 'text-white',
        },
      },
      status: {
        success: 'bg-emerald-100 border-emerald-400 text-emerald-800',
        error: 'bg-rose-100 border-rose-400 text-rose-800',
        warning: 'bg-amber-100 border-amber-400 text-amber-800',
        info: 'bg-cyan-100 border-cyan-400 text-cyan-800',
      },
      text: {
        primary: 'text-slate-700',
        secondary: 'text-slate-600',
        muted: 'text-slate-400',
      },
    },
  },
};
