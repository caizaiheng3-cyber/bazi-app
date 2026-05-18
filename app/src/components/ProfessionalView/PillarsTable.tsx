import React from 'react';
import type { BaziChart } from '../../types/bazi';
import { getGanWuxingClass, getZhiWuxingClass } from '../common/wuxing';

/** 专业模式：四柱排盘表格（对标设计稿 02：棕色表头 + 大号天干地支） */
export const PillarsTable: React.FC<{ chart: BaziChart }> = ({ chart }) => {
  const { pillars } = chart;

  const headerStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, #6b5d4f 0%, #5a4e42 100%)',
    color: '#f5ecd7',
    fontFamily: '"Noto Serif SC", "Songti SC", serif',
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: '0.2em',
    padding: '10px 0',
  };

  const cellBorder = '1px solid rgba(212, 200, 168, 0.5)';

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-center font-classic"
        style={{ borderCollapse: 'collapse', border: cellBorder }}
      >
        {/* 棕色表头 */}
        <thead>
          <tr>
            <th style={{ ...headerStyle, width: 72, borderRight: cellBorder }}></th>
            {pillars.map((p) => (
              <th key={p.name} style={{ ...headerStyle, borderRight: cellBorder }}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 天干（大号字） */}
          <tr>
            <td style={{ padding: '8px 0', borderRight: cellBorder, borderBottom: cellBorder, fontSize: 13, color: 'var(--color-ink-light)' }}>
              天干
            </td>
            {pillars.map((p) => (
              <td
                key={p.name}
                className={getGanWuxingClass(p.tianGan)}
                style={{ padding: '8px 0', borderRight: cellBorder, borderBottom: cellBorder }}
              >
                <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>{p.tianGan}</span>
              </td>
            ))}
          </tr>
          {/* 地支（大号字） */}
          <tr>
            <td style={{ padding: '8px 0', borderRight: cellBorder, borderBottom: cellBorder, fontSize: 13, color: 'var(--color-ink-light)' }}>
              地支
            </td>
            {pillars.map((p) => (
              <td
                key={p.name}
                className={getZhiWuxingClass(p.diZhi)}
                style={{ padding: '8px 0', borderRight: cellBorder, borderBottom: cellBorder }}
              >
                <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>{p.diZhi}</span>
              </td>
            ))}
          </tr>
          {/* 藏干（标注本/中/余气） */}
          <tr>
            <td style={{ padding: '8px 0', borderRight: cellBorder, borderBottom: cellBorder, fontSize: 13, color: 'var(--color-ink-light)', verticalAlign: 'top' }}>
              藏干
            </td>
            {pillars.map((p) => (
              <td key={p.name} style={{ padding: '8px 4px', borderRight: cellBorder, borderBottom: cellBorder, fontSize: 13 }}>
                {p.cangGan.map((cg, idx) => (
                  <span key={cg.gan + idx}>
                    {idx > 0 && <span style={{ color: 'var(--color-ink-light)', margin: '0 4px' }}>·</span>}
                    <span>{cg.gan}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-ink-light)', marginLeft: 2 }}>
                      ({cg.type.charAt(0)})
                    </span>
                  </span>
                ))}
              </td>
            ))}
          </tr>
          {/* 天干十神 */}
          <tr>
            <td style={{ padding: '8px 0', borderRight: cellBorder, borderBottom: cellBorder, fontSize: 13, color: 'var(--color-ink-light)' }}>
              天干十神
            </td>
            {pillars.map((p) => (
              <td key={p.name} style={{ padding: '8px 0', borderRight: cellBorder, borderBottom: cellBorder, fontSize: 13 }}>
                {p.ganShiShen}
              </td>
            ))}
          </tr>
          {/* 地支十神（藏干对应） */}
          <tr>
            <td style={{ padding: '8px 0', borderRight: cellBorder, borderBottom: cellBorder, fontSize: 13, color: 'var(--color-ink-light)', verticalAlign: 'top' }}>
              地支十神
            </td>
            {pillars.map((p) => (
              <td key={p.name} style={{ padding: '8px 4px', borderRight: cellBorder, borderBottom: cellBorder, fontSize: 13 }}>
                {p.diShiShen && p.diShiShen.length > 0
                  ? p.diShiShen.join(' · ')
                  : '—'}
              </td>
            ))}
          </tr>
          {/* 纳音 */}
          <tr>
            <td style={{ padding: '8px 0', borderRight: cellBorder, fontSize: 13, color: 'var(--color-ink-light)' }}>
              纳音
            </td>
            {pillars.map((p) => (
              <td key={p.name} style={{ padding: '8px 0', borderRight: cellBorder, fontSize: 13 }}>
                {p.naYin}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
