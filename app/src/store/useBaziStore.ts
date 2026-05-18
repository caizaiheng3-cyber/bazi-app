import { create } from 'zustand';
import type {
  AskScene,
  BaziChart,
  ChatMessage,
  ConsumerReport,
  DailyDashboard,
  Feedback,
  FocusArea,
  Gender,
  QnaRecord,
  ShifuReply,
} from '../types/bazi';
import { generateConsumerReport } from '../engine/consumerReportGenerator';
import { mockDailyDashboard } from '../mock/dailyDashboard';
import { mockJournalRecords } from '../mock/journalRecords';
import { matchShifuReply } from '../mock/replyMatcher';
import { enhanceExistingChartWithLLM } from '../engine/baziEngine';
import { generateDailyDashboard } from '../engine/dailyDashboardGenerator';
import { generateShifuReply } from '../engine/shifuEngine';
import { fetchPaipan } from '../engine/apiClient';
import { adaptEngineResponse } from '../engine/apiAdapter';

/** 输入表单数据 */
export interface InputData {
  name: string;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  birthPlace: string;
  focusAreas: FocusArea[];
  // 高级选项
  useTrueSolarTime: boolean;
  ziShiSchool: 'early' | 'late'; // 早子时换日 / 不换日
}

export type ViewMode = 'professional' | 'consumer';

// ========== localStorage 持久化（防御性） ==========

const LS_CHART = 'bazi:chart';
const LS_JOURNAL = 'bazi:journal';
const JOURNAL_CAPACITY = 200;

interface PersistedChart {
  inputData: InputData | null;
  baziChart: BaziChart;
  consumerReport: ConsumerReport;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * 校验 localStorage 里的 chart 数据是否符合"当前引擎"需要的最低字段。
 * 老版本可能缺新加的字段（persona / relations / lifeTimeline / marriage / wealth /
 * career / health / relatives 等），直接渲染会白屏。
 *
 * 缺字段时返回 false，调用方应作废该缓存让用户重新排盘。
 */
function isChartSchemaCompatible(data: PersistedChart | null): data is PersistedChart {
  if (!data || !data.baziChart) return false;
  const c = data.baziChart as unknown as Record<string, unknown>;
  // 关键字段：渲染各 ConsumerView / ProfessionalView 子组件必读
  const requiredKeys = [
    'basicInfo',
    'pillars',
    'wuxingStats',
    'wangShuai',
    'yongShen',
    'geJu',
    'shenShas',
    'daYuns',
    'keyFindings',
    'persona',
    'relations',
    'lifeTimeline',
    'marriage',
    'wealth',
    'career',
    'health',
    'relatives',
  ];
  return requiredKeys.every((k) => c[k] !== undefined && c[k] !== null);
}

function loadChartFromLS(): PersistedChart | null {
  if (typeof window === 'undefined') return null;
  const data = safeParse<PersistedChart>(window.localStorage.getItem(LS_CHART));
  if (data && !isChartSchemaCompatible(data)) {
    // 旧 schema 数据，自动清除避免白屏
    console.warn('[useBaziStore] localStorage 中的 chart 数据缺少新字段，已自动清除。请重新排盘。');
    try {
      window.localStorage.removeItem(LS_CHART);
    } catch {
      /* ignore */
    }
    return null;
  }
  return data;
}

function saveChartToLS(data: PersistedChart | null) {
  if (typeof window === 'undefined') return;
  try {
    if (data) {
      window.localStorage.setItem(LS_CHART, JSON.stringify(data));
    } else {
      window.localStorage.removeItem(LS_CHART);
    }
  } catch {
    /* 存储满/禁用时静默忽略，避免阻塞主流程 */
  }
}

function loadJournalFromLS(): QnaRecord[] | null {
  if (typeof window === 'undefined') return null;
  return safeParse<QnaRecord[]>(window.localStorage.getItem(LS_JOURNAL));
}

function saveJournalToLS(records: QnaRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_JOURNAL, JSON.stringify(records));
  } catch {
    /* 静默忽略 */
  }
}

/** 容量控制：超过 JOURNAL_CAPACITY 条时，保留所有 starred + 最新的非 starred，直到总数 = 容量 */
function trimJournal(records: QnaRecord[]): QnaRecord[] {
  if (records.length <= JOURNAL_CAPACITY) return records;
  const starred = records.filter((r) => r.starred);
  const unstarred = records.filter((r) => !r.starred);
  // 按时间倒序
  unstarred.sort((a, b) => (a.askedAt < b.askedAt ? 1 : -1));
  const keepCount = Math.max(0, JOURNAL_CAPACITY - starred.length);
  const keptUnstarred = unstarred.slice(0, keepCount);
  return [...starred, ...keptUnstarred].sort((a, b) =>
    a.askedAt < b.askedAt ? 1 : -1,
  );
}

// ========== 初始状态计算（带异常清理） ==========

const persistedChart = loadChartFromLS();
const persistedJournal = loadJournalFromLS();

/** 首次启动：若无持久化日记，写入 mock 作为示例（真实发版时改为空数组） */
const initialJournal: QnaRecord[] =
  persistedJournal !== null ? persistedJournal : [...mockJournalRecords];

// ========== Store 定义 ==========

interface BaziState {
  // —— 命盘相关（已有） ——
  inputData: InputData | null;
  baziChart: BaziChart | null;
  consumerReport: ConsumerReport | null;
  viewMode: ViewMode;

  // —— 每日对话相关（新增） ——
  /** 当日 Dashboard 数据 */
  todayDashboard: DailyDashboard;
  /** 当前对话流（页面级，刷新清空） */
  chatMessages: ChatMessage[];
  /** 命理日记（持久化） */
  journalRecords: QnaRecord[];
  /** 当前默认场景 */
  currentScene: AskScene;

  // —— Actions：命盘 ——
  setInputData: (data: InputData) => void;
  submit: (data: InputData) => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  reset: () => void;
  /** P6.1 LLM 增强：用 DeepSeek 重写 mainTheme + oneLiner + narrative，替换当前 chart */
  enhanceWithLLM: () => Promise<{ ok: boolean; reason?: string }>;

  // —— LLM 增强状态 ——
  /** LLM 是否正在调用 */
  llmEnhancing: boolean;
  /** 当前 chart 是否已经被 LLM 增强过 */
  llmEnhanced: boolean;
  /** 上一次 LLM 调用错误信息（成功时清空） */
  llmError: string | null;

  // —— Actions：每日对话 ——
  loadTodayDashboard: () => void;
  setScene: (s: AskScene) => void;
  sendQuestion: (q: string, scene: AskScene) => Promise<ShifuReply>;
  clearChat: () => void;
  loadConversationFromJournal: (journalId: string) => void;
  starReply: (msgId: string) => void;
  /** 显式把聊天消息沉淀为 QnaRecord 存入日记 */
  saveToJournal: (msg: ChatMessage) => void;
  updateFeedback: (recordId: string, fb: Feedback, note?: string) => void;
  toggleJournalStar: (recordId: string) => void;
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export const useBaziStore = create<BaziState>((set, get) => ({
  inputData: persistedChart?.inputData ?? null,
  baziChart: persistedChart?.baziChart ?? null,
  consumerReport: persistedChart?.consumerReport ?? null,
  viewMode: 'professional',

  todayDashboard: mockDailyDashboard,
  chatMessages: [],
  journalRecords: initialJournal,
  currentScene: '决策',

  // P6.1 LLM 增强初始状态
  llmEnhancing: false,
  llmEnhanced: false,
  llmError: null,

  // ===== 命盘 =====

  setInputData: (data) => set({ inputData: data }),

  submit: async (data) => {
    let baziChart: BaziChart;
    let consumerReport: ReturnType<typeof generateConsumerReport> | null = null;

    try {
      // Python 引擎 API = 唯一真理源，不设 fallback
      const engineResponse = await fetchPaipan({
        name: data.name,
        gender: data.gender,
        birth_date: data.birthDate,
        birth_time: data.birthTime,
        birth_city: data.birthPlace,
      });
      baziChart = adaptEngineResponse(engineResponse, data);
      console.log('[submit] Python 引擎 API 计算成功:', data.name, data.birthDate, data.birthTime);
    } catch (apiError) {
      console.error('[submit] Python 引擎 API 调用失败:', apiError);
      throw new Error('排盘服务不可用，请确认后端已启动（python3 -m uvicorn main:app）');
    }

    try {
      consumerReport = generateConsumerReport(baziChart);
    } catch {
      consumerReport = null;
    }

    // 命盘提交后立即刷新今日 Dashboard
    let todayDashboard;
    try {
      todayDashboard = generateDailyDashboard(baziChart, {
        journalRecords: get().journalRecords,
        fallbackRecentQna: mockDailyDashboard.recentQna,
      });
    } catch {
      todayDashboard = mockDailyDashboard;
    }

    set({
      inputData: data,
      baziChart,
      consumerReport,
      todayDashboard,
      llmEnhanced: false,
      llmError: null,
    });
    saveChartToLS({ inputData: data, baziChart, consumerReport });
  },

  // ===== P6.1 LLM 增强（按需调用，不影响主流程速度） =====
  enhanceWithLLM: async () => {
    const { inputData, baziChart, llmEnhancing } = get();
    if (!inputData || !baziChart) {
      return { ok: false, reason: '请先排盘' };
    }
    if (llmEnhancing) {
      return { ok: false, reason: '正在增强中，请稍候' };
    }

    // API key 优先级：env 变量 > localStorage > 不可用
    const envKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_DEEPSEEK_API_KEY;
    const lsKey = typeof window !== 'undefined' ? window.localStorage.getItem('deepseek_api_key') : null;
    const apiKey = envKey || lsKey || undefined;
    if (!apiKey) {
      return { ok: false, reason: '未配置 API key（请设置 VITE_DEEPSEEK_API_KEY 或在浏览器 localStorage 设置 deepseek_api_key）' };
    }

    set({ llmEnhancing: true, llmError: null });
    try {
      // 基于已有的 baziChart（Python API 排盘结果）做 LLM 增强，不重新排盘
      const enhancedChart = await enhanceExistingChartWithLLM(baziChart, { llmApiKey: apiKey });
      let nextConsumerReport = get().consumerReport;
      try {
        nextConsumerReport = generateConsumerReport(enhancedChart);
      } catch {
        /* 兜底：保留旧 report */
      }
      const realEnhanced = enhancedChart.commandFactors.mainTheme !== baziChart.commandFactors.mainTheme;
      set({
        baziChart: enhancedChart,
        consumerReport: nextConsumerReport,
        llmEnhancing: false,
        llmEnhanced: realEnhanced,
      });
      saveChartToLS({ inputData, baziChart: enhancedChart, consumerReport: nextConsumerReport });
      return realEnhanced
        ? { ok: true }
        : { ok: false, reason: 'LLM 调用未生效（可能网络超时或 key 失效，已保留原版）' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ llmEnhancing: false, llmError: msg });
      return { ok: false, reason: msg };
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  reset: () => {
    set({
      inputData: null,
      baziChart: null,
      consumerReport: null,
      viewMode: 'professional',
    });
    saveChartToLS(null);
  },

  // ===== 每日对话 =====

  loadTodayDashboard: () => {
    // M7.6：有命盘时走真实引擎按当日推算；无命盘时回退 mock，避免首启白屏
    const chart = get().baziChart;
    if (!chart) {
      set({ todayDashboard: mockDailyDashboard });
      return;
    }
    const dashboard = generateDailyDashboard(chart, {
      journalRecords: get().journalRecords,
      fallbackRecentQna: mockDailyDashboard.recentQna,
    });
    set({ todayDashboard: dashboard });
  },

  setScene: (s) => set({ currentScene: s }),

  sendQuestion: async (q, scene) => {
    const question = q.trim();
    if (!question) throw new Error('empty question');

    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: genId('u'),
      role: 'user',
      scene,
      text: question,
      createdAt: now,
    };
    set((state) => ({ chatMessages: [...state.chatMessages, userMsg] }));

    // 模拟"先生沉吟"的等待感（保留对话节奏）
    await delay(650);

    // M7.6：有命盘时走真实对话引擎；无命盘时回退到关键词匹配的 mock，避免首启崩溃
    const chart = get().baziChart;
    const reply = chart
      ? generateShifuReply({ question, scene, chart })
      : matchShifuReply({ question, scene });

    const shifuMsg: ChatMessage = {
      id: genId('s'),
      role: 'shifu',
      scene,
      reply,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ chatMessages: [...state.chatMessages, shifuMsg] }));
    return reply;
  },

  clearChat: () => set({ chatMessages: [] }),

  loadConversationFromJournal: (journalId) => {
    const record = get().journalRecords.find((r) => r.id === journalId);
    if (!record) {
      set({ chatMessages: [] });
      return;
    }
    set({
      currentScene: record.scene,
      chatMessages: [
        {
          id: genId('u'),
          role: 'user',
          scene: record.scene,
          text: record.question,
          createdAt: record.askedAt,
        },
        {
          id: genId('s'),
          role: 'shifu',
          scene: record.scene,
          reply: record.reply,
          createdAt: record.askedAt,
          qnaId: record.id,
          starred: record.starred,
        },
      ],
    });
  },

  starReply: (msgId) => {
    // 更新对话流中的 starred 状态
    set((state) => ({
      chatMessages: state.chatMessages.map((m) =>
        m.id === msgId && m.role === 'shifu'
          ? { ...m, starred: !m.starred }
          : m,
      ),
    }));
    // 若该消息已沉淀为日记，同步日记的 starred
    const msg = get().chatMessages.find((m) => m.id === msgId);
    if (msg?.qnaId) {
      get().toggleJournalStar(msg.qnaId);
    }
  },

  saveToJournal: (msg) => {
    if (msg.role !== 'shifu' || !msg.reply) return;

    // 查找同一流中对应的用户提问（上一条 user 消息）
    const msgs = get().chatMessages;
    const idx = msgs.findIndex((m) => m.id === msg.id);
    const prevUser = [...msgs.slice(0, idx)]
      .reverse()
      .find((m) => m.role === 'user');

    // 若已沉淀过（qnaId 已存在于日记中），直接返回
    if (msg.qnaId && get().journalRecords.some((r) => r.id === msg.qnaId)) {
      return;
    }

    const record: QnaRecord = {
      id: msg.qnaId ?? genId('q'),
      scene: msg.scene,
      question: prevUser?.text ?? '（无问）',
      reply: msg.reply,
      askedAt: msg.createdAt,
      starred: msg.starred,
      feedback: 'pending',
    };
    const next = trimJournal([record, ...get().journalRecords]);
    set({ journalRecords: next });
    saveJournalToLS(next);

    // 回写 chatMessage 的 qnaId，后续 star 同步日记
    set((state) => ({
      chatMessages: state.chatMessages.map((m) =>
        m.id === msg.id ? { ...m, qnaId: record.id } : m,
      ),
    }));
  },

  updateFeedback: (recordId, fb, note) => {
    const next = get().journalRecords.map((r) =>
      r.id === recordId
        ? { ...r, feedback: fb, feedbackNote: note ?? r.feedbackNote }
        : r,
    );
    set({ journalRecords: next });
    saveJournalToLS(next);
  },

  toggleJournalStar: (recordId) => {
    const next = get().journalRecords.map((r) =>
      r.id === recordId ? { ...r, starred: !r.starred } : r,
    );
    set({ journalRecords: next });
    saveJournalToLS(next);
  },
}));
