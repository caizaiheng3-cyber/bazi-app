import React from 'react';
import type { BaziChart } from '../../types/bazi';
import { ClassicCard } from '../common/ClassicCard';
import { SectionTitle } from '../common/SectionTitle';
import { ClassicDivider } from '../common/ClassicDivider';
import { PillarsTable } from './PillarsTable';
import { WuxingChart } from './WuxingChart';
import { WangShuaiChain } from './WangShuaiChain';
import { PersonaCard } from './PersonaCard';
import { MarriageCard } from './MarriageCard';
import { WealthCard } from './WealthCard';
import { CareerCard } from './CareerCard';
import { HealthCard } from './HealthCard';
import { RelativesCard } from './RelativesCard';
import { EducationCard } from './EducationCard';
import { TravelCard } from './TravelCard';
import { LegalRiskCard } from './LegalRiskCard';
import { MonthlyForecastCard } from './MonthlyForecastCard';
import { DailyCalendarCard } from './DailyCalendarCard';
import { NarrativeBookCard } from './NarrativeBookCard';
import { DayunTimeline } from './DayunTimeline';
import { LifeTimeline } from './LifeTimeline';

const KEY_FINDING_STYLE = {
  red:    { color: '#C5392F', bg: 'rgba(197,57,47,0.08)',  label: '需关注' },
  yellow: { color: '#B8860B', bg: 'rgba(184,134,11,0.10)', label: '中性' },
  green:  { color: '#6B8E23', bg: 'rgba(107,142,35,0.10)', label: '利好' },
} as const;

const SHENSHA_STYLE = {
  吉神: { color: '#6B8E23', bg: 'rgba(107,142,35,0.10)' },
  凶神: { color: '#C5392F', bg: 'rgba(197,57,47,0.08)' },
  中性: { color: '#5A5651', bg: 'rgba(90,86,81,0.06)' },
} as const;

export const ProfessionalView: React.FC<{ chart: BaziChart }> = ({ chart }) => {
  const { basicInfo, wuxingStats, wangShuai, yongShen, geJu, shenShas, daYuns, keyFindings, persona, relations } = chart;

  return (
    <div className="space-y-6">
      {/* 1. 基础信息 */}
      <ClassicCard>
        <SectionTitle title="基础信息" />
        <div
          className="grid gap-x-8 gap-y-2 text-sm"
          style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
        >
          <div>
            <span style={{ color: 'var(--color-ink-light)' }}>姓名：</span>
            <span className="font-medium">{basicInfo.name}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-ink-light)' }}>性别：</span>
            <span className="font-medium">{basicInfo.gender}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-ink-light)' }}>公历：</span>
            {basicInfo.solarDate}
          </div>
          <div>
            <span style={{ color: 'var(--color-ink-light)' }}>农历：</span>
            {basicInfo.lunarDate}
          </div>
          <div>
            <span style={{ color: 'var(--color-ink-light)' }}>节气月：</span>
            {basicInfo.jieQiMonth}
          </div>
          {basicInfo.trueSolarTime && (
            <div>
              <span style={{ color: 'var(--color-ink-light)' }}>真太阳时：</span>
              {basicInfo.trueSolarTime}
            </div>
          )}
          {basicInfo.birthPlace && (
            <div className="col-span-2">
              <span style={{ color: 'var(--color-ink-light)' }}>出生地：</span>
              {basicInfo.birthPlace}
            </div>
          )}
        </div>
      </ClassicCard>

      {/* 2. 四柱排盘 */}
      <ClassicCard>
        <SectionTitle title="四柱排盘" subtitle="天干地支 · 藏干十神 · 纳音" />
        <PillarsTable chart={chart} />
      </ClassicCard>

      {/* 3. 五行分布 */}
      <ClassicCard>
        <SectionTitle title="五行力量分布" />
        <WuxingChart stats={wuxingStats} />
      </ClassicCard>

      {/* 4. 旺衰推断链 */}
      <ClassicCard>
        <SectionTitle title="日主旺衰判断" subtitle="四步推断 · 全过程可追溯" />
        <WangShuaiChain data={wangShuai} />
      </ClassicCard>

      {/* 4.5 命格特征（六维交叉画像 + 干支动态关系网） */}
      {persona && (
        <ClassicCard>
          <SectionTitle
            title="命格特征"
            subtitle="六维交叉 + 干支动态关系 · 滴天髓·子平真诠·三命通会"
          />
          <PersonaCard persona={persona} relations={relations} />
        </ClassicCard>
      )}

      {/* 4.6 M3 婚姻细论（配偶星 / 配偶宫 / 桃花 / 婚期 / 质量评分 / 风险） */}
      {chart.marriage && (
        <ClassicCard>
          <SectionTitle
            title="婚姻细论"
            subtitle="配偶画像 + 婚期推算 + 质量评分 + 风险预警"
          />
          <MarriageCard marriage={chart.marriage} />
        </ClassicCard>
      )}

      {/* 4.7 M4 财富细论（财星/财库/财源/方位/行业/财运/风险） */}
      {chart.wealth && (
        <ClassicCard>
          <SectionTitle
            title="财富细论"
            subtitle="财星 + 财库 + 财源类型 + 求财方位 + 财运周期 + 风险预警"
          />
          <WealthCard wealth={chart.wealth} />
        </ClassicCard>
      )}

      {/* 4.8 M5 事业细论（官星/事业宫/创业打工/行业/升迁/风险） */}
      {chart.career && (
        <ClassicCard>
          <SectionTitle
            title="事业细论"
            subtitle="官星 + 事业宫 + 创业打工建议 + 行业匹配 + 事业周期 + 风险预警"
          />
          <CareerCard career={chart.career} />
        </ClassicCard>
      )}

      {/* 4.9 M6 健康细论（脏腑/体质/疾病/调养/危险年） */}
      {chart.health && (
        <ClassicCard>
          <SectionTitle
            title="健康细论"
            subtitle="五脏六腑 + 体质类型 + 易患疾病 + 调养方向 + 健康关注年"
          />
          <HealthCard health={chart.health} />
        </ClassicCard>
      )}

      {/* 4.10 M7 六亲细论（父母/兄弟/子女三宫位 + 亲缘厚薄） */}
      {chart.relatives && (
        <ClassicCard>
          <SectionTitle
            title="六亲细论"
            subtitle="父母 + 兄弟姐妹 + 子女 三宫位 + 各亲缘厚薄评分"
          />
          <RelativesCard relatives={chart.relatives} />
        </ClassicCard>
      )}

      {/* 4.11 M8 学业细论（印星 + 文昌学堂词馆 + 升学关键年） */}
      {chart.education && (
        <ClassicCard>
          <SectionTitle
            title="学业细论"
            subtitle="印星画像 + 文昌学堂词馆神煞 + 学习方向 + 关键学业年"
          />
          <EducationCard education={chart.education} />
        </ClassicCard>
      )}

      {/* 4.12 M9 出行/搬迁（驿马 + 海外缘 + 出行年） */}
      {chart.travel && (
        <ClassicCard>
          <SectionTitle
            title="出行 / 搬迁"
            subtitle="驿马星 + 海外缘分 + 大运流年触发 + 关键出行年"
          />
          <TravelCard travel={chart.travel} />
        </ClassicCard>
      )}

      {/* 4.13 M10 官非/牢狱（羊刃+劫煞+三刑+伤官见官 + 高危年） */}
      {chart.legalRisk && (
        <ClassicCard>
          <SectionTitle
            title="官非 / 牢狱风险"
            subtitle="原局凶神组合 + 三刑齐全 + 伤官见官 + 高危流年"
          />
          <LegalRiskCard legalRisk={chart.legalRisk} />
        </ClassicCard>
      )}

      {/* 4.14 M11 流月预测（当年 12 个月） */}
      {chart.monthlyForecast && (
        <ClassicCard>
          <SectionTitle
            title="流月推演"
            subtitle={`${chart.monthlyForecast.year}年 12 个月吉凶 · 与日柱合冲刑害分析`}
          />
          <MonthlyForecastCard monthlyForecast={chart.monthlyForecast} />
        </ClassicCard>
      )}

      {/* 4.15 M12 日级吉凶日历（当月每日） */}
      {chart.dailyCalendar && (
        <ClassicCard>
          <SectionTitle
            title="日级吉凶日历"
            subtitle={`${chart.dailyCalendar.year}年${chart.dailyCalendar.month}月 · 每日干支 + 宜忌`}
          />
          <DailyCalendarCard dailyCalendar={chart.dailyCalendar} />
        </ClassicCard>
      )}

      {/* 4.16 M14/M15 命书（结构化 + 自然语言 + 一键导出） */}
      {chart.narrativeBook && (
        <ClassicCard>
          <SectionTitle
            title="命书全文"
            subtitle="14 章结构化命书 + Markdown 导出 + 自然语言长文"
          />
          <NarrativeBookCard narrativeBook={chart.narrativeBook} />
        </ClassicCard>
      )}

      {/* 5. 用神分析 + 格局判定（左右双卡，对标设计稿 02） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 用神分析 */}
        <ClassicCard>
          <SectionTitle title="用神分析" />
          <div className="flex gap-4 mt-2">
            {/* 第一用神 */}
            <div
              className="flex-1 text-center"
              style={{
                border: '1px solid rgba(184, 55, 47, 0.2)',
                borderRadius: 8,
                padding: '16px 12px',
              }}
            >
              <div className="font-classic text-xs mb-1" style={{ color: 'var(--color-cinnabar)', letterSpacing: '0.1em' }}>
                第一用神
              </div>
              <div style={{ fontSize: 32, marginBottom: 4 }}>
                {yongShen.primary[0] === '火' ? '🔥' : yongShen.primary[0] === '木' ? '🌳' : yongShen.primary[0] === '水' ? '💧' : yongShen.primary[0] === '金' ? '⚔️' : '⛰️'}
              </div>
              <div className="font-classic" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)' }}>
                {yongShen.primary[0]}
              </div>
            </div>
            {/* 第二用神 */}
            {yongShen.secondary.length > 0 && (
              <div
                className="flex-1 text-center"
                style={{
                  border: '1px solid var(--color-border-soft)',
                  borderRadius: 8,
                  padding: '16px 12px',
                }}
              >
                <div className="font-classic text-xs mb-1" style={{ color: 'var(--color-ink-light)', letterSpacing: '0.1em' }}>
                  第二用神
                </div>
                <div style={{ fontSize: 32, marginBottom: 4 }}>
                  {yongShen.secondary[0] === '火' ? '🔥' : yongShen.secondary[0] === '木' ? '🌳' : yongShen.secondary[0] === '水' ? '💧' : yongShen.secondary[0] === '金' ? '⚔️' : '⛰️'}
                </div>
                <div className="font-classic" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-ink)' }}>
                  {yongShen.secondary[0]}
                </div>
              </div>
            )}
          </div>
          <p className="text-sm leading-relaxed mt-3 mb-0" style={{ color: 'var(--color-ink-light)' }}>
            {yongShen.reason}
          </p>
        </ClassicCard>

        {/* 格局判定 */}
        <ClassicCard>
          <SectionTitle title="格局判定" />
          <div className="text-center mt-2">
            {/* 红色印章风格格局名 */}
            <div
              className="font-classic inline-block"
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--color-cinnabar)',
                border: '2px solid var(--color-cinnabar)',
                borderRadius: 8,
                padding: '8px 24px',
                letterSpacing: '0.15em',
                boxShadow: 'inset 0 0 0 1px rgba(184, 55, 47, 0.15)',
              }}
            >
              {geJu.name}（{geJu.type}）
            </div>
            <div className="font-classic mt-3 text-base" style={{ color: 'var(--color-ink)' }}>
              格局层次：{geJu.level}
            </div>
          </div>
          <p className="text-sm leading-relaxed mt-3 mb-0" style={{ color: 'var(--color-ink-light)' }}>
            {geJu.description}
          </p>
        </ClassicCard>
      </div>

      {/* 6. 神煞一览（吉/凶分组横排标签，对标设计稿 02） */}
      <ClassicCard>
        <SectionTitle title="神煞一览" />
        {/* 吉神 */}
        <div className="flex items-start gap-3 mb-4 flex-wrap">
          <span
            className="font-classic flex-shrink-0"
            style={{ color: '#6B8E23', fontSize: 15, fontWeight: 600, minWidth: 40 }}
          >
            吉神
          </span>
          <div className="flex flex-wrap gap-2">
            {shenShas
              .filter((s) => s.category === '吉神')
              .map((s) => (
                <span
                  key={s.name}
                  className="font-classic text-sm"
                  style={{
                    padding: '4px 12px',
                    borderRadius: 4,
                    background: 'rgba(107, 142, 35, 0.08)',
                    border: '1px solid rgba(107, 142, 35, 0.25)',
                    color: '#6B8E23',
                  }}
                  title={s.description}
                >
                  {s.name}
                </span>
              ))}
          </div>
        </div>
        {/* 凶神 */}
        <div className="flex items-start gap-3 flex-wrap">
          <span
            className="font-classic flex-shrink-0"
            style={{ color: '#C5392F', fontSize: 15, fontWeight: 600, minWidth: 40 }}
          >
            凶神
          </span>
          <div className="flex flex-wrap gap-2">
            {shenShas
              .filter((s) => s.category === '凶神')
              .map((s) => (
                <span
                  key={s.name}
                  className="font-classic text-sm"
                  style={{
                    padding: '4px 12px',
                    borderRadius: 4,
                    background: 'rgba(197, 57, 47, 0.06)',
                    border: '1px solid rgba(197, 57, 47, 0.2)',
                    color: '#C5392F',
                  }}
                  title={s.description}
                >
                  {s.name}
                </span>
              ))}
          </div>
        </div>
      </ClassicCard>

      {/* 7. 大运时间轴 */}
      <ClassicCard>
        <SectionTitle title="大运排盘" subtitle="十年一运 · 一生节奏" />
        <DayunTimeline daYuns={daYuns} startAge={chart.startAge} direction={chart.qiYunDirection} />
      </ClassicCard>

      {/* 7.5 M2.8 新增：人生时间轴（80 年长河 + 黄金期/谨慎期标注） */}
      <ClassicCard>
        <SectionTitle title="人生时间轴" subtitle="80 年长河 · 黄金期与谨慎期" />
        <LifeTimeline data={chart.lifeTimeline} />
      </ClassicCard>

      {/* 8. 要点发现（横向卡片网格+icon，对标设计稿 02） */}
      <ClassicCard>
        <SectionTitle title="要点发现" />
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
        >
          {keyFindings.map((f, i) => {
            const s = KEY_FINDING_STYLE[f.level];
            const icons = ['🧠', '💼', '❤️', '💰', '🌿'];
            return (
              <div
                key={i}
                style={{
                  background: s.bg,
                  borderRadius: 8,
                  padding: '16px 14px',
                  borderTop: `3px solid ${s.color}`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: 20 }}>{icons[i % icons.length]}</span>
                  <span className="font-classic text-sm font-semibold" style={{ color: s.color }}>
                    {f.title}
                  </span>
                </div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
                  {f.description}
                </div>
              </div>
            );
          })}
        </div>
      </ClassicCard>

      <ClassicDivider />
      <div className="text-center text-xs text-ink-light pb-4">
        — 以上为命理师审核版数据 · 审核通过后可推送消费者报告 —
      </div>
    </div>
  );
};
