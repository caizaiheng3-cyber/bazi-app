import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TopNavBar } from '../components/common/TopNavBar';
import { ChatHeaderBar } from '../components/Chat/ChatHeaderBar';
import { ChatInputBar } from '../components/Chat/ChatInputBar';
import { UserBubble } from '../components/Chat/UserBubble';
import { ShifuBubble } from '../components/Chat/ShifuBubble';
import { useBaziStore } from '../store/useBaziStore';
import type { AskScene, ChatMessage } from '../types/bazi';

const VALID_SCENES: AskScene[] = ['决策', '择吉', '宜忌', '开放'];

/** 启发式问句池（按场景） */
const SCENE_HINTS: Record<string, string[]> = {
  决策: [
    '我该不该现在跳槽？',
    '这个项目接还是不接？',
    '今年要不要买房？',
  ],
  择吉: [
    '本月哪天宜签约？',
    '近期出行哪天最顺？',
    '哪天搬家最合适？',
  ],
  宜忌: [
    '今日宜见客户吗？',
    '今日忌做什么？',
    '今晚适合谈钱吗？',
  ],
  开放: [
    '聊聊我的事业方向',
    '我的桃花何时来？',
    '近期需要注意什么？',
  ],
};

/** 空态意境视图：书桌插画 + 居中引导（对标设计稿 04-chat） */
const ChatEmptyState: React.FC = () => {
  return (
    <div
      className="flex flex-col items-center justify-center px-6"
      style={{ minHeight: 'calc(100vh - 200px)' }}
    >
      {/* 云纹装饰 */}
      <div
        style={{
          fontSize: 36,
          color: 'var(--color-cinnabar)',
          opacity: 0.5,
          marginBottom: 16,
        }}
      >
        ☁
      </div>

      {/* 大标题 */}
      <h2
        className="font-classic text-center"
        style={{
          fontSize: 28,
          color: 'var(--color-ink)',
          letterSpacing: '0.2em',
          lineHeight: 1.6,
          marginBottom: 8,
        }}
      >
        请问先生，
        <br />
        您有什么想问的？
      </h2>

      {/* 书桌插画 */}
      <div style={{ width: '100%', maxWidth: 480, marginTop: 24 }}>
        <img
          src="/images/chat-empty-desk.png"
          alt="书桌"
          style={{
            width: '100%',
            borderRadius: 12,
            opacity: 0.85,
            filter: 'saturate(0.9)',
          }}
        />
      </div>
    </div>
  );
};

/**
 * 聊天流式对话页（M7 核心页面）
 * - 顶部场景条 + 当日干支
 * - 中部消息流（用户气泡 + 先生气泡，可无限追问）
 * - 底部输入栏（场景下拉 + 输入框 + 发送）
 *
 * URL query：?scene=决策&question=xxx&from=journalId
 */
export const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // —— store 接入 ——
  const chatMessages = useBaziStore((s) => s.chatMessages);
  const currentScene = useBaziStore((s) => s.currentScene);
  const setStoreScene = useBaziStore((s) => s.setScene);
  const sendQuestion = useBaziStore((s) => s.sendQuestion);
  const clearChat = useBaziStore((s) => s.clearChat);
  const loadConversationFromJournal = useBaziStore(
    (s) => s.loadConversationFromJournal,
  );
  const starReply = useBaziStore((s) => s.starReply);
  const saveToJournal = useBaziStore((s) => s.saveToJournal);
  const todayDashboard = useBaziStore((s) => s.todayDashboard);

  // URL 传入的场景（覆盖 store）
  const urlScene = useMemo<AskScene | null>(() => {
    const s = searchParams.get('scene');
    return (VALID_SCENES as string[]).includes(s ?? '') ? (s as AskScene) : null;
  }, [searchParams]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);

  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const initedRef = useRef(false);

  /** 自动滚到底部 */
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [chatMessages.length, loading]);

  /** 监听空态点击 hint 时填充输入框并聚焦 */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === 'string' && detail) {
        setInput(detail);
        setFocusSignal((n) => n + 1);
      }
    };
    window.addEventListener('chat:fill-hint', handler);
    return () => window.removeEventListener('chat:fill-hint', handler);
  }, []);

  /** 首次进入：按 URL query 初始化对话 */
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    const from = searchParams.get('from');
    const question = searchParams.get('question');

    if (from) {
      // 从命理日记进入：载入历史问答
      loadConversationFromJournal(from);
      return;
    }

    // 非续聊：清空上一次会话，确保干净进入
    clearChat();
    if (urlScene) setStoreScene(urlScene);

    if (question) {
      setLoading(true);
      sendQuestion(question, urlScene ?? currentScene).finally(() =>
        setLoading(false),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scene = urlScene ?? currentScene;

  const handleSend = async () => {
    if (loading || !input.trim()) return;
    const q = input;
    setInput('');
    setLoading(true);
    try {
      await sendQuestion(q, scene);
    } finally {
      setLoading(false);
    }
  };

  /** 追问：聚焦输入框并引用上一条回话第一点 */
  const handleFollowUp = (quote: string) => {
    const hint = quote ? `关于「${quote.slice(0, 18)}」，` : '';
    setInput(hint);
    setFocusSignal((n) => n + 1);
  };

  /** 收藏 / 取消收藏（store 内部同步 journal） */
  const handleStar = (msgId: string) => starReply(msgId);

  /** 显式沉淀到命理日记 */
  const handleSaveToJournal = (msg: ChatMessage) => saveToJournal(msg);

  // 当日干支提示
  const dayHint = `${todayDashboard.fortune.ganZhi}日 · 您日主丙火，喜木火助身、用神金土`;

  return (
    <div className="page-paper min-h-screen flex flex-col">
      <TopNavBar />
      <ChatHeaderBar
        scene={scene}
        onSceneChange={setStoreScene}
        dayHint={dayHint}
      />

      {/* 中部滚动区 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {chatMessages.length === 0 && !loading && <ChatEmptyState />}

          {chatMessages.map((m) =>
            m.role === 'user' ? (
              <UserBubble
                key={m.id}
                text={m.text ?? ''}
                createdAt={m.createdAt}
              />
            ) : (
              <ShifuBubble
                key={m.id}
                msg={m}
                onStar={handleStar}
                onFollowUp={handleFollowUp}
                onSaveToJournal={handleSaveToJournal}
              />
            ),
          )}

          {loading && (
            <div
              className="py-3 pl-1 font-classic flex items-center gap-2"
              style={{
                color: 'var(--color-ink-light)',
                fontSize: 14,
                letterSpacing: '0.1em',
              }}
            >
              <span className="zhuan-seal" style={{ width: 22, height: 22, fontSize: 10 }}>
                师
              </span>
              <span>先 生 沉 吟 中 ……</span>
            </div>
          )}

          <div ref={scrollAnchorRef} />
        </div>
      </div>

      {/* 底部输入栏 */}
      <ChatInputBar
        scene={scene}
        onSceneChange={setStoreScene}
        value={input}
        onChange={setInput}
        onSend={handleSend}
        loading={loading}
        focusSignal={focusSignal}
        placeholder={
          scene === '决策'
            ? '我该不该……'
            : scene === '择吉'
              ? '哪天最合适……'
              : scene === '宜忌'
                ? '今日宜/忌什么？'
                : '您想问什么？'
        }
      />
    </div>
  );
};