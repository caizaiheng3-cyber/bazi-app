import React from 'react';
import type { ShifuReply } from '../../types/bazi';

interface Props {
  verdict: ShifuReply['verdict'];
  size?: number;
}

const STYLE: Record<
  ShifuReply['verdict'],
  { color: string; bg: string }
> = {
  宜: { color: '#C5392F', bg: 'rgba(197, 57, 47, 0.08)' },
  忌: { color: '#2C2A28', bg: 'rgba(44, 42, 40, 0.08)' },
  慎: { color: '#B8860B', bg: 'rgba(184, 134, 11, 0.1)' },
  中性: { color: '#5A5651', bg: 'rgba(90, 86, 81, 0.08)' },
};

/**
 * 宜/忌/慎/中性 印章（圆形，朱砂红 / 水墨黑 / 金 / 灰）。
 */
export const VerdictSeal: React.FC<Props> = ({ verdict, size = 56 }) => {
  const { color, bg } = STYLE[verdict];
  return (
    <div
      className="font-classic"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        background: bg,
        color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 700,
        letterSpacing: 0,
        boxShadow: `inset 0 0 0 1px ${color}20, 0 1px 2px rgba(0,0,0,0.06)`,
        flexShrink: 0,
      }}
    >
      {verdict}
    </div>
  );
};
