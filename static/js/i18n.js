const translations = {
  en: {
    copyToast: "Copied to clipboard",
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
      description: "Free Cognitive Memory Engine",
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
      methodDelete: "Delete memory",
      methodGetTaskStatus: "Query async task status"
    },
    privacy: {
      backHome: "← Back to Home",
      title: "Privacy Policy",
      lastUpdate: "Last updated: February 13, 2026",
      section1Title: "1. Information We Collect",
      section1Desc: "We collect the following types of information:",
      collect1Label: "Account Information",
      collect1: ": Email address, user ID",
      collect2Label: "Memory Content",
      collect2: ": Text content you store in MemoryX",
      collect3Label: "Usage Data",
      collect3: ": API calls, access times",
      collect4Label: "Technical Information",
      collect4: ": IP address, browser type (for security)",
      section2Title: "2. How We Use Your Information",
      section2Desc: "We use the collected information to:",
      use1: "Provide memory storage and retrieval services",
      use2: "Improve our AI classification algorithms",
      use3: "Send service notifications (e.g., security alerts)",
      use4: "Prevent abuse and ensure security",
      section3Title: "3. Data Storage & Security",
      section3Desc: "We take industry-standard measures to protect your data:",
      security1: "All data transmission uses TLS encryption",
      security2: "Sensitive information (e.g., API Keys) is encrypted at rest",
      security3: "Regular security audits and vulnerability scans",
      security4: "Servers located in secure cloud data centers",
      section4Title: "4. Data Sharing",
      section4Desc: "We do not sell your data. We only share in these cases:",
      share1Label: "Legal Requirements",
      share1: ": Responding to legitimate government requests",
      share2Label: "Service Providers",
      share2: ": Cloud storage, email providers (only for service delivery)",
      share3Label: "Merger/Acquisition",
      share3: ": If the company is acquired, data will transfer to new owner",
      section5Title: "5. Your Rights",
      section5Desc: "You have the following rights over your data:",
      right1Label: "Access",
      right1: ": View all your stored data",
      right2Label: "Delete",
      right2: ": Delete your account and all related data",
      right3Label: "Export",
      right3: ": Export your memory data",
      right4Label: "Correct",
      right4: ": Update inaccurate information",
      section6Title: "6. Cookie Policy",
      section6Desc: "We use cookies to:",
      cookie1: "Keep you logged in",
      cookie2: "Remember your preferences",
      cookie3: "Analyze website usage (anonymously)",
      section7Title: "7. Children's Privacy",
      section7Desc: "MemoryX is not intended for children under 13. We do not knowingly collect children's personal information. If you discover any child information, please contact us immediately for removal.",
      section8Title: "8. Policy Updates",
      section8Desc: "We may update this privacy policy. Major changes will be notified via email or website. Continued use of the service indicates acceptance of the new policy.",
      section9Title: "9. Contact Us",
      section9Desc: "If you have privacy-related questions, please contact us:",
      email: "Email"
    },
    terms: {
      backHome: "← Back to Home",
      title: "Terms of Service",
      lastUpdate: "Last updated: February 13, 2026",
      section1Title: "1. Acceptance of Terms",
      section1Desc1: "Welcome to MemoryX! By accessing or using our services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.",
      section1Desc2: "We reserve the right to modify these terms at any time. Major changes will be notified via email or website. Continued use of the service indicates acceptance of the new terms.",
      section2Title: "2. Service Description",
      section2Desc: "MemoryX provides the following services:",
      service1: "AI memory storage and retrieval",
      service2: "Cognitive classification and vector search",
      service3: "API access and integration",
      service4: "Related technical support and documentation",
      section2Note: "We reserve the right to modify, suspend, or terminate services without notice.",
      section3Title: "3. Account Registration",
      section3Desc: "Using MemoryX requires creating an account. You agree to:",
      account1: "Provide accurate and complete registration information",
      account2: "Protect your account password and API Key security",
      account3: "Update account information in a timely manner",
      account4: "Be responsible for all activities under your account",
      section3Note: "If you discover unauthorized use of your account, please contact us immediately.",
      section4Title: "4. Usage Rules",
      section4Desc: "You agree not to use MemoryX for the following activities:",
      rule1: "Storing or distributing illegal, harmful, threatening, abusive, harassing, defamatory, or obscene content",
      rule2: "Infringing on others' intellectual property or privacy rights",
      rule3: "Distributing malware, viruses, or any harmful code",
      rule4: "Unauthorized access or interference with services, servers, or networks",
      rule5: "Excessive API calls beyond reasonable use (e.g., DDoS attacks)",
      rule6: "Reselling, sublicensing, or commercial distribution of services",
      rule7: "Automated registration of bulk accounts",
      section5Title: "5. Intellectual Property",
      section5Desc1: "The intellectual property of MemoryX and related code, documentation, and trademarks belongs to us. Except for the scope authorized by the MIT license.",
      section5Desc2: "Regarding your content:",
      ip1: "You retain the intellectual property of stored content",
      ip2: "You grant us necessary licenses to provide services (storage, processing, display)",
      ip3: "You represent that you have legal rights to the content or have obtained necessary authorizations",
      section6Title: "6. Service Level & Availability",
      section6Desc: "We strive to maintain high service availability, but do not guarantee:",
      sla1: "Services will not be interrupted, timely, secure, or error-free",
      sla2: "Accuracy or reliability of any content or data",
      sla3: "Services will meet your specific needs",
      section6Note: "Free tier services are provided \"as is\" without Service Level Agreement (SLA).",
      section7Title: "7. Limitation of Liability",
      section7Desc: "To the maximum extent permitted by law, MemoryX and its contributors are not responsible for:",
      liability1: "Any direct, indirect, incidental, special, or consequential damages",
      liability2: "Data loss or corruption",
      liability3: "Loss of profits, revenue, or business opportunities",
      liability4: "Service interruption or unavailability",
      section7Note: "Our total liability does not exceed the fees you paid in the past 12 months, or $100 (whichever is higher).",
      section8Title: "8. Termination",
      section8Desc1: "You may stop using the service and delete your account at any time.",
      section8Desc2: "We reserve the right to terminate or suspend your access to the service in the following cases:",
      terminate1: "Violation of these Terms of Service",
      terminate2: "Engaging in illegal activities",
      terminate3: "Abuse of service or affecting other users",
      terminate4: "Long-term inactivity (over 2 years)",
      section8Note: "After termination, your data will be handled according to the privacy policy retention terms.",
      section9Title: "9. Governing Law",
      section9Desc: "These terms are governed by the laws of the People's Republic of China. Any disputes should first be resolved through friendly negotiation. If negotiation fails, submit to the court with jurisdiction over our location.",
      section10Title: "10. Open Source License",
      section10Desc: "MemoryX uses the MIT open source license. You are free to:",
      license1: "Use for commercial or non-commercial purposes",
      license2: "Modify and distribute code",
      license3: "Private use",
      section10Note: "But must retain copyright and license notices. See LICENSE file for details.",
      section11Title: "11. Contact Us",
      section11Desc: "If you have any questions or concerns, please contact us:",
      email: "Email"
    },
    portal: {
      welcome: "Welcome to MemoryX",
      signIn: "Sign in with your email",
      emailLabel: "Email Address",
      emailPlaceholder: "business@t0ken.ai",
      emailHint: "We'll send you a magic link to sign in instantly. No password needed!",
      sendLink: "Send Magic Link",
      checkEmail: "Check your email",
      sentTo: "We've sent a magic link to",
      nextSteps: "What's next?",
      step1: "1. Open your email inbox",
      step2: "2. Click the \"Sign in to MemoryX\" button",
      step3: "3. You'll be logged in automatically",
      resend: "Didn't receive it? Resend",
      differentEmail: "← Use a different email",
      signingIn: "Signing you in...",
      pleaseWait: "Please wait while we verify your magic link",
      error: "Something went wrong",
      expiredLink: "The link may have expired or is invalid.",
      tryAgain: "Try Again",
      dashboard: "Dashboard",
      activity: "Activity",
      agents: "Agents",
      facts: "Facts",
      totalFacts: "Total Facts",
      projects: "Projects",
      subscription: "Subscription & Usage",
      cloudSearch: "Cloud Search (Today)",
      upgrade: "Upgrade to Pro - $9.9/mo",
      quickActions: "Quick Actions",
      claimAgent: "Claim Agent",
      registerNew: "Register New Agent",
      recentActivity: "Recent Activity",
      loading: "Loading...",
      noActivity: "No recent activity",
      logout: "Logout"
    },
    agent: {
      heroBadge: "Agent Auto Install",
      heroTitle: "Let AI Agent",
      heroTitleHighlight: "Auto Install Plugin",
      heroSubtitle: "Copy the command below and send to your Agent to complete installation automatically.",
      heroSubtitleSupport: "Supports OpenClaw and VS Code",
      openclawTab: "OpenClaw Plugin",
      vscodeTab: "VS Code Plugin",
      dashboard: "Dashboard →",
      autoInstall: "Agent Auto-Install",
      heroTitle1: "Let AI Agent",
      heroTitle2: "Auto-Install Plugin",
      heroSubtitle1: "Copy the command below and send to your Agent to complete installation automatically.",
      heroSubtitle2: "Supports OpenClaw and VS Code",
      openclawFeatures: "OpenClaw Plugin Features",
      autoRecall: "Auto Recall",
      autoRecallDesc: "Auto search relevant memories before conversation",
      autoSave: "Auto Save",
      autoSaveDesc: "Auto save to MemoryX after conversation",
      functionCallingDesc: "LLM can actively call memory tools",
      sendInstallCmd: "Send install command to Agent",
      copyToAgent: "Copy for Agent to execute",
      copy: "Copy",
      configOptional: "Config (Optional)",
      functionCallingTools: "Function Calling Tools",
      tool: "Tool",
      function: "Function",
      trigger: "Trigger",
      searchMemory: "Search memories",
      saveMemory: "Save memory",
      listMemory: "List memories",
      deleteMemory: "Delete memory",
      vscodeFeatures: "VS Code Plugin Features",
      chatDirect: "Use directly in Chat",
      autoSync: "Auto Sync",
      autoSyncDesc: "Auto conversation collection and recall",
      zeroConfig: "Zero Config",
      zeroConfigDesc: "Auto register, ready to use",
      usage: "Usage",
      vscodeChat: "In VS Code Chat (Cmd/Ctrl + Shift + I)",
      example: "Example",
      relatedMemories: "Related memories:",
      examplePref: "User prefers JWT auth",
      exampleFact: "Project uses TypeScript",
      conversationCollected: "Conversation collected (5 messages in queue)",
      manualInstall: "Manual Install (Alternative)",
      fromVsix: "Install from VSIX file",
      howItWorks: "How It Works",
      howItWorksDesc: "All plugins share the same backend, memories sync automatically",
      cloudStorage: "Cloud Memory Storage",
      autoClassify: "📊 Auto Classify",
      semanticSearch: "🔍 Semantic Search",
      linkedMemories: "🔗 Linked Memories",
      ctaTitle: "View Dashboard After Installation",
      ctaDesc: "All Agent memory data can be viewed and managed in the dashboard",
      goToDashboard: "Go to Dashboard",
      allRightsReserved: "All rights reserved.",
      openclawFeaturesOld: {
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
      vscodeFeaturesOld: {
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
      recall: "Search memories",
      store: "Save memory",
      list: "List memories",
      forget: "Delete memory",
      messagesInQueue: "messages in queue",
      autoCategorize: "Auto Categorize",
      ctaButton: "Go to Dashboard"
    }
  },
  zh: {
    copyToast: "已复制到剪贴板",
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
      description: "免费认知记忆引擎",
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
      methodDelete: "删除记忆",
      methodGetTaskStatus: "查询异步任务状态"
    },
    privacy: {
      backHome: "← 返回首页",
      title: "隐私政策",
      lastUpdate: "最后更新日期：2026年2月13日",
      section1Title: "1. 我们收集的信息",
      section1Desc: "我们收集以下类型的信息：",
      collect1Label: "账户信息",
      collect1: "：邮箱地址、用户ID",
      collect2Label: "记忆内容",
      collect2: "：你在 MemoryX 中存储的文本内容",
      collect3Label: "使用数据",
      collect3: "：API 调用、访问时间",
      collect4Label: "技术信息",
      collect4: "：IP 地址、浏览器类型（用于安全目的）",
      section2Title: "2. 我们如何使用你的信息",
      section2Desc: "我们使用收集的信息来：",
      use1: "提供记忆存储和检索服务",
      use2: "改进我们的 AI 分类算法",
      use3: "发送服务通知（如安全警报）",
      use4: "防止滥用并确保安全",
      section3Title: "3. 数据存储与安全",
      section3Desc: "我们采取行业标准措施保护你的数据：",
      security1: "所有数据传输使用 TLS 加密",
      security2: "敏感信息（如 API Key）在存储时加密",
      security3: "定期安全审计和漏洞扫描",
      security4: "服务器位于安全的云数据中心",
      section4Title: "4. 数据共享",
      section4Desc: "我们不会出售你的数据。仅在以下情况下共享：",
      share1Label: "法律要求",
      share1: "：响应合法的政府请求",
      share2Label: "服务提供商",
      share2: "：云存储、邮件服务商（仅用于服务交付）",
      share3Label: "合并/收购",
      share3: "：如果公司被收购，数据将转移给新所有者",
      section5Title: "5. 你的权利",
      section5Desc: "你对你的数据拥有以下权利：",
      right1Label: "访问",
      right1: "：查看所有存储的数据",
      right2Label: "删除",
      right2: "：删除你的账户和所有相关数据",
      right3Label: "导出",
      right3: "：导出你的记忆数据",
      right4Label: "更正",
      right4: "：更新不准确的信息",
      section6Title: "6. Cookie 政策",
      section6Desc: "我们使用 Cookie 来：",
      cookie1: "保持登录状态",
      cookie2: "记住你的偏好",
      cookie3: "分析网站使用情况（匿名）",
      section7Title: "7. 儿童隐私",
      section7Desc: "MemoryX 不面向 13 岁以下儿童。我们不会故意收集儿童的个人信息。如果发现任何儿童信息，请立即联系我们删除。",
      section8Title: "8. 政策更新",
      section8Desc: "我们可能会更新此隐私政策。重大变更将通过邮件或网站通知。继续使用服务即表示接受新政策。",
      section9Title: "9. 联系我们",
      section9Desc: "如有隐私相关问题，请联系我们：",
      email: "邮箱"
    },
    terms: {
      backHome: "← 返回首页",
      title: "使用条款",
      lastUpdate: "最后更新日期：2026年2月13日",
      section1Title: "1. 接受条款",
      section1Desc1: "欢迎使用 MemoryX！通过访问或使用我们的服务，你同意受这些使用条款的约束。如果你不同意这些条款，请勿使用我们的服务。",
      section1Desc2: "我们保留随时修改这些条款的权利。重大变更将通过邮件或网站通知。继续使用服务即表示接受新条款。",
      section2Title: "2. 服务描述",
      section2Desc: "MemoryX 提供以下服务：",
      service1: "AI 记忆存储与检索",
      service2: "认知分类与向量搜索",
      service3: "API 访问与集成",
      service4: "相关技术支持和文档",
      section2Note: "我们保留修改、暂停或终止服务的权利，恕不另行通知。",
      section3Title: "3. 账户注册",
      section3Desc: "使用 MemoryX 需要创建账户。你同意：",
      account1: "提供准确、完整的注册信息",
      account2: "保护你的账户密码和 API Key 安全",
      account3: "及时更新账户信息",
      account4: "对账户下的所有活动负责",
      section3Note: "如发现未经授权使用你的账户，请立即联系我们。",
      section4Title: "4. 使用规则",
      section4Desc: "你同意不使用 MemoryX 进行以下活动：",
      rule1: "存储或传播非法、有害、威胁、辱骂、骚扰、诽谤、淫秽内容",
      rule2: "侵犯他人知识产权或隐私权",
      rule3: "传播恶意软件、病毒或任何有害代码",
      rule4: "未经授权访问或干扰服务、服务器或网络",
      rule5: "超出合理使用的 API 调用（如 DDoS 攻击）",
      rule6: "转售、再许可或商业性分发的服务",
      rule7: "自动化注册批量账户",
      section5Title: "5. 知识产权",
      section5Desc1: "MemoryX 及相关代码、文档、商标的知识产权归我们所有。MIT 许可证授权的范围除外。",
      section5Desc2: "关于你的内容：",
      ip1: "你保留存储内容的知识产权",
      ip2: "你授予我们必要的许可，以提供服务（存储、处理、显示）",
      ip3: "你声明拥有内容的合法权利或已获得必要授权",
      section6Title: "6. 服务等级与可用性",
      section6Desc: "我们努力保持服务高可用性，但不保证：",
      sla1: "服务不会中断、及时、安全或无错误",
      sla2: "任何内容或数据的准确性或可靠性",
      sla3: "服务满足你的特定需求",
      section6Note: "免费版服务按"原样"提供，不提供服务级别协议（SLA）。",
      section7Title: "7. 责任限制",
      section7Desc: "在法律允许的最大范围内，MemoryX 及其贡献者不对以下情况负责：",
      liability1: "任何直接、间接、附带、特殊或后果性损害",
      liability2: "数据丢失或损坏",
      liability3: "利润、收入或业务机会损失",
      liability4: "服务中断或不可用",
      section7Note: "我们的总责任不超过你在过去12个月内支付的费用，或100美元（以较高者为准）。",
      section8Title: "8. 终止",
      section8Desc1: "你可以随时停止使用服务并删除账户。",
      section8Desc2: "我们保留在以下情况下终止或暂停你访问服务的权利：",
      terminate1: "违反这些使用条款",
      terminate2: "从事非法活动",
      terminate3: "滥用服务或影响其他用户",
      terminate4: "长期不活跃（超过2年）",
      section8Note: "终止后，你的数据将根据隐私政策的保留条款处理。",
      section9Title: "9. 适用法律",
      section9Desc: "这些条款受中华人民共和国法律管辖。任何争议应首先通过友好协商解决。协商不成的，提交我们所在地有管辖权的法院诉讼解决。",
      section10Title: "10. 开源许可",
      section10Desc: "MemoryX 采用 MIT 开源许可证。你可以自由地：",
      license1: "用于商业或非商业用途",
      license2: "修改和分发代码",
      license3: "私有使用",
      section10Note: "但需保留版权声明和许可声明。详见 LICENSE 文件。",
      section11Title: "11. 联系我们",
      section11Desc: "如有任何问题或疑虑，请联系我们：",
      email: "邮箱"
    },
    portal: {
      welcome: "欢迎来到 MemoryX",
      signIn: "使用邮箱登录",
      emailLabel: "邮箱地址",
      emailPlaceholder: "business@t0ken.ai",
      emailHint: "我们将发送一个魔法链接让你即时登录，无需密码！",
      sendLink: "发送魔法链接",
      checkEmail: "查收邮件",
      sentTo: "我们已发送魔法链接至",
      nextSteps: "接下来？",
      step1: "1. 打开你的收件箱",
      step2: "2. 点击「登录 MemoryX」按钮",
      step3: "3. 你将自动登录",
      resend: "没收到？重新发送",
      differentEmail: "← 使用其他邮箱",
      signingIn: "正在登录...",
      pleaseWait: "请稍候，我们正在验证你的魔法链接",
      error: "出错了",
      expiredLink: "链接可能已过期或无效。",
      tryAgain: "重试",
      dashboard: "仪表盘",
      activity: "活动",
      agents: "Agents",
      facts: "事实",
      totalFacts: "总事实数",
      projects: "项目",
      subscription: "订阅与用量",
      cloudSearch: "云搜索（今日）",
      upgrade: "升级到 Pro - $9.9/月",
      quickActions: "快捷操作",
      claimAgent: "认领 Agent",
      registerNew: "注册新 Agent",
      recentActivity: "最近活动",
      loading: "加载中...",
      noActivity: "暂无最近活动",
      logout: "退出登录"
    },
    agent: {
      heroBadge: "Agent 自动安装",
      heroTitle: "让 AI Agent",
      heroTitleHighlight: "自动安装插件",
      heroSubtitle: "复制下方命令，发送给您的 Agent，即可自动完成安装。",
      heroSubtitleSupport: "支持 OpenClaw 和 VS Code",
      openclawTab: "OpenClaw 插件",
      vscodeTab: "VS Code 插件",
      dashboard: "管理后台 →",
      autoInstall: "Agent 自动安装",
      heroTitle1: "让 AI Agent",
      heroTitle2: "自动安装插件",
      heroSubtitle1: "复制下方命令，发送给您的 Agent，即可自动完成安装。",
      heroSubtitle2: "支持 OpenClaw 和 VS Code",
      openclawFeatures: "OpenClaw 插件功能",
      autoRecall: "自动召回",
      autoRecallDesc: "对话前自动搜索相关记忆",
      autoSave: "自动保存",
      autoSaveDesc: "对话后自动保存到 MemoryX",
      functionCallingDesc: "LLM 可主动调用记忆工具",
      sendInstallCmd: "给 Agent 发送安装命令",
      copyToAgent: "复制给 Agent 执行",
      copy: "复制",
      configOptional: "配置（可选）",
      functionCallingTools: "Function Calling 工具",
      tool: "工具",
      function: "功能",
      trigger: "触发场景",
      searchMemory: "搜索记忆",
      saveMemory: "保存记忆",
      listMemory: "列出记忆",
      deleteMemory: "删除记忆",
      vscodeFeatures: "VS Code 插件功能",
      chatDirect: "在 Chat 中直接使用",
      autoSync: "自动同步",
      autoSyncDesc: "对话自动采集和召回",
      zeroConfig: "零配置",
      zeroConfigDesc: "自动注册，开箱即用",
      usage: "使用方式",
      vscodeChat: "在 VS Code Chat 中 (Cmd/Ctrl + Shift + I)",
      example: "效果示例",
      relatedMemories: "相关记忆：",
      examplePref: "用户偏好 JWT 认证",
      exampleFact: "项目使用 TypeScript",
      conversationCollected: "对话已采集 (5 条消息在队列中)",
      manualInstall: "手动安装（备选）",
      fromVsix: "从 VSIX 文件安装",
      howItWorks: "工作原理",
      howItWorksDesc: "所有插件共享同一后端，记忆自动同步",
      cloudStorage: "云端记忆存储",
      autoClassify: "📊 自动分类",
      semanticSearch: "🔍 语义搜索",
      linkedMemories: "🔗 关联记忆",
      ctaTitle: "安装后查看管理后台",
      ctaDesc: "所有 Agent 的记忆数据都可以在管理后台查看和管理",
      goToDashboard: "进入管理后台",
      allRightsReserved: "保留所有权利。",
      openclawFeaturesOld: {
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
      vscodeFeaturesOld: {
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
      recall: "搜索记忆",
      store: "保存记忆",
      list: "列出记忆",
      forget: "删除记忆",
      messagesInQueue: "条消息在队列中",
      autoCategorize: "自动分类",
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
