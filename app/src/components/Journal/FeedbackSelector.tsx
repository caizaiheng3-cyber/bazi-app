import React from 'react';
import { Select } from 'antd';
import type { Feedback } from '../../types/bazi';

interface Props {
  value: Feedback;
  onChange: (fb: Feedback) => void;
  note?: string;
}

const OPTIONS: Array<{ value: Feedback; label: string }> = [
  { value: 'pending', label: '待回填' },
  { value: 'confirmed', label: '已应验 ✓' },
  { value: 'partial', label: '部分应验' },
  { value: 'denied', label: '未应验' },
  { value: 'skipped', label: '未执行 / 改期' },
];

const COLOR: Record<Feedback, string> = {
  pending: 'var(--color-ink-light)',
  confirmed: 'var(--color-cinnabar)',
  partial: 'var(--color-gold)',
  denied: 'var(--color-ink)',
  skipped: 'var(--color-ink-light)',
};

/** 反馈回填下拉：把问答资产化的关键交互 */
export const FeedbackSelector: React.FC<Props> = ({ value, onChange, note }) => {
  return (
    <div className="flex items-center gap-2 flex-wrap text-sm">
      <span className="text-ink-light">— 实际反馈：</span>
      <Select
        size="small"
        value={value}
        onChange={(v) => onChange(v as Feedback)}
        options={OPTIONS}
        style={{ minWidth: 120, color: COLOR[value] }}
      />
      {note && (
        <span className="text-ink-light text-xs">· {note}</span>
      )}
    </div>
  );
};
