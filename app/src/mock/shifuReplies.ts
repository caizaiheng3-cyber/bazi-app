// 先生回话样例库（M7 阶段 Mock · 后续由真实引擎替换）
// 数据严格对照《输出模板.md》模板三的 4 个示例

import type { ShifuReply } from '../types/bazi';

/** 场景 1：决策建议 · 今日面试要不要去 */
export const replyDecisionInterview: ShifuReply = {
  empathy:
    '先生明白您的为难——身体不适又怕错过机会，这种两难每个人都会遇到。您愿意在犹豫时先停下来请教，已经是难得的审慎。',
  explanation:
    '今日丁酉，天干丁火与您日主丙火同气，本是助身之日；但地支酉金为您的正财，与日支寅木相冲，主"外物来动您的根基"。加上您原局五行水气偏弱、官杀力不足，外界推力本就不够，此时硬撑赴约，身子易倦、谈判亦难占上风。若延至明日戊戌，戊土泄火生金，反而气场顺畅。',
  suggestion:
    '① 主动联系对方，礼貌说明身体状况，提议改约明日或本周五（庚子日）；\n② 今日上午巳时（09:00-11:00）准备好面试资料与问题清单，为改期做足功课；\n③ 今日多饮温水、少思虑，傍晚早睡，养回精神再战。',
  verdict: '慎',
  basis: {
    liuRi: '丁酉日 · 天干助身、地支冲日支',
    yongShen: '用神为金土，今日酉金虽旺但与寅相冲，非顺用',
    daYun: '辛巳大运 · 正财得地期',
  },
  bestTiming: '明日戊戌日巳时（09:00-11:00）',
  relatedFocus: '事业',
};

/** 场景 1 · 追问：改本周五（庚子日）是否更好 */
export const replyDecisionInterviewFollowup: ShifuReply = {
  empathy:
    '您愿意再细推一步，是稳重之举。改期之事，差一日气场便差一档，多问一句总是值得的。',
  explanation:
    '本周五庚子日，庚金透干正为您的偏财当旺之日，地支子水为官星，财官相生。对您这种"命中需外力推动"的格局，庚子日谈事，最能借势。时辰上建议巳时或午时，丙丁火当令，日主得气，表达清晰有底气。',
  suggestion:
    '① 主动提议改约本周五上午，时段首选 09:30-11:00；\n② 约前一晚准备三个核心问题，避免临场发挥失准；\n③ 着装以白、金、米色为主，合庚金之气。',
  verdict: '宜',
  basis: {
    liuRi: '庚子日 · 偏财透干、财官相生',
    yongShen: '庚金为您主用神，当日气场最合',
    daYun: '辛巳大运',
  },
  bestTiming: '本周五庚子日 巳时（09:30-11:00）',
  relatedFocus: '事业',
};

/** 场景 2：时机择吉 · 下周签约哪天最好 */
export const replyTimingSigning: ShifuReply = {
  empathy:
    '签约是大事，您愿意提前择吉、把慎重做在事前，这份用心本身就是对合约最大的加持。',
  explanation:
    '下周七日，以 5 月 2 日癸卯日最佳。癸水为您命中喜用通关之神（金生水以润火），卯木虽为忌神之一，但被日支寅木拱合，反成"木火通明"之象，利于签字落笔、辞章清晰。次选 5 月 5 日丙午日，日主自旺，面谈气场足，但易急躁，宜事前充分沟通细节后再签。避开 5 月 4 日乙巳日——乙木泄金、巳火克金，用神受制，合约条款易有疏漏。',
  suggestion:
    '① 首选 5 月 2 日癸卯日巳时（09:00-11:00）正式签字；\n② 签字前一日准备好所有附件与版本对照表，避免临场改动；\n③ 签字地点尽量选偏西/西南方位的会议室，合您用神金土之气。',
  verdict: '宜',
  basis: {
    liuRi: '癸卯日 · 通关喜神、木火通明',
    liuYue: '辛巳月 · 偏财月，利财务类决策',
    yongShen: '癸水为通关神，正合签约"润笔"之意',
  },
  bestTiming: '5 月 2 日癸卯日 巳时（09:00-11:00）',
  relatedFocus: '事业',
};

/** 场景 3：每日宜忌 · 今日一天该注意什么 */
export const replyDailyTips: ShifuReply = {
  empathy:
    '您每日开盘来问，是把命理当作清晨的一杯茶。先生很乐意陪您过这一天。',
  explanation:
    '今日丁酉。丁火助身、酉金为财，但寅酉相害（日支受扰），整体是"财气旺而根基动"的日子。上午巳时火气最顺，适合主动出击；午后未时容易心烦、易与人起口舌；傍晚酉时财星当值，反而是复盘盘账的好时段。',
  suggestion:
    '① **宜**：谋事、见客、复盘账目；\n② **忌**：远行、动土、大额借贷；\n③ **慎**：口舌之争、冲动签字；\n④ 吉时巳时 09-11、酉时 17-19；凶时未时 13-15。',
  verdict: '中性',
  basis: {
    liuRi: '丁酉日 · 助身却扰根',
    yongShen: '酉金为用神当值，但与日支相害',
  },
  relatedFocus: '事业',
};

/** 场景 4：开放问答 · 最近总是失眠，是不是流年不好 */
export const replyOpenInsomnia: ShifuReply = {
  empathy:
    '失眠久了，人会生出一种说不出的孤独——明明没病，却总觉得哪里不对。您愿意从命理的角度来问，先生听着心里也沉。',
  explanation:
    '您的日主丙火，本就"心神外露"，睡眠易受扰。当前辛巳大运为正财得地期，财星当旺会耗心神；加上今年丙午流年比肩旺，心气浮动，遇到压力更容易失眠。这不是单一流年的问题，七分在大运、三分在流年。好消息是，今年过后进入丁未流年，未土收敛火气，睡眠会自然转好。',
  suggestion:
    '① 22:30 前入睡，避免子时（23-01）仍在思虑；\n② 卧室方位尽量在家中西侧或西北，合金土用神；\n③ 睡前饮温水半杯，避开浓茶咖啡；\n④ 可佩戴白水晶或银饰，辅助静心；\n⑤ 若半年未改善，请务必就医——命理只是一面镜子，不能代替医嘱。',
  verdict: '慎',
  basis: {
    daYun: '辛巳大运 · 正财耗神',
    liuNian: '丙午流年 · 比肩旺，心气浮动',
    yongShen: '用神金土，需收敛火气',
  },
  relatedFocus: '健康',
};

/** 兜底回话：匹配不到任何关键词时使用 */
export const replyFallback: ShifuReply = {
  empathy:
    '您的这个问题，先生需要细细思量。人生之事千头万绪，命理只是其中一盏灯。',
  explanation:
    '以您当前辛巳大运、丙午流年、丁酉流日三者合参，整体是"财星当旺、心神外浮"的时期。遇事多一份审慎，少一份冲动，大方向便不会偏。',
  suggestion:
    '① 今日可于巳时静坐片刻，理清最紧要的一件事；\n② 若有具体决策，可把场景换成「决策建议」再问一次，先生给您更精准的回话；\n③ 不必凡事求问，心安即是吉时。',
  verdict: '中性',
  basis: {
    daYun: '辛巳大运',
    liuNian: '丙午流年',
    liuRi: '丁酉日',
  },
};

/**
 * 场景 → 样例数组（用于 replyMatcher 规则匹配）
 * 每个样例包含：关键词触发、对应回话、场景。
 */
export interface ReplySample {
  scene: import('../types/bazi').AskScene;
  /** 命中关键词（任一命中即返回） */
  keywords: string[];
  /** 问题示例（仅展示用，非匹配字段） */
  example: string;
  reply: ShifuReply;
}

export const replySamples: ReplySample[] = [
  {
    scene: '决策',
    keywords: ['面试', '赴约', '见面', '出门'],
    example: '下午有面试，但我感冒还没好，要不要去？',
    reply: replyDecisionInterview,
  },
  {
    scene: '决策',
    keywords: ['周五', '庚子', '改约', '改期'],
    example: '那如果改约本周五呢？',
    reply: replyDecisionInterviewFollowup,
  },
  {
    scene: '择吉',
    keywords: ['签约', '签字', '合同', '签合'],
    example: '下周签约哪天最好？',
    reply: replyTimingSigning,
  },
  {
    scene: '宜忌',
    keywords: ['今天', '今日', '宜忌', '一天'],
    example: '今天一天该注意什么？',
    reply: replyDailyTips,
  },
  {
    scene: '开放',
    keywords: ['失眠', '睡不着', '睡眠', '健康'],
    example: '最近总是失眠，是不是流年不好？',
    reply: replyOpenInsomnia,
  },
];
