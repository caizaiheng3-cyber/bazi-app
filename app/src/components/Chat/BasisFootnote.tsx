import React, { useState } from 'react';
import type { ShifuReply } from '../../types/bazi';

interface Props {
  basis: ShifuReply['basis'];
  bestTiming?: string;
}

const ICON_MAP: Record<string, string> = {
  liuNian: '☀',
  liuYue: '🌙',
  liuRi: '☀',
  yongShen: '🔮',
  daYun: '⛰',
};

const LABELS: Record<keyof ShifuReply['basis'], string> = {
  liuNian: '流年',
  liuYue: '流月',
  liuRi: '流日',
  yongShen: '用神',
  daYun: '大运',
};

/**
 * "命理依据"可折叠表格（对标设计稿 04b-chat）
 */
export const BasisFootnote: React.FC<Props> = ({ basis, bestTiming }) => {
  const [expanded, setExpanded] = useState(false);

  const items = (Object.keys(LABELS) as Array<keyof typeof LABELS>)
    .filter((k) => !!basis[k])
    .map((k) => ({
      key: k,
      icon: ICON_MAP[k] ?? '📎',
      label: LABELS[k],
      value: basis[k]!,
    }));

  if (!items.length && !bestTiming) return null;

  return (
    <div
      className="mt-4"
      style={{
        border: '1px solid var(--color-border-soft)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* 可折叠标题栏 */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 14px',
          background: 'rgba(245, 239, 224, 0.6)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: '"Noto Serif SC", "Songti SC", serif',
          fontSize: 14,
          color: 'var(--color-ink)',
          letterSpacing: '0.1em',
        }}
      >
        <span>命理依据</span>
        <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }}>
          ∧
        </span>
      </button>

      {/* 展开的表格内容 */}
      {expanded && (
        <div style={{ padding: '0 14px 10px' }}>
          {items.map((it, index) => (
            <div
              key={it.key}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 0',
                borderBottom: index < items.length - 1 ? '1px solid var(--color-border-soft)' : 'none',
                fontSize: 13,
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, lineHeight: '20px' }}>{it.icon}</span>
              <span
                className="font-classic"
                style={{
                  color: 'var(--color-cinnabar)',
                  fontWeight: 600,
                  minWidth: 56,
                  flexShrink: 0,
                }}
              >
                {it.label}
              </span>
              <span style={{ color: 'var(--color-ink)', lineHeight: 1.6 }}>{it.value}</span>
            </div>
          ))}
          {bestTiming && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 0',
                fontSize: 13,
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, lineHeight: '20px' }}>⏰</span>
              <span
                className="font-classic"
                style={{
                  color: 'var(--color-cinnabar)',
                  fontWeight: 600,
                  minWidth: 56,
                  flexShrink: 0,
                }}
              >
                推荐时机
              </span>
              <span style={{ color: 'var(--color-ink)', lineHeight: 1.6 }}>{bestTiming}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
