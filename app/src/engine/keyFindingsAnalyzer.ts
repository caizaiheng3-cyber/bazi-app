// M2.6 keyFindings 整合引擎
//
// ⚠️ 基于 wangShuai / yongShen / geJu / shenShas / wuxingStats / pillars 六大数据源，
// 按规则引擎模式逐条检测"条件→结论"，自动生成 KeyFinding[] + 多法同断 Convergence。
//
// 规则清单（按优先级排列）：
//   R1 旺衰异常（极旺/极弱）→ red + convergence
//   R2 调候急需（冬火/夏水等）→ yellow + convergence
//   R3 五行偏枯（某五行 ≥35% 或 ≤5%）→ yellow
//   R4 格局特征（特殊格/破格/半成）→ yellow/green
//   R5 食伤泄秀天赋（用神含木/食伤透出）→ green + convergence
//   R6 比劫夺财（比劫旺+财星弱）→ yellow + convergence
//   R7 高价值神煞（天乙贵人/将星/魁罡）→ green
//   R8 警示神煞（阴阳差错/羊刃/亡神）→ yellow
//   R9 大运窗口（未来大运中用神匹配最高的那步）→ green
//
// 输出排序：red > yellow > green
//
// 验证基线（蔡蔡 1993-12-07 06:00 男，癸酉·癸亥·壬戌·癸卯）：
//   预期 ≥4 条关键发现，其中 ≥1 条 red（旺衰极旺），≥1 条带 convergence

import type {
  DaYun,
  KeyFinding,
  Pillar,
  ShenSha,
  WangShuai,
  WuXing,
  WuXingStat,
  YongShen,
  GeJu,
} from '../types/bazi';

// ===== 五行工具 =====

const WUXING_NAMES: WuXing[] = ['木', '火', '土', '金', '水'];

/** 天干 → 五行 */
function ganToWuXing(gan: string): WuXing {
  const MAP: Record<string, WuXing> = {
    甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
    己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
  };
  return MAP[gan] || '土';
}

/** 五行相克：克者 → 被克者 */
const WUXING_KE: Record<WuXing, WuXing> = {
  木: '土', 火: '金', 土: '水', 金: '木', 水: '火',
};

/** 五行相生：生者 → 被生者 */
const WUXING_SHENG: Record<WuXing, WuXing> = {
  木: '火', 火: '土', 土: '金', 金: '水', 水: '木',
};

/** 月支 → 当令季节标签 */
function getSeasonLabel(monthZhi: string): string {
  if (['寅', '卯'].includes(monthZhi)) return '春';
  if (['巳', '午'].includes(monthZhi)) return '夏';
  if (['申', '酉'].includes(monthZhi)) return '秋';
  if (['亥', '子'].includes(monthZhi)) return '冬';
  return '季月'; // 辰/未/戌/丑 四季土月
}

/** 月支 → 当令五行 */
function getMonthWuXing(monthZhi: string): WuXing {
  const MAP: Record<string, WuXing> = {
    寅: '木', 卯: '木', 巳: '火', 午: '火',
    申: '金', 酉: '金', 亥: '水', 子: '水',
    辰: '土', 未: '土', 戌: '土', 丑: '土',
  };
  return MAP[monthZhi] || '土';
}

// ===== 辅助 =====

function getWuXingPercent(stats: readonly WuXingStat[], wx: WuXing): number {
  const item = stats.find(s => s.wuxing === wx);
  return item ? item.percent : 0;
}

/** 大运干支 → 五行（取天干五行为主） */
function daYunToWuXing(ganZhi: string): WuXing {
  return ganToWuXing(ganZhi[0]);
}

// ===== 主入口 =====

export interface KeyFindingsInput {
  pillars: readonly Pillar[];
  wuxingStats: readonly WuXingStat[];
  wangShuai: WangShuai;
  yongShen: YongShen;
  geJu: GeJu;
  shenShas: readonly ShenSha[];
  daYuns: readonly DaYun[];
}

/**
 * 基于六大数据源，自动生成 keyFindings 关键发现 + 多法同断证据链
 */
export function analyzeKeyFindings(input: KeyFindingsInput): KeyFinding[] {
  const { pillars, wuxingStats, wangShuai, yongShen, geJu, shenShas, daYuns } = input;
  const dayGan = pillars[2].tianGan;
  const dayWx = ganToWuXing(dayGan);
  const monthZhi = pillars[1].diZhi;
  const season = getSeasonLabel(monthZhi);
  const findings: KeyFinding[] = [];

  // ====== R1：旺衰异常 ======
  {
    const conclusion = wangShuai.conclusion;
    const isExtreme = conclusion.includes('极旺') || conclusion.includes('极弱');
    const isBiased = conclusion.includes('偏旺') || conclusion.includes('偏弱');

    if (isExtreme) {
      const isStrong = conclusion.includes('旺');
      const wuxingPercent = getWuXingPercent(wuxingStats, dayWx);

      const methods: string[] = [];
      methods.push(`旺衰判定法：${conclusion}（得令/得地/得生三步综合）`);
      if (wuxingPercent >= 30) {
        methods.push(`五行占比法：${dayWx}占${wuxingPercent}%，远超均值20%`);
      }
      if (geJu.type === '偏格' || geJu.type === '特殊格') {
        methods.push(`格局法：${geJu.name}，${isStrong ? '日主旺势构成格局基础' : '日主弱势构成从格条件'}`);
      }
      if (yongShen.method === '调候') {
        methods.push(`调候法：${season}${dayWx}当令，${isStrong ? '旺势更显' : '弱势更显'}`);
      }

      findings.push({
        level: 'red',
        title: `${conclusion}，${dayWx}势${isStrong ? '汪洋' : '枯竭'}`,
        description: isStrong
          ? `${dayGan}${dayWx}生${monthZhi}月得令，${conclusion}。${dayWx}气占全局${wuxingPercent}%，最忌再行${getShengWoWuXing(dayWx)}之地。命运关键在于如何疏导和平衡这股${dayWx}势。`
          : `${dayGan}${dayWx}生${monthZhi}月失令，${conclusion}。${dayWx}气仅占全局${wuxingPercent}%，急需生扶。命运关键在于如何补充和壮大${dayWx}的根基。`,
        convergence: methods.length >= 2 ? {
          methods,
          conclusion: `${methods.length}种独立方法皆指向"${conclusion}"`,
          consumerNote: `"${isStrong ? '你的命格' + dayWx + '气极旺' : '你的命格' + dayWx + '气极弱'}"这一判断，先生从${methods.length}个完全不同的角度都看到了同样的结果。`,
        } : undefined,
      });
    } else if (isBiased) {
      findings.push({
        level: 'yellow',
        title: `${conclusion}`,
        description: `${dayGan}${dayWx}生${monthZhi}月，${conclusion}。整体格局尚属平衡范畴，但需注意${conclusion.includes('旺') ? '泄耗' : '生扶'}方向的调节。`,
      });
    }
  }

  // ====== R2：调候急需（冬缺火/夏缺水等） ======
  {
    if (yongShen.method === '调候') {
      const isWinter = ['亥', '子', '丑'].includes(monthZhi);
      const isSummer = ['巳', '午', '未'].includes(monthZhi);
      const firePercent = getWuXingPercent(wuxingStats, '火');
      const waterPercent = getWuXingPercent(wuxingStats, '水');

      if (isWinter && firePercent <= 10) {
        const methods: string[] = [
          `调候法：${monthZhi}月冬令寒凝，必以火暖`,
          `五行占比法：火气仅${firePercent}%，远低于均值20%`,
        ];
        // 检查十神缺位：财星（火）
        if (WUXING_KE[dayWx] === '火' || WUXING_SHENG[dayWx] === '火') {
          methods.push(`十神关联法：火对应${dayWx}日主的${WUXING_KE[dayWx] === '火' ? '财星' : '食伤'}，该十神力量薄弱`);
        }

        findings.push({
          level: 'yellow',
          title: `${season}${dayWx}寒凝，缺火调候`,
          description: `全局火气仅${firePercent}%，${season}${dayWx}无火则寒。内心常感"冷"——情感不易升温、易陷入理性自省。需要主动寻找让自己"暖"的人和事。`,
          convergence: methods.length >= 2 ? {
            methods,
            conclusion: `${methods.length}种独立方法皆指向"必须主动补火"`,
            consumerNote: '"你需要主动让自己温暖起来"这件事，先生从多方面看，都是同一个建议。',
          } : undefined,
        });
      } else if (isSummer && waterPercent <= 10) {
        const methods: string[] = [
          `调候法：${monthZhi}月夏令炎热，必以水润`,
          `五行占比法：水气仅${waterPercent}%，远低于均值20%`,
        ];

        findings.push({
          level: 'yellow',
          title: `${season}令炎热，缺水调候`,
          description: `全局水气仅${waterPercent}%，夏令无水则燥。需以水润之，增加冷静与内省的力量。`,
          convergence: methods.length >= 2 ? {
            methods,
            conclusion: `${methods.length}种独立方法皆指向"必须补水润燥"`,
          } : undefined,
        });
      }
    }
  }

  // ====== R3：五行偏枯（某五行 ≥35% 或 ≤5%，且非 R1/R2 已覆盖的日主五行） ======
  {
    for (const wx of WUXING_NAMES) {
      const pct = getWuXingPercent(wuxingStats, wx);
      // 日主五行的偏旺已在 R1 处理
      if (wx === dayWx) continue;

      if (pct >= 35) {
        findings.push({
          level: 'yellow',
          title: `${wx}气偏旺（占${pct}%）`,
          description: `${wx}在命局中占比${pct}%，远超均值20%，为偏旺之象。需注意${wx}所对应的十神力量过强带来的偏激倾向。`,
        });
      } else if (pct <= 5 && pct >= 0) {
        // 五行极弱（≤5%）
        const jiNames = yongShen.ji;
        const isJi = jiNames.includes(wx);
        if (!isJi) {
          // 缺的不是忌神 → 值得关注
          findings.push({
            level: 'yellow',
            title: `${wx}气极弱（仅${pct}%）`,
            description: `命局${wx}气几乎缺失，${wx}所代表的能量（${getWuXingMeaning(wx)}）不足，需在后天环境中适当补充。`,
          });
        }
      }
    }
  }

  // ====== R4：格局特征 ======
  {
    if (geJu.type === '特殊格') {
      findings.push({
        level: 'green',
        title: `特殊格局：${geJu.name}`,
        description: `命局构成${geJu.name}（${geJu.status}），${geJu.description || '此格局有特殊的成就路径，需顺势而为。'}`,
      });
    } else if (geJu.status === '破格') {
      findings.push({
        level: 'yellow',
        title: `格局受损：${geJu.name}（${geJu.status}）`,
        description: `${geJu.name}本有成格条件，但被命局中的克破力量所损。${geJu.description || '需在大运中寻找修复格局的契机。'}`,
      });
    }
  }

  // ====== R5：食伤泄秀天赋 ======
  {
    // 用神含食伤五行（日主所生），且四柱有食伤透出
    const foodWx = WUXING_SHENG[dayWx]; // 日主所生 = 食伤五行
    const isPrimaryOrSecondary = yongShen.primary.includes(foodWx) || yongShen.secondary.includes(foodWx);

    if (isPrimaryOrSecondary) {
      // 查找透出的食伤天干
      const foodGans: string[] = [];
      for (const p of pillars) {
        if (p.ganShiShen === '食神' || p.ganShiShen === '伤官') {
          foodGans.push(`${p.name || ''}干${p.tianGan}（${p.ganShiShen}）`);
        }
      }

      // 查找地支藏干中的食伤
      const foodCangGans: string[] = [];
      for (const p of pillars) {
        for (const cg of p.cangGan) {
          if (cg.shiShen === '食神' || cg.shiShen === '伤官') {
            foodCangGans.push(`${p.name || ''}${p.diZhi}藏${cg.gan}（${cg.shiShen}）`);
          }
        }
      }

      if (foodGans.length > 0 || foodCangGans.length > 0) {
        const methods: string[] = [];
        if (foodGans.length > 0) {
          methods.push(`原局透出法：${foodGans.join('、')}，食伤天干显露`);
        }
        methods.push(`用神契合法：${foodWx}（食伤）正合用神方向，泄秀为用`);
        if (yongShen.method === '调候') {
          methods.push(`调候配合法：${foodWx}能${foodWx === '火' ? '暖化' : foodWx === '水' ? '润泽' : '调和'}命局`);
        }

        const shiShenType = foodGans.length > 0
          ? (foodGans[0].includes('伤官') ? '伤官' : '食神')
          : '食伤';

        findings.push({
          level: 'green',
          title: `${foodWx}${shiShenType}泄秀，是命中天赋`,
          description: `${foodGans.length > 0 ? foodGans.join('、') : foodCangGans.join('、')}——主才华、表达、创造力。这是命里闪光的一笔，建议把"输出表达"作为人生主线。`,
          convergence: methods.length >= 2 ? {
            methods,
            conclusion: `${methods.length}种独立方法皆指向"${foodWx}${shiShenType}是核心天赋点"`,
            consumerNote: `"你天生有才华、要靠表达吃饭"这一点，是先生从多方面共同看到的天命。`,
          } : undefined,
        });
      }
    }
  }

  // ====== R6：比劫夺财 ======
  {
    const dayWxPercent = getWuXingPercent(wuxingStats, dayWx);
    const caiWx = WUXING_KE[dayWx]; // 日主所克 = 财星五行
    const caiPercent = getWuXingPercent(wuxingStats, caiWx);

    // 比劫旺（日主五行 ≥30%）且财星弱（财五行 ≤10%）
    if (dayWxPercent >= 30 && caiPercent <= 10) {
      const biJieCount = countShiShenInTianGan(pillars, ['比肩', '劫财']);

      if (biJieCount >= 2) {
        const methods: string[] = [
          `比劫旺度法：天干${biJieCount}个比劫透出，比劫力量极强`,
          `财星弱度法：${caiWx}（财星）仅${caiPercent}%，力薄受制`,
          `五行生克法：${dayWx}多直接克${caiWx}（财星），克力直接`,
        ];

        findings.push({
          level: 'yellow',
          title: '比劫成群，财易破耗',
          description: `天干${biJieCount}个比劫夺财，命中财星（${caiWx}）力薄。遇兄弟朋友合作易破财，建议财务独立、避免合伙、警惕"为情/为义"出资。`,
          convergence: {
            methods,
            conclusion: `${methods.length}种独立方法皆指向"命中财星易被夺"`,
            consumerNote: '"和朋友/合伙容易破财"这一规律，从命中多个层面看都是吻合的，是命格特征而非偶然。',
          },
        });
      }
    }
  }

  // ====== R7：高价值神煞 ======
  {
    const valuableShenShas = ['天乙贵人', '将星', '魁罡', '禄神'];
    const found = shenShas.filter(s => valuableShenShas.includes(s.name));
    if (found.length > 0) {
      const nameList = found.map(s => s.name).join('、');
      const descList = found.map(s => `${s.name}（${s.source.split('（')[0]}）`).join('；');
      findings.push({
        level: 'green',
        title: `命带${nameList}`,
        description: `${descList}。${found.some(s => s.name === '天乙贵人') ? '天乙贵人主一生贵人扶持；' : ''}${found.some(s => s.name === '将星') ? '将星主领导才能；' : ''}${found.some(s => s.name === '魁罡') ? '魁罡主刚毅聪敏；' : ''}${found.some(s => s.name === '禄神') ? '禄神主衣食无忧。' : ''}`,
      });
    }
  }

  // ====== R8：警示神煞 ======
  {
    const warningShenShas = ['阴阳差错', '羊刃', '亡神'];
    const found = shenShas.filter(s => warningShenShas.includes(s.name));
    if (found.length > 0) {
      const nameList = found.map(s => s.name).join('、');
      findings.push({
        level: 'yellow',
        title: `命带${nameList}，需注意化解`,
        description: found.map(s => `${s.name}：${s.description}`).join(' '),
      });
    }
  }

  // ====== R9：大运窗口 ======
  {
    if (daYuns.length > 0) {
      const primaryWxSet = new Set([...yongShen.primary, ...yongShen.secondary]);

      // 找未来（startAge > 当前可能的年龄范围）中用神匹配度最高的大运
      // 优先选后半段（≥31 岁）匹配用神的大运，若无则取首个匹配
      let bestDaYun: DaYun | null = null;
      let fallbackDaYun: DaYun | null = null;
      for (const dy of daYuns) {
        const dyWx = daYunToWuXing(dy.ganZhi);
        if (primaryWxSet.has(dyWx)) {
          if (!fallbackDaYun) fallbackDaYun = dy;
          if (dy.startAge >= 31 && !bestDaYun) {
            bestDaYun = dy;
          }
        }
      }
      if (!bestDaYun) bestDaYun = fallbackDaYun;

      if (bestDaYun) {
        const dyWx = daYunToWuXing(bestDaYun.ganZhi);
        const methods: string[] = [
          `大运五行法：${bestDaYun.ganZhi}天干${bestDaYun.ganZhi[0]}属${dyWx}，正合用神方向`,
          `十神契合法：${bestDaYun.shiShen}临命，${getShiShenMeaning(bestDaYun.shiShen)}`,
        ];

        findings.push({
          level: 'green',
          title: `${bestDaYun.startYear}年起进入${bestDaYun.shiShen}大运`,
          description: `${bestDaYun.startAge}岁起入${bestDaYun.ganZhi}大运（${bestDaYun.shiShen}），${dyWx}正合用神方向。${bestDaYun.brief || ''}`,
          convergence: methods.length >= 2 ? {
            methods,
            conclusion: `${methods.length}种独立方法皆指向"${bestDaYun.startYear}年是重要运势转折"`,
            consumerNote: `"${bestDaYun.startAge}岁是重要转折点"这个时间，是先生从大运五行、十神等方面共同看到的窗口期。`,
          } : undefined,
        });
      }
    }
  }

  // ====== 排序：red > yellow > green ======
  const LEVEL_ORDER: Record<KeyFinding['level'], number> = { red: 0, yellow: 1, green: 2 };
  findings.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  return findings;
}

// ===== 辅助工具 =====

/** 返回"生扶日主的两类五行"描述，如水日主 → "金水"（金生水 + 水帮水） */
function getShengWoWuXing(dayWx: WuXing): string {
  // 生我者（印星五行）
  const SHENG_WO: Record<WuXing, WuXing> = {
    木: '水', 火: '木', 土: '火', 金: '土', 水: '金',
  };
  const yinWx = SHENG_WO[dayWx];
  return `${yinWx}${dayWx}`;
}

function countShiShenInTianGan(pillars: readonly Pillar[], targetShiShen: string[]): number {
  let count = 0;
  // 年/月/时干（日干=日主不计）
  for (let i = 0; i < pillars.length; i++) {
    if (i === 2) continue; // 跳过日干
    if (targetShiShen.includes(pillars[i].ganShiShen)) count++;
  }
  return count;
}

function getWuXingMeaning(wx: WuXing): string {
  const MAP: Record<WuXing, string> = {
    木: '生长、规划、仁爱',
    火: '热情、表达、礼仪',
    土: '稳重、包容、信用',
    金: '决断、义气、刚毅',
    水: '智慧、流动、变通',
  };
  return MAP[wx];
}

function getShiShenMeaning(shiShen: string): string {
  const MAP: Record<string, string> = {
    正官: '事业格局得正星，利权位',
    七杀: '杀星临命，利魄力与突破',
    正印: '印星纯净，利学业与贵人',
    偏印: '偏印灵感，利技术与独创',
    正财: '正财稳健，利务实收入',
    偏财: '偏财投资，利横财与社交',
    食神: '食神福禄，利创作与享受',
    伤官: '伤官才华，利表达与创新',
    比肩: '比肩同辈，利合作与竞争',
    劫财: '劫财争夺，需谨防破财',
  };
  return MAP[shiShen] || shiShen;
}
