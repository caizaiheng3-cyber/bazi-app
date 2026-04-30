import type { WuXing, TianGan, DiZhi } from '../../types/bazi';

/** 天干 → 五行 */
export const TIAN_GAN_TO_WUXING: Record<TianGan, WuXing> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

/** 地支 → 五行（本气） */
export const DI_ZHI_TO_WUXING: Record<DiZhi, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木',
  辰: '土', 巳: '火', 午: '火', 未: '土',
  申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/** 五行对应的颜色 className（与 global.css 中定义匹配） */
export const WUXING_CLASS: Record<WuXing, string> = {
  金: 'wuxing-jin',
  木: 'wuxing-mu',
  水: 'wuxing-shui',
  火: 'wuxing-huo',
  土: 'wuxing-tu',
};

/** 五行对应的纯色（用于图表/进度条） */
export const WUXING_COLOR: Record<WuXing, string> = {
  金: '#B8860B',
  木: '#6B8E23',
  水: '#1E6091',
  火: '#C5392F',
  土: '#8B6F47',
};

export function getGanWuxingClass(gan: TianGan): string {
  return WUXING_CLASS[TIAN_GAN_TO_WUXING[gan]];
}

export function getZhiWuxingClass(zhi: DiZhi): string {
  return WUXING_CLASS[DI_ZHI_TO_WUXING[zhi]];
}
