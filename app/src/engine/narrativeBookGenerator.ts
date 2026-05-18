/**
 * @deprecated 本文件为旧版前端 TS 引擎，已废弃。
 * 主计算引擎已切换到 Python 后端 API（web/backend/app/api/engine.py）。
 * 当前仅作为 fallback 保留，请勿新增逻辑。
 */
// 命书生成器（M14 结构化 Markdown + M15 自然语言长文）
//
// 命理学方法论：
//   传统命书章节框架（《滴天髓》《子平真诠》《三命通会》）：
//     第一章：四柱排盘
//     第二章：五行旺衰
//     第三章：用神格局
//     第四章：六亲（父母/兄弟/配偶/子女）
//     第五章：性格命格
//     第六章：财禄事业
//     第七章：婚姻
//     第八章：健康
//     第九章：学业
//     第十章：出行/搬迁
//     第十一章：官非牢狱
//     第十二章：大运流年
//     第十三章：综合论命
//
// 实现方式：
//   - 完全基于 chart 字段拼接，不假设、不臆造
//   - Markdown 版：结构化、可导出、可二次编辑
//   - Narrative 版：自然语言流畅长文，可读性优先

import type { BaziChart, CommandFactors, NarrativeBook, NarrativeChapter } from '../types/bazi';

// ============================================================
// 第一章：四柱排盘
// ============================================================
function chapterPillars(chart: BaziChart): NarrativeChapter {
  const { basicInfo, pillars } = chart;
  const md = [
    `### 一、四柱排盘`,
    ``,
    `**${basicInfo.name}**，${basicInfo.gender}，公历 ${basicInfo.solarDate}（农历 ${basicInfo.lunarDate}）。`,
    ``,
    `| 柱位 | 天干 | 地支 | 藏干 | 纳音 |`,
    `| :-: | :-: | :-: | :-: | :-: |`,
    ...pillars.map((p) => {
      const cangGan = p.cangGan.map((c) => c.gan).join('、');
      return `| ${p.name} | ${p.tianGan} | ${p.diZhi} | ${cangGan} | ${p.naYin} |`;
    }),
    ``,
  ].join('
');

  const narrative =
    `${basicInfo.name}（${basicInfo.gender}），出生于${basicInfo.solarDate}，` +
    `农历${basicInfo.lunarDate}，节气为${basicInfo.jieQiMonth}。` +
    `命主四柱为：${pillars.map((p) => p.tianGan + p.diZhi).join('、')}。` +
    `日主${pillars[2].tianGan}${pillars[2].diZhi}，是为本命。`;

  return { title: '一、四柱排盘', content: md, subChapters: [{ title: '叙述', content: narrative }] };
}

// ============================================================
// 第二章：五行与旺衰
// ============================================================
function chapterWuxing(chart: BaziChart): NarrativeChapter {
  const { wuxingStats, wangShuai } = chart;
  const wangShuaiSummary =
    wangShuai.relationAdjustment?.summary ??
    wangShuai.steps[wangShuai.steps.length - 1]?.details.join('；') ??
    '';
  const md = [
    `### 二、五行与旺衰`,
    ``,
    `**五行分布：**`,
    ``,
    `| 五行 | 力量 | 占比 |`,
    `| :-: | :-: | :-: |`,
    ...wuxingStats.map((w) => `| ${w.wuxing} | ${w.total.toFixed(1)} | ${w.percent.toFixed(1)}