import React from 'react';
import type { ChartRelations, Persona, PersonaTrait } from '../../types/bazi';

/**
 * 命格特征卡（专业模式）
 *
 * 基于 personaAnalyzer 输出 Persona（6 维交叉画像 + 干支动态关系）做古典美学呈现：
 *   ① 一句话画像（顶部印章式）
 *   ② 关键词云
 *   ③ 6 维度卡片（基底/气质/主旋律/角色/心性/亮点）
 *   ④ 干支动态关系网（合化/三合/六合/六冲/三刑 + 外显实质标注）—— 方案 B 新增
 *   ⑤ 优势 vs 注意 双栏
 *   ⑥ 多法同断（如有）
 */
export const PersonaCard: React.FC<{ persona: Persona; relations?: ChartRelations }> = ({
  persona,
  relations,
}) => {
  const {
    oneLiner,
    baseTone,
    innerNature,
    lifeTheme,
    socialRole,
    mentality,
    highlights,
    strengths,
    cautions,
    keywords,
    confidence,
    convergence,
  } = persona;

  return (
    <div>
      {/* ① 顶部一句话画像（印章风） */}
      <div
        className="relative"
        style={{
          textAlign: 'center',
          padding: '20px 18px 22px',
          background:
            'radial-gradient(ellipse at center, var(--color-paper-card) 0%, var(--color-paper-card-soft) 100%)',
          borderTop: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.5))',
          borderBottom: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.5))',
          marginBottom: 16,
        }}
      >
        {convergence && (
          <span
            className="convergence-seal font-classic"
            style={{
              position: 'absolute',
              top: 14,
              right: 16,
              fontSize: 11,
              padding: '3px 8px',
              letterSpacing: '0.1em',
            }}
          >
            ◆ 多法同断
          </span>
        )}
        <div
          className="text-xs font-classic"
          style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.3em', marginBottom: 10 }}
        >
          命 格 一 句 話
        </div>
        <div
          className="font-classic mx-auto"
          style={{
            fontSize: 17,
            lineHeight: 1.85,
            color: 'var(--color-ink)',
            maxWidth: 720,
            letterSpacing: '0.05em',
            fontWeight: 500,
          }}
        >
          {oneLiner}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <span className="text-ink-soft font-classic">综合置信度</span>
          <span className="text-gold tracking-widest" style={{ fontSize: 16 }}>
            {'★'.repeat(confidence)}
            <span style={{ color: 'rgba(184, 134, 11, 0.3)' }}>
              {'☆'.repeat(5 - confidence)}
            </span>
          </span>
        </div>
      </div>

      {/* ② 关键词云 */}
      {keywords.length > 0 && (
        <div className="mb-5">
          <div
            className="text-xs font-classic mb-2"
            style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.2em' }}
          >
            ◇ 关键词
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k, i) => (
              <span
                key={i}
                className="font-classic"
                style={{
                  fontSize: 13,
                  padding: '4px 12px',
                  borderRadius: 14,
                  background: 'var(--color-paper-card-soft)',
                  border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.7))',
                  color: 'var(--color-ink)',
                  letterSpacing: '0.05em',
                }}
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ③ 6 维度卡片 */}
      <div
        className="text-xs font-classic mb-2"
        style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.2em' }}
      >
        ◇ 六维拆解
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <DimensionCard index={1} trait={baseTone} accent="cinnabar" />
        <DimensionCard index={2} trait={innerNature} accent="gold" />
        <DimensionCard index={3} trait={lifeTheme} accent="green" />
        <DimensionCard index={4} trait={socialRole} accent="ink" />
      </div>
      {/* 心性 / 亮点：可能多条，单独成块 */}
      {mentality.length > 0 && (
        <div className="mb-4">
          <div
            className="text-xs font-classic mb-2"
            style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.15em' }}
          >
            五·十神组合心性（{mentality.length} 条）
          </div>
          <div className="space-y-2">
            {mentality.map((m, i) => (
              <SubTraitRow key={i} trait={m} />
            ))}
          </div>
        </div>
      )}
      {highlights.length > 0 && (
        <div className="mb-5">
          <div
            className="text-xs font-classic mb-2"
            style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.15em' }}
          >
            六·神煞亮点（{highlights.length} 条）
          </div>
          <div className="space-y-2">
            {highlights.map((h, i) => (
              <SubTraitRow key={i} trait={h} />
            ))}
          </div>
        </div>
      )}

      {/* ④ 干支动态关系网（方案 B 新增） */}
      {relations && <RelationsSection relations={relations} />}

      {/* ⑤ 优势 / 注意 双栏 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <ListBox
          title="优势天赋"
          icon="✦"
          accentColor="#6B8E23"
          bg="rgba(107, 142, 35, 0.06)"
          borderColor="rgba(107, 142, 35, 0.25)"
          items={strengths}
          emptyText="暂无显著优势项"
        />
        <ListBox
          title="需要注意"
          icon="✧"
          accentColor="#C5392F"
          bg="rgba(197, 57, 47, 0.05)"
          borderColor="rgba(197, 57, 47, 0.2)"
          items={cautions}
          emptyText="暂无显著警示项"
        />
      </div>

      {/* ⑥ 多法同断详情 */}
      {convergence && (
        <div className="convergence-card mt-2 p-4 rounded">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="convergence-seal">多法同断</span>
            <span className="text-sm text-ink-light">
              {convergence.methods.length} 种方法共同印证
            </span>
          </div>
          {convergence.conclusion && (
            <div
              className="text-sm font-classic mb-2"
              style={{ color: 'var(--color-ink)', fontStyle: 'italic' }}
            >
              "{convergence.conclusion}"
            </div>
          )}
          <div className="convergence-methods">
            <ul>
              {convergence.methods.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 子组件
// ============================================================

const ACCENT: Record<string, { main: string; bg: string; border: string }> = {
  cinnabar: { main: 'var(--color-cinnabar)', bg: 'rgba(184, 55, 47, 0.05)', border: 'rgba(184, 55, 47, 0.2)' },
  gold:     { main: 'var(--color-gold)',     bg: 'rgba(184, 134, 11, 0.05)', border: 'rgba(184, 134, 11, 0.25)' },
  green:    { main: '#6B8E23',               bg: 'rgba(107, 142, 35, 0.05)', border: 'rgba(107, 142, 35, 0.25)' },
  ink:      { main: 'var(--color-ink)',      bg: 'rgba(58, 47, 36, 0.04)',   border: 'rgba(58, 47, 36, 0.18)' },
};

const CLASSIC_NUM = ['壹', '貳', '叁', '肆', '伍', '陸'];

const DimensionCard: React.FC<{
  index: number;
  trait: PersonaTrait;
  accent: keyof typeof ACCENT;
}> = ({ index, trait, accent }) => {
  const c = ACCENT[accent];
  return (
    <div
      className="rounded-md"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.main}`,
        padding: '12px 14px',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="font-classic flex items-center justify-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: `1.5px solid ${c.main}`,
            color: c.main,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {CLASSIC_NUM[index - 1] || index}
        </span>
        <span
          className="text-xs font-classic"
          style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.1em' }}
        >
          {trait.dimension}
        </span>
      </div>
      <div
        className="font-classic mb-1.5"
        style={{ fontSize: 15, fontWeight: 600, color: c.main, letterSpacing: '0.05em' }}
      >
        {trait.tag}
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.7,
          color: 'var(--color-ink-light)',
        }}
      >
        {trait.description}
      </div>
      {trait.source && (
        <div
          className="mt-2 text-xs"
          style={{ color: 'var(--color-ink-soft)', fontStyle: 'italic' }}
        >
          典出：{trait.source}
        </div>
      )}
    </div>
  );
};

const SubTraitRow: React.FC<{ trait: PersonaTrait }> = ({ trait }) => {
  // 根据维度名给左侧边色：显象类用专属配色
  const accent = getSubTraitAccent(trait.dimension, trait.tag);
  return (
    <div
      className="rounded"
      style={{
        background: 'var(--color-paper-card-soft)',
        border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.6))',
        borderLeft: accent ? `3px solid ${accent}` : undefined,
        padding: '10px 14px',
      }}
    >
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span
          className="font-classic"
          style={{ fontSize: 14, fontWeight: 600, color: accent || 'var(--color-ink)' }}
        >
          {trait.tag}
        </span>
        {trait.source && (
          <span
            className="text-xs"
            style={{ color: 'var(--color-ink-soft)', fontStyle: 'italic' }}
          >
            · {trait.source}
          </span>
        )}
      </div>
      <div
        style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-ink-light)' }}
      >
        {trait.description}
      </div>
    </div>
  );
};

/** 子条目左边色：外显/内蕴/虚位 三种显象层级 + 干支关系类 */
function getSubTraitAccent(dimension: string, tag: string): string | undefined {
  if (dimension === '显象·外显' || tag.startsWith('外显★')) return 'var(--color-cinnabar)';
  if (dimension === '显象·内蕴' || tag.startsWith('内蕴☆')) return '#6B8E23';
  if (dimension === '显象·虚位' || tag.startsWith('虚位△')) return 'rgba(58, 47, 36, 0.4)';
  if (dimension === '干支关系') return 'var(--color-gold)';
  return undefined;
}

// ============================================================
// 干支动态关系网区块（方案 B 新增）—— 命理学的"动态作用层"
// ============================================================

const RelationsSection: React.FC<{ relations: ChartRelations }> = ({ relations }) => {
  const {
    ganHeHua,
    ganChong,
    zhiSanHui,
    zhiSanHe,
    zhiLiuHe,
    zhiChong,
    zhiXing,
    zhengHeOrDuHe,
    anHe,
    xunKong,
    manifestation,
    keyThemes,
  } = relations;

  const hasAnyRelation =
    ganHeHua.length + ganChong.length + zhiSanHui.length + zhiSanHe.length +
    zhiLiuHe.length + zhiChong.length + zhiXing.length +
    zhengHeOrDuHe.length + anHe.length > 0;

  // V2 升级显象统计：包含新增的 absent-empty
  const manifestCounts = {
    strong: manifestation.filter((m) => m.level === 'manifest-strong').length,
    hiddenStrong: manifestation.filter((m) => m.level === 'hidden-strong').length,
    weak: manifestation.filter((m) => m.level === 'manifest-weak').length,
    hiddenWeak: manifestation.filter((m) => m.level === 'hidden-weak').length,
    absentEmpty: manifestation.filter((m) => m.level === 'absent-empty').length,
  };
  // 落空亡的十神（用于在徽章下方做单独提示）
  const xunKongAffected = manifestation.filter((m) => m.inXunKong);

  return (
    <div className="mb-5">
      <div
        className="text-xs font-classic mb-2"
        style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.2em' }}
      >
        ◇ 干支动态关系网（命理「动态作用层」）
      </div>

      <div
        className="rounded-md"
        style={{
          background: 'rgba(184, 134, 11, 0.04)',
          border: '1px solid rgba(184, 134, 11, 0.22)',
          borderLeft: '3px solid var(--color-gold)',
          padding: '14px 16px',
        }}
      >
        {/* —— 关键主题（高权重事件优先展示）—— */}
        {keyThemes.length > 0 ? (
          <>
            <div
              className="font-classic mb-2"
              style={{ fontSize: 13, color: 'var(--color-ink)', letterSpacing: '0.1em' }}
            >
              <span style={{ color: 'var(--color-gold)' }}>⚑</span> 命格主题级关键事件
            </div>
            <div className="space-y-2 mb-3">
              {keyThemes.slice(0, 6).map((t, i) => (
                <RelationThemeRow key={i} theme={t} />
              ))}
            </div>
          </>
        ) : (
          <div
            className="text-sm"
            style={{ color: 'var(--color-ink-light)', fontStyle: 'italic', marginBottom: 8 }}
          >
            原局四柱之间无显著的合冲刑害作用，命局结构稳定，事件触发主要依赖大运流年引动。
          </div>
        )}

        {/* —— 关系矩阵（二级网格，按命理优先级展示）—— */}
        {hasAnyRelation && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            <RelationStat label="天干合化" count={ganHeHua.length} important={ganHeHua.some((x) => x.huaSuccess)} />
            <RelationStat label="地支三会" count={zhiSanHui.length} important={zhiSanHui.length > 0} />
            <RelationStat label="地支三合" count={zhiSanHe.filter((x) => x.type === '地支三合').length} important={zhiSanHe.some((x) => x.type === '地支三合')} />
            <RelationStat label="半三合" count={zhiSanHe.filter((x) => x.type === '地支半三合').length} />
            <RelationStat label="地支六合" count={zhiLiuHe.length} />
            <RelationStat label="地支六冲" count={zhiChong.filter((x) => !x.resolvedByHe).length} important={zhiChong.some((x) => !x.resolvedByHe && x.strength === 'strong')} />
            <RelationStat label="地支三刑" count={zhiXing.filter((x) => !x.resolvedByHe).length} important={zhiXing.some((x) => !x.resolvedByHe)} />
            <RelationStat label="天干相冲" count={ganChong.length} />
            {/* V2 新增：争合 / 妒合 / 暗合 */}
            <RelationStat label="争合·妒合" count={zhengHeOrDuHe.length} important={zhengHeOrDuHe.length > 0} />
            <RelationStat label="地支暗合" count={anHe.length} important={anHe.some((x) => x.strength !== 'weak')} />
          </div>
        )}

        {/* —— V2 新增：旬空（空亡）专用展示行 —— */}
        <XunKongSection xunKong={xunKong} affected={xunKongAffected} />

        {/* —— 显象层级图例 —— */}
        <div
          className="font-classic mt-3 mb-2"
          style={{ fontSize: 13, color: 'var(--color-ink)', letterSpacing: '0.1em' }}
        >
          <span style={{ color: 'var(--color-gold)' }}>◈</span> 十神显象层级（外显 vs 实质）
        </div>
        <div className="flex flex-wrap gap-2">
          <ManifestBadge label="外显·实力派" count={manifestCounts.strong} color="var(--color-cinnabar)" desc="透干 + 通根" />
          <ManifestBadge label="内蕴·实质" count={manifestCounts.hiddenStrong} color="#6B8E23" desc="本气藏支不透" />
          <ManifestBadge label="外显·虚位" count={manifestCounts.weak} color="rgba(58, 47, 36, 0.5)" desc="透干无根" />
          <ManifestBadge label="内蕴·潜藏" count={manifestCounts.hiddenWeak} color="rgba(58, 47, 36, 0.35)" desc="仅中余气" />
          {manifestCounts.absentEmpty > 0 && (
            <ManifestBadge
              label="虚位·空亡"
              count={manifestCounts.absentEmpty}
              color="rgba(184, 55, 47, 0.55)"
              desc="透干无根 + 落空亡，几乎完全不存在"
            />
          )}
        </div>
        <div
          className="mt-2 text-xs"
          style={{ color: 'var(--color-ink-soft)', fontStyle: 'italic', lineHeight: 1.7 }}
        >
          说明：「外显」是别人能看到的特质，「内蕴」是命主内心的真实诉求；「实力派」有根能落地，「虚位」看似有实则空。
          四级标注源自《滴天髓·论用神》「透干通根，方为真神」与《子平真诠·论藏干》。
        </div>
      </div>
    </div>
  );
};

const RelationThemeRow: React.FC<{
  theme: ChartRelations['keyThemes'][number];
}> = ({ theme }) => {
  const weightColor =
    theme.weight === 'highest' ? 'var(--color-cinnabar)' :
    theme.weight === 'high' ? 'var(--color-gold)' :
    'var(--color-ink-soft)';
  const weightSymbol =
    theme.weight === 'highest' ? '★' : theme.weight === 'high' ? '▲' : '·';
  const weightLabel =
    theme.weight === 'highest' ? '极高' : theme.weight === 'high' ? '高' : '中';
  return (
    <div
      style={{
        background: 'var(--color-paper-card-soft)',
        border: '1px solid var(--color-border-soft, rgba(212, 200, 168, 0.55))',
        padding: '8px 12px',
        borderRadius: 4,
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <span style={{ color: weightColor, fontWeight: 700, fontSize: 14 }}>{weightSymbol}</span>
        <span
          className="font-classic"
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}
        >
          {theme.title}
        </span>
        <span
          className="text-xs"
          style={{
            color: weightColor,
            border: `1px solid ${weightColor}`,
            padding: '1px 6px',
            borderRadius: 8,
            opacity: 0.85,
          }}
        >
          权重·{weightLabel}
        </span>
      </div>
      <div
        style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--color-ink-light)' }}
      >
        {theme.description}
      </div>
      <div
        className="mt-1 text-xs"
        style={{ color: 'var(--color-ink-soft)', fontStyle: 'italic' }}
      >
        典出：{theme.source}
      </div>
    </div>
  );
};

const RelationStat: React.FC<{ label: string; count: number; important?: boolean }> = ({
  label, count, important,
}) => {
  const isActive = count > 0;
  return (
    <div
      style={{
        background: isActive ? (important ? 'rgba(184, 55, 47, 0.08)' : 'var(--color-paper-card-soft)') : 'transparent',
        border: `1px solid ${isActive ? (important ? 'rgba(184, 55, 47, 0.3)' : 'var(--color-border-soft, rgba(212, 200, 168, 0.6))') : 'rgba(212, 200, 168, 0.3)'}`,
        borderRadius: 4,
        padding: '6px 10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: isActive ? 1 : 0.45,
      }}
    >
      <span
        className="font-classic text-xs"
        style={{ color: 'var(--color-ink-light)', letterSpacing: '0.05em' }}
      >
        {label}
      </span>
      <span
        className="font-classic"
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: isActive ? (important ? 'var(--color-cinnabar)' : 'var(--color-ink)') : 'var(--color-ink-soft)',
        }}
      >
        {count}
      </span>
    </div>
  );
};

/**
 * V2 新增：旬空（空亡）专用展示区块
 * 展示日柱所属旬名 → 空亡两支 → 命中情况 → 受影响的十神
 */
const XunKongSection: React.FC<{
  xunKong: ChartRelations['xunKong'];
  affected: ChartRelations['manifestation'];
}> = ({ xunKong, affected }) => {
  const isHit = xunKong.hitPositions.length > 0;
  const accentColor = isHit ? 'var(--color-cinnabar)' : '#6B8E23';
  const bgColor = isHit ? 'rgba(184, 55, 47, 0.06)' : 'rgba(107, 142, 35, 0.06)';
  const borderColor = isHit ? 'rgba(184, 55, 47, 0.25)' : 'rgba(107, 142, 35, 0.25)';

  return (
    <div
      className="mt-3 mb-3 rounded"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${accentColor}`,
        padding: '10px 12px',
      }}
    >
      <div className="flex items-baseline gap-2 flex-wrap mb-2">
        <span
          className="font-classic"
          style={{ fontSize: 13, fontWeight: 700, color: accentColor, letterSpacing: '0.1em' }}
        >
          ◇ 旬空（空亡）
        </span>
        <span
          className="text-xs font-classic"
          style={{
            padding: '1px 8px',
            borderRadius: 8,
            background: 'var(--color-paper-card-soft)',
            border: `1px dashed ${borderColor}`,
            color: 'var(--color-ink-light)',
            letterSpacing: '0.05em',
          }}
        >
          {xunKong.xunName}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
          空在「
          <span style={{ color: accentColor, fontWeight: 700 }}>
            {xunKong.emptyZhi.join('、')}
          </span>
          」
        </span>
        <span
          className="text-xs"
          style={{
            padding: '1px 8px',
            borderRadius: 8,
            background: isHit ? accentColor : 'rgba(107, 142, 35, 0.15)',
            color: isHit ? '#fff7e6' : '#6B8E23',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          {isHit ? `命中 ${xunKong.hitPositions.length} 处` : '全盘不犯'}
        </span>
      </div>
      <div
        style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--color-ink-light)' }}
      >
        {xunKong.description}
      </div>
      {/* 命中详情 */}
      {isHit && (
        <div className="mt-2 space-y-1">
          {xunKong.hitPositions.map((h, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                padding: '4px 8px',
                background: 'var(--color-paper-card-soft)',
                borderRadius: 3,
                color: 'var(--color-ink-light)',
              }}
            >
              <span style={{ color: accentColor, fontWeight: 600 }}>
                {posLabel(h.pos)}支{h.zhi}
              </span>
              <span> · {h.palaceImpact}</span>
            </div>
          ))}
        </div>
      )}
      {/* 受影响的十神 */}
      {affected.length > 0 && (
        <div className="mt-2">
          <div
            className="text-xs mb-1"
            style={{ color: 'var(--color-ink-soft)', letterSpacing: '0.05em' }}
          >
            受空亡影响的十神（已自动降级判读）：
          </div>
          <div className="flex flex-wrap gap-1.5">
            {affected.map((m, i) => (
              <span
                key={i}
                className="font-classic"
                style={{
                  fontSize: 11.5,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: 'rgba(184, 55, 47, 0.08)',
                  border: '1px dashed rgba(184, 55, 47, 0.3)',
                  color: 'var(--color-cinnabar)',
                  letterSpacing: '0.03em',
                }}
                title={m.description}
              >
                {m.shiShen}
                {m.originalLevel && (
                  <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>
                    ({levelShortLabel(m.originalLevel)} → {levelShortLabel(m.level)})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** 柱位中文短标 —— 给 XunKongSection 复用 */
function posLabel(pos: 0 | 1 | 2 | 3): string {
  return ['年', '月', '日', '时'][pos];
}

/** 显象等级 → 极简短标，用于"原 → 现"的箭头展示 */
function levelShortLabel(level: ChartRelations['manifestation'][number]['level']): string {
  switch (level) {
    case 'manifest-strong': return '外显实力';
    case 'manifest-weak': return '外显虚位';
    case 'hidden-strong': return '内蕴实质';
    case 'hidden-weak': return '内蕴潜藏';
    case 'absent-empty': return '虚位空亡';
    case 'absent': return '不显';
    default: return level;
  }
}

const ManifestBadge: React.FC<{ label: string; count: number; color: string; desc: string }> = ({
  label, count, color, desc,
}) => {
  return (
    <span
      className="font-classic"
      style={{
        fontSize: 12,
        padding: '4px 10px',
        borderRadius: 12,
        background: 'var(--color-paper-card-soft)',
        border: `1px solid ${color}`,
        color,
        letterSpacing: '0.05em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
      title={desc}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 700 }}>{count}</span>
    </span>
  );
};

const ListBox: React.FC<{
  title: string;
  icon: string;
  accentColor: string;
  bg: string;
  borderColor: string;
  items: readonly string[];
  emptyText: string;
}> = ({ title, icon, accentColor, bg, borderColor, items, emptyText }) => {
  return (
    <div
      className="rounded-md"
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        padding: '12px 16px',
      }}
    >
      <div
        className="font-classic mb-2 flex items-center gap-2"
        style={{ fontSize: 14, fontWeight: 700, color: accentColor, letterSpacing: '0.1em' }}
      >
        <span>{icon}</span>
        <span>{title}</span>
        <span className="text-xs" style={{ color: 'var(--color-ink-soft)', fontWeight: 400 }}>
          ({items.length})
        </span>
      </div>
      {items.length > 0 ? (
        <ul
          className="m-0 pl-5 space-y-1"
          style={{ fontSize: 13, color: 'var(--color-ink-light)', lineHeight: 1.75 }}
        >
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      ) : (
        <div
          className="text-xs italic"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          {emptyText}
        </div>
      )}
    </div>
  );
};
