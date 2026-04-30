import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { QnaRecord } from '../../types/bazi';

interface Props {
  records: QnaRecord[];
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

/** 简短引用：取 explanation 的前 24 字 */
function brief(text: string, limit = 24): string {
  if (!text) return '';
  return text.length > limit ? text.slice(0, limit) + '…' : text;
}

/**
 * 最近问答列表（Dashboard 底部）· 展示 2-3 条。
 */
export const RecentQnaList: React.FC<Props> = ({ records }) => {
  const navigate = useNavigate();

  if (!records.length) {
    return (
      <div className="classic-card text-center text-ink-light text-sm py-6">
        还没有问过先生，从上方场景卡开始吧。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => {
        const vs = VERDICT_STYLE[r.reply.verdict];
        const dateStr = r.askedAt.slice(5, 10); // MM-DD
        return (
          <button
            key={r.id}
            onClick={() => navigate(`/chat?from=${r.id}`)}
            className="classic-card w-full text-left transition-transform hover:-translate-y-0.5"
            style={{ padding: '16px 18px', cursor: 'pointer', position: 'relative' }}
          >
            <div className="flex items-start gap-3">
              {/* 左侧日期区域 */}
              <div
                className="flex-shrink-0 text-center"
                style={{ minWidth: 56 }}
              >
                <div className="font-classic text-sm" style={{ color: 'var(--color-ink)' }}>
                  {dateStr}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-ink-light)' }}>
                  {r.scene}{r.focusArea ? ` · ${r.focusArea}` : ''}
                </div>
              </div>

              {/* 中间内容 */}
              <div className="flex-1">
                <div
                  className="font-classic text-[15px] leading-snug mb-1"
                  style={{ color: 'var(--color-ink)' }}
                >
                  Q：{r.question}
                </div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                  A：{brief(r.reply.explanation, 46)}
                </div>
              </div>

              {/* 右侧大号印章 */}
              <div
                className="flex-shrink-0 font-classic"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  border: `2px solid ${vs.color}`,
                  background: vs.bg,
                  color: vs.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {r.reply.verdict}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
