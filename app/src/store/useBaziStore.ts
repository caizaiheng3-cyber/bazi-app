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
import { buildChartWithFallback } from '../engine/baziEngine';
import { generateDailyDashboard } from '../engine/dailyDashboardGenerator';
import { generateShifuReply } from '../engine/shifuEngine';
import { mockBaziChart } from '../mock/baziChart';

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

function loadChartFromLS(): PersistedChart | null {
  if (typeof window === 'undefined') return null;
  return safeParse<PersistedChart>(window.localStorage.getItem(LS_CHART));
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
  submit: (data: InputData) => void;
  setViewMode: (mode: ViewMode) => void;
  reset: () => void;

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

  // ===== 命盘 =====

  setInputData: (data) => set({ inputData: data }),

  submit: (data) => {
    let baziChart: BaziChart;
    let consumerReport: ReturnType<typeof generateConsumerReport> | null = null;
    try {
      // M1-M2.6：排盘 + 全量分析，所有字段由引擎真实计算
      baziChart = buildChartWithFallback(data);
      // M3：消费者报告由引擎基于 BaziChart 全字段自动生成
      consumerReport = generateConsumerReport(baziChart);
    } catch (engineError) {
      console.warn('[submit] 引擎计算出错，回退到 mock 数据:', engineError);
      // 回退到 mock 数据
      baziChart = mockBaziChart;
      try {
        consumerReport = generateConsumerReport(baziChart);
      } catch {
        consumerReport = null;
      }
    }
    // M7.6：命盘提交后立即刷新今日 Dashboard，使其与新命主绑定
    let todayDashboard;
    try {
      todayDashboard = generateDailyDashboard(baziChart, {
        journalRecords: get().journalRecords,
        fallbackRecentQna: mockDailyDashboard.recentQna,
      });
    } catch {
      todayDashboard = mockDailyDashboard;
    }
    set({ inputData: data, baziChart, consumerReport, todayDashboard });
    saveChartToLS({ inputData: data, baziChart, consumerReport });
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
