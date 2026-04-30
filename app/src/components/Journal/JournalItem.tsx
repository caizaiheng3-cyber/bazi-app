import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ClassicCard } from '../common/ClassicCard';
import { FeedbackSelector } from './FeedbackSelector';
import type { Feedback, QnaRecord } from '../../types/bazi';

interface Props {
  record: QnaRecord;
  onUpdateFeedback?: (recordId: string, fb: Feedback) => void;
  onToggleStar?: (recordId: string) => void;
}

const VERDICT_STYLE: Record<
  QnaRecord['reply']['verdict'],
  { bg: string; color: string; border: string }
> = {
  宜: { bg: 'rgba(197, 57, 47, 0.08)', color: '#C5392F', border: '#C5392F' },
  忌: { bg: 'rgba(44, 42, 40, 0.08)', color: '#2C2A28', border: '#2C2A28' },
  慎: { bg: 'rgba(184, 134, 11, 0.1)', color: '#B8860B', border: '#B8860B' },
  中性: { bg: 'rgba(90, 86, 81, 0.08)', color: '#5A5651', border: '#5A5651' },
};

function brief(text: string, limit = 54): string {
  if (!text) return '';
  return text.length > limit ? text.slice(0, limit) + '…' : text;
}

/**
 * 单条日记卡片：
 * - 顶部：收藏标 + 日期 + 场景/领域 + 判词印章
 * - 中部：Q / A 摘要
 * - 底部：反馈回填 + 继续追问（跳 ChatPage）
 */
export const JournalItem: React.FC<Props> = ({
  record,
  onUpdateFeedback,
  onToggleStar,
}) => {
  const navigate = useNavigate();
  const vs = VERDICT_STYLE[record.reply.verdict];
  const dateStr = record.askedAt.slice(0, 10); // YYYY-MM-DD

  return (
    <ClassicCard className="mb-3">
      {/* 顶栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2 text-sm text-ink-light">
          <button
            onClick={() => onToggleStar?.(record.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: record.starred
                ? 'var(--color-cinnabar)'
                : 'var(--color-ink-light)',
              fontSize: 14,
            }}
            aria-label={record.starred ? '取消收藏' : '收藏'}
          >
            {record.starred ? '⭐' : '🔖'}
          </button>
          <span className="font-classic tracking-wider">{dateStr}</span>
          <span>·</span>
          <span>{record.scene}</span>
          {record.focusArea && (
            <>
              <span>·</span>
              <span>{record.focusArea}</span>
            </>
          )}
        </div>
        <span
          className="text-xs font-classic px-2 py-0.5"
          style={{
            background: vs.bg,
            color: vs.color,
            border: `1px solid ${vs.border}`,
            borderRadius: 3,
            letterSpacing: '0.1em',
          }}
        >
          {record.reply.verdict}
        </span>
      </div>

      {/* Q / A 摘要 */}
      <div
        className="font-classic text-base leading-snug mb-1"
        style={{ color: 'var(--color-ink)' }}
      >
        Q：{record.question}
      </div>
      <div className="text-sm text-ink-light leading-relaxed mb-3">
        A：「{brief(record.reply.explanation)}」
      </div>

      {/* 底部：反馈 + 续聊 */}
      <div
        className="flex items-center justify-between flex-wrap gap-3 pt-3"
        style={{ borderTop: '1px dashed var(--color-border)' }}
      >
        <FeedbackSelector
          value={record.feedback ?? 'pending'}
          onChange={(fb) => onUpdateFeedback?.(record.id, fb)}
          note={record.feedbackNote}
        />
        <button
          onClick={() => navigate(`/chat?from=${record.id}`)}
          className="text-sm transition-colors"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-cinnabar)',
            fontFamily: '"Noto Serif SC", "Songti SC", serif',
            letterSpacing: '0.1em',
          }}
        >
          继续追问 →
        </button>
      </div>
    </ClassicCard>
  );
};
