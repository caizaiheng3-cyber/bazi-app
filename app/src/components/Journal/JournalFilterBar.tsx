import React from 'react';

export type JournalFilter = '全部' | '宜' | '忌' | '慎' | '收藏';

interface Props {
  value: JournalFilter;
  onChange: (v: JournalFilter) => void;
  total: number;
}

const OPTIONS: JournalFilter[] = ['全部', '宜', '忌', '慎', '收藏'];

/** 日记筛选条：全部 / 宜 / 忌 / 慎 / 收藏 */
export const JournalFilterBar: React.FC<Props> = ({
  value,
  onChange,
  total,
}) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-ink-light">筛选：</span>
        {OPTIONS.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className="px-3 py-1 text-sm font-classic transition-colors"
              style={{
                background: active
                  ? 'rgba(197, 57, 47, 0.08)'
                  : 'transparent',
                border: `1px solid ${
                  active ? 'var(--color-cinnabar)' : 'var(--color-border)'
                }`,
                color: active ? 'var(--color-cinnabar)' : 'var(--color-ink)',
                borderRadius: 3,
                cursor: 'pointer',
                letterSpacing: '0.1em',
              }}
            >
              {opt === '收藏' ? '⭐ 收藏' : opt}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-ink-light">共 {total} 条</div>
    </div>
  );
};
