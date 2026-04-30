import React from 'react';

interface Props {
  text: string;
  createdAt: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 用户气泡：右对齐，圆角卡片 + 时间戳（对标设计稿 04b） */
export const UserBubble: React.FC<Props> = ({ text, createdAt }) => {
  return (
    <div className="flex justify-end mb-4 gap-3 items-start">
      <div className="flex flex-col items-end" style={{ maxWidth: '75%' }}>
        <div
          className="px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap"
          style={{
            background: '#FFFDF7',
            border: '1px solid var(--color-border-soft)',
            borderRadius: '12px 2px 12px 12px',
            color: 'var(--color-ink)',
            fontFamily: '"Noto Serif SC", "Songti SC", serif',
            boxShadow: '0 1px 4px rgba(58, 47, 36, 0.06)',
          }}
        >
          {text}
        </div>
        <div
          className="text-[11px] mt-1.5 mr-1 flex items-center gap-1"
          style={{ color: 'var(--color-ink-light)' }}
        >
          {formatTime(createdAt)} <span style={{ opacity: 0.6 }}>✓</span>
        </div>
      </div>
    </div>
  );
};
