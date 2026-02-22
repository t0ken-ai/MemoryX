const translations = {
  en: {
    nav: {
      features: "Features",
      agentInstall: "Agent Install",
      sdkGuide: "SDK Guide",
      apiDocs: "API Docs",
      pricing: "Pricing",
      login: "Login",
      register: "Sign Up Free",
      dashboard: "Dashboard"
    },
    hero: {
      badge: "v1.0 Released — AI Agents Auto-Register",
      title1: "Give Your AI Agent",
      title2: "Persistent Memory",
      subtitle: "MemoryX is a free cognitive memory engine that enables AI to truly remember every conversation and continuously learn and grow",
      cta1: "Get Started Free",
      cta2: "AI Agent Integration",
      stat1: "100%",
      stat1Label: "Open Source",
      stat2: "AES+",
      stat2Label: "Encrypted Storage",
      stat3: "MCP",
      stat3Label: "Protocol Support"
    },
    features: {
      title: "Powerful Features,",
      titleHighlight: "Simple Experience",
      subtitle: "Everything is designed with simplicity at its core, letting you focus on creating value, not configuring tools",
      free: {
        title: "Free for Daily Use",
        desc: "Free tier includes 100 daily cloud searches and unlimited memory storage. Upgrade to PRO for unlimited searches and priority processing."
      },
      autoRegister: {
        title: "AI Agent Auto-Register",
        desc: "AI Agents can automatically register and get their own memory space. Machine fingerprint isolation, Agents on the same device share memory, cross-device data isolation."
      },
      privacy: {
        title: "Privacy First",
        desc: "All memory data is encrypted with AES-256 before storage. You have full control over your data, with the option to delete at any time."
      }
    },
    quickStart: {
      title: "Quick Start",
      subtitle: "Get started in minutes with just a few commands",
      step1Title: "Install Plugin",
      step1Desc: "Send the command to your AI Agent",
      step2Title: "Auto Register",
      step2Desc: "Agent automatically registers and gets API Key",
      step3Title: "Start Using",
      step3Desc: "Memory capabilities enabled automatically"
    },
    pricing: {
      title: "Simple Pricing",
      subtitle: "Free tier covers daily use, PRO for heavy users",
      free: {
        name: "Free",
        price: "$0",
        period: "forever",
        feature1: "100 searches/day",
        feature2: "Unlimited memory storage",
        feature3: "AES-256 encryption",
        feature4: "Basic support",
        cta: "Get Started"
      },
      pro: {
        name: "PRO",
        price: "$9.99",
        period: "/month",
        feature1: "Unlimited searches",
        feature2: "Priority processing",
        feature3: "Advanced analytics",
        feature4: "Priority support",
        cta: "Upgrade"
      }
    },
    footer: {
      product: "Product",
      developers: "Developers",
      company: "Company",
      features: "Features",
      pricing: "Pricing",
      docs: "Documentation",
      apiRef: "API Reference",
      sdk: "SDK Guide",
      about: "About",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      copyright: "© 2026 MemoryX. All rights reserved."
    },
    sdk: {
      heroBadge: "SDK Integration Guide",
      heroTitle: "Integrate",
      heroTitleHighlight: "MemoryX",
      heroTitleEnd: "into Your App",
      heroSubtitle: "Use Node.js or Python SDK to add memory capabilities to your app in minutes",
      nodejsTitle: "Node.js SDK",
      nodejsSubtitle: "TypeScript Support",
      pythonTitle: "Python SDK",
      pythonSubtitle: "Python 3.8+",
      howItWorks: "How It Works",
      step0_1: "SDK initialization",
      step0_1b: "without API Key",
      step0_2: "Call",
      step0_2b: "to auto-register and get",
      step0_3: "Important",
      step0_3b: ": Save the API Key to your business system (database/config file)",
      step0_4: "Next time, initialize with saved API Key, memory data will be automatically linked",
      tip: "Memory data follows the API Key. The same API Key can access the same memories on any device.",
      install: "Install",
      firstUse: "First Time Use - Auto Register for API Key",
      subsequentUse: "Subsequent Use - With Saved API Key",
      mainMethods: "Main Methods",
      methodAutoRegister: "Auto register to get API Key",
      methodSendMemories: "Send memories (single/batch)",
      methodSearch: "Semantic search memories",
      methodList: "Get memory list",
      methodDelete: "Delete memory"
    },
    agent: {
      heroBadge: "Agent Auto Install",
      heroTitle: "Let AI Agent",
      heroTitleHighlight: "Auto Install Plugin",
      heroSubtitle: "Copy the command below and send to your Agent to complete installation automatically.",
      heroSubtitleSupport: "Supports OpenClaw and VS Code",
      openclawTab: "OpenClaw Plugin",
      vscodeTab: "VS Code Plugin",
      openclawFeatures: {
        title: "OpenClaw Plugin Features",
        autoRecall: {
          title: "Auto Recall",
          desc: "Auto search relevant memories before conversation"
        },
        autoSave: {
          title: "Auto Save",
          desc: "Auto save to MemoryX after conversation"
        },
        functionCalling: {
          title: "Function Calling",
          desc: "LLM can actively call memory tools"
        }
      },
      vscodeFeatures: {
        title: "VS Code Plugin Features",
        atMemory: {
          title: "@memoryx",
          desc: "Use directly in Chat"
        },
        autoSync: {
          title: "Auto Sync",
          desc: "Auto conversation collection and recall"
        },
        zeroConfig: {
          title: "Zero Config",
          desc: "Auto register, ready to use"
        }
      },
      step1: "Send install command to Agent",
      step2: "Config (Optional)",
      step3: "Function Calling Tools",
      tool: "Tool",
      function: "Function",
      trigger: "Trigger Scenario",
      recall: "Search memories",
      store: "Save memory",
      list: "List memories",
      forget: "Delete memory",
      usage: "Usage",
      example: "Example",
      relatedMemories: "Related Memories:",
      conversationCollected: "Conversation collected",
      messagesInQueue: "messages in queue",
      manualInstall: "Manual Install (Alternative)",
      howItWorks: "How It Works",
      howItWorksSubtitle: "All plugins share the same backend, memories sync automatically",
      cloudStorage: "Cloud Memory Storage",
      autoCategorize: "Auto Categorize",
      semanticSearch: "Semantic Search",
      linkedMemories: "Linked Memories",
      ctaTitle: "View Dashboard After Install",
      ctaSubtitle: "All Agent memory data can be viewed and managed in the dashboard",
      ctaButton: "Go to Dashboard"
    }
  },
  zh: {
    nav: {
      features: "功能",
      agentInstall: "Agent 安装",
      sdkGuide: "SDK 接入",
      apiDocs: "API 文档",
      pricing: "定价",
      login: "登录",
      register: "免费注册",
      dashboard: "管理后台"
    },
    hero: {
      badge: "v1.0 现已发布 — AI Agents 自动注册",
      title1: "为你的 AI Agent",
      title2: "注入持久记忆",
      subtitle: "MemoryX 是免费的认知记忆引擎，让 AI 真正记住每一次对话，持续学习成长",
      cta1: "免费注册使用",
      cta2: "AI Agent 接入",
      stat1: "100%",
      stat1Label: "开源可审计",
      stat2: "AES+",
      stat2Label: "加密存储",
      stat3: "MCP",
      stat3Label: "协议支持"
    },
    features: {
      title: "强大功能，",
      titleHighlight: "简洁体验",
      subtitle: "一切设计都以简单为核心，让你专注于创造价值，而非配置工具",
      free: {
        title: "免费满足日常使用",
        desc: "免费版每日 100 次云搜索，无限记忆存储。升级 PRO 解锁无限搜索和优先处理，适合重度用户。"
      },
      autoRegister: {
        title: "AI Agent 自动注册",
        desc: "AI Agents 可以自动注册并获取专属记忆空间。机器指纹隔离，同一设备上的 Agents 共享记忆，跨设备数据隔离。"
      },
      privacy: {
        title: "隐私优先",
        desc: "所有记忆数据在存储前都经过 AES-256 加密。你完全掌控自己的数据，随时可以删除。"
      }
    },
    quickStart: {
      title: "快速开始",
      subtitle: "只需几个命令，几分钟即可开始使用",
      step1Title: "安装插件",
      step1Desc: "发送命令给你的 AI Agent",
      step2Title: "自动注册",
      step2Desc: "Agent 自动注册并获取 API Key",
      step3Title: "开始使用",
      step3Desc: "记忆能力自动启用"
    },
    pricing: {
      title: "简单定价",
      subtitle: "免费版覆盖日常使用，PRO 适合重度用户",
      free: {
        name: "免费版",
        price: "$0",
        period: "永久",
        feature1: "100 次/日搜索",
        feature2: "无限记忆存储",
        feature3: "AES-256 加密",
        feature4: "基础支持",
        cta: "开始使用"
      },
      pro: {
        name: "PRO",
        price: "$9.99",
        period: "/月",
        feature1: "无限搜索",
        feature2: "优先处理",
        feature3: "高级分析",
        feature4: "优先支持",
        cta: "升级"
      }
    },
    footer: {
      product: "产品",
      developers: "开发者",
      company: "公司",
      features: "功能",
      pricing: "定价",
      docs: "文档",
      apiRef: "API 参考",
      sdk: "SDK 指南",
      about: "关于",
      privacy: "隐私政策",
      terms: "服务条款",
      copyright: "© 2026 MemoryX. 保留所有权利。"
    },
    sdk: {
      heroBadge: "SDK 接入指南",
      heroTitle: "将",
      heroTitleHighlight: "MemoryX",
      heroTitleEnd: "集成到你的应用",
      heroSubtitle: "使用 Node.js 或 Python SDK，几分钟内为你的应用添加记忆能力",
      nodejsTitle: "Node.js SDK",
      nodejsSubtitle: "TypeScript 支持",
      pythonTitle: "Python SDK",
      pythonSubtitle: "Python 3.8+",
      howItWorks: "工作原理",
      step0_1: "SDK 初始化时",
      step0_1b: "无需 API Key",
      step0_2: "调用",
      step0_2b: "自动注册，获取",
      step0_3: "重要",
      step0_3b: "：将 API Key 保存到你的业务系统（数据库/配置文件）",
      step0_4: "下次使用时，用保存的 API Key 初始化客户端，记忆数据会自动关联",
      tip: "记忆数据跟着 API Key 走。同一个 API Key 在任何设备上都能访问相同的记忆。",
      install: "安装",
      firstUse: "首次使用 - 自动注册获取 API Key",
      subsequentUse: "后续使用 - 用保存的 API Key",
      mainMethods: "主要方法",
      methodAutoRegister: "自动注册获取 API Key",
      methodSendMemories: "发送记忆（单条/批量）",
      methodSearch: "语义搜索记忆",
      methodList: "获取记忆列表",
      methodDelete: "删除记忆"
    },
    agent: {
      heroBadge: "Agent 自动安装",
      heroTitle: "让 AI Agent",
      heroTitleHighlight: "自动安装插件",
      heroSubtitle: "复制下方命令，发送给您的 Agent，即可自动完成安装。",
      heroSubtitleSupport: "支持 OpenClaw 和 VS Code",
      openclawTab: "OpenClaw 插件",
      vscodeTab: "VS Code 插件",
      openclawFeatures: {
        title: "OpenClaw 插件功能",
        autoRecall: {
          title: "自动召回",
          desc: "对话前自动搜索相关记忆"
        },
        autoSave: {
          title: "自动保存",
          desc: "对话后自动保存到 MemoryX"
        },
        functionCalling: {
          title: "Function Calling",
          desc: "LLM 可主动调用记忆工具"
        }
      },
      vscodeFeatures: {
        title: "VS Code 插件功能",
        atMemory: {
          title: "@memoryx",
          desc: "在 Chat 中直接使用"
        },
        autoSync: {
          title: "自动同步",
          desc: "对话自动采集和召回"
        },
        zeroConfig: {
          title: "零配置",
          desc: "自动注册，开箱即用"
        }
      },
      step1: "给 Agent 发送安装命令",
      step2: "配置（可选）",
      step3: "Function Calling 工具",
      tool: "工具",
      function: "功能",
      trigger: "触发场景",
      recall: "搜索记忆",
      store: "保存记忆",
      list: "列出记忆",
      forget: "删除记忆",
      usage: "使用方式",
      example: "效果示例",
      relatedMemories: "相关记忆：",
      conversationCollected: "对话已采集",
      messagesInQueue: "条消息在队列中",
      manualInstall: "手动安装（备选）",
      howItWorks: "工作原理",
      howItWorksSubtitle: "所有插件共享同一后端，记忆自动同步",
      cloudStorage: "云端记忆存储",
      autoCategorize: "自动分类",
      semanticSearch: "语义搜索",
      linkedMemories: "关联记忆",
      ctaTitle: "安装后查看管理后台",
      ctaSubtitle: "所有 Agent 的记忆数据都可以在管理后台查看和管理",
      ctaButton: "进入管理后台"
    }
  }
};

function detectLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  const lang = browserLang.toLowerCase();
  if (lang.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

function getStoredLanguage() {
  return localStorage.getItem('memoryx_lang');
}

function setStoredLanguage(lang) {
  localStorage.setItem('memoryx_lang', lang);
}

function getCurrentLanguage() {
  const stored = getStoredLanguage();
  if (stored) {
    return stored;
  }
  const detected = detectLanguage();
  setStoredLanguage(detected);
  return detected;
}

function t(key) {
  const lang = getCurrentLanguage();
  const keys = key.split('.');
  let value = translations[lang];
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key;
    }
  }
  return value || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation && translation !== key) {
      el.textContent = translation;
    }
  });
  
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const translation = t(key);
    if (translation && translation !== key) {
      el.innerHTML = translation;
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = t(key);
    if (translation && translation !== key) {
      el.placeholder = translation;
    }
  });
  
  const lang = getCurrentLanguage();
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  
  if (lang === 'zh') {
    document.title = document.title.replace('MemoryX - Free Cognitive Memory Engine', 'MemoryX - 免费认知记忆引擎');
  }
}

function switchLanguage(lang) {
  setStoredLanguage(lang);
  applyTranslations();
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
});

window.i18n = {
  t,
  getCurrentLanguage,
  switchLanguage,
  applyTranslations,
  translations
};
