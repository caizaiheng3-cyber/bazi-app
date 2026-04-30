import React from 'react';
import type { BaziChart } from '../../types/bazi';
import { getGanWuxingClass, getZhiWuxingClass } from '../common/wuxing';

/** 专业模式：四柱排盘表格（核心信息） */
export const PillarsTable: React.FC<{ chart: BaziChart }> = ({ chart }) => {
  const { pillars } = chart;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-center">
        <thead>
          <tr className="border-b-2 border-cinnabar/40">
            <th className="py-3 text-left pr-4 text-ink-light font-normal w-20"></th>
            {pillars.map((p) => (
              <th key={p.name} className="py-3 font-classic text-base text-cinnabar tracking-wider">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-classic">
          {/* 天干十神 */}
          <tr>
            <td className="py-3 text-left pr-4 text-ink-light text-xs">天干十神</td>
            {pillars.map((p) => (
              <td key={p.name} className="py-3 text-ink-light text-xs">
                {p.ganShiShen}
              </td>
            ))}
          </tr>
          {/* 天干（大字） */}
          <tr>
            <td className="py-2 text-left pr-4 text-ink-light text-xs">天干</td>
            {pillars.map((p) => (
              <td key={p.name} className={`py-2 ${getGanWuxingClass(p.tianGan)}`}>
                <span className="gan-zhi-char">{p.tianGan}</span>
              </td>
            ))}
          </tr>
          {/* 地支（大字） */}
          <tr>
            <td className="py-2 text-left pr-4 text-ink-light text-xs">地支</td>
            {pillars.map((p) => (
              <td key={p.name} className={`py-2 ${getZhiWuxingClass(p.diZhi)}`}>
                <span className="gan-zhi-char">{p.diZhi}</span>
              </td>
            ))}
          </tr>
          {/* 藏干 */}
          <tr className="border-t border-border-classic/50">
            <td className="py-3 text-left pr-4 text-ink-light text-xs align-top">藏干</td>
            {pillars.map((p) => (
              <td key={p.name} className="py-3">
                <div className="flex flex-col gap-0.5 items-center">
                  {p.cangGan.map((cg, i) => (
                    <div key={i} className="text-xs leading-tight">
                      <span className={`font-medium ${getGanWuxingClass(cg.gan)}`}>{cg.gan}</span>
                      <span className="text-ink-light/60 ml-1">({cg.type[0]}·{cg.shiShen})</span>
                    </div>
                  ))}
                </div>
              </td>
            ))}
          </tr>
          {/* 纳音 */}
          <tr className="border-t border-border-classic/50">
            <td className="py-3 text-left pr-4 text-ink-light text-xs">纳音</td>
            {pillars.map((p) => (
              <td key={p.name} className="py-3 text-sm text-ink">
                {p.naYin}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
