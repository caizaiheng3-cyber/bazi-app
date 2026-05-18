"""
命理规则引擎 - 基于排盘 JSON 自动推导
输入：paipan.py 输出的结构化 JSON
输出：旺衰评分 / 格局判定 / 十神分布 / 合冲刑害 / 神煞

核心约束：准确性 > 速度，所有规则均有经典依据
"""

from typing import Dict, List, Tuple, Any

TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

YINYANG_OF_TIANGAN = {
    "甲": "阳", "乙": "阴", "丙": "阳", "丁": "阴", "戊": "阳",
    "己": "阴", "庚": "阳", "辛": "阴", "壬": "阳", "癸": "阴",
}


# ============================================================
# 常量：五行生克关系
# ============================================================

WUXING_SHENG = {"木": "火", "火": "土", "土": "金", "金": "水", "水": "木"}
WUXING_KE = {"木": "土", "火": "金", "土": "水", "金": "木", "水": "火"}
WUXING_SHENG_WO = {v: k for k, v in WUXING_SHENG.items()}  # 生我者
WUXING_KE_WO = {v: k for k, v in WUXING_KE.items()}  # 克我者

# 月令旺相休囚死
MONTH_STRENGTH = {
    # 月支 → 该月哪个五行最旺
    "寅": "木", "卯": "木",
    "巳": "火", "午": "火",
    "辰": "土", "未": "土", "戌": "土", "丑": "土",
    "申": "金", "酉": "金",
    "亥": "水", "子": "水",
}

# 十二长生表（阳干顺行，阴干逆行）
CHANGSHENG_YANG = {
    "甲": ["亥", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌"],
    "丙": ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"],
    "戊": ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"],
    "庚": ["巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑", "寅", "卯", "辰"],
    "壬": ["申", "酉", "戌", "亥", "子", "丑", "寅", "卯", "辰", "巳", "午", "未"],
}
CHANGSHENG_YIN = {
    "乙": ["午", "巳", "辰", "卯", "寅", "丑", "子", "亥", "戌", "酉", "申", "未"],
    "丁": ["酉", "申", "未", "午", "巳", "辰", "卯", "寅", "丑", "子", "亥", "戌"],
    "己": ["酉", "申", "未", "午", "巳", "辰", "卯", "寅", "丑", "子", "亥", "戌"],
    "辛": ["子", "亥", "戌", "酉", "申", "未", "午", "巳", "辰", "卯", "寅", "丑"],
    "癸": ["卯", "寅", "丑", "子", "亥", "戌", "酉", "申", "未", "午", "巳", "辰"],
}

CHANGSHENG_NAMES = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"]

# 地支六合
LIUHE = {
    "子": "丑", "丑": "子", "寅": "亥", "亥": "寅",
    "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰",
    "巳": "申", "申": "巳", "午": "未", "未": "午",
}

# 地支六冲
LIUCHONG = {
    "子": "午", "午": "子", "丑": "未", "未": "丑",
    "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
    "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
}

# 地支三合局
SANHE = [
    ("申", "子", "辰", "水"), ("寅", "午", "戌", "火"),
    ("亥", "卯", "未", "木"), ("巳", "酉", "丑", "金"),
]

# 地支半合
BANHE = [
    ("申", "子", "水"), ("子", "辰", "水"),
    ("寅", "午", "火"), ("午", "戌", "火"),
    ("亥", "卯", "木"), ("卯", "未", "木"),
    ("巳", "酉", "金"), ("酉", "丑", "金"),
]

# 地支三刑
SANXING = [
    ("寅", "巳", "申", "无恩之刑"),
    ("丑", "未", "戌", "恃势之刑"),
    ("子", "卯", "", "无礼之刑"),
]

# 地支自刑（同字并列即为自刑，传统只认辰午酉亥，扩展版认所有同字）
# 实践中戌戌并列也视为自刑（内耗），此处采用扩展版
ZIXING_STRICT = {"辰", "午", "酉", "亥"}  # 严格版
ZIXING_EXTENDED = True  # 启用扩展版：任何同字地支并列均视为自刑

# 地支相害
XIANGHARM = {
    "子": "未", "未": "子", "丑": "午", "午": "丑",
    "寅": "巳", "巳": "寅", "卯": "辰", "辰": "卯",
    "申": "亥", "亥": "申", "酉": "戌", "戌": "酉",
}

# 天干五合
TIANGAN_WUHE = {
    "甲": ("己", "土"), "己": ("甲", "土"),
    "乙": ("庚", "金"), "庚": ("乙", "金"),
    "丙": ("辛", "水"), "辛": ("丙", "水"),
    "丁": ("壬", "木"), "壬": ("丁", "木"),
    "戊": ("癸", "火"), "癸": ("戊", "火"),
}


# ============================================================
# ============================================================
# 旺衰判定 v3（周勇志/曲炜打分法 — 子平法经典量化体系）
# ============================================================
#
# 经典依据：
# 1.《滴天髓》任铁樵注："得时者，虽只一干，可当半壁" → 月令(通根)权重最大
# 2.《滴天髓》："天干得一比肩在地支，如树之有根，风摇而不倒" → 通根>透干
# 3.《子平真诠》第六章："八字虽以月令为重…干多不如根重" → 地支力量>天干
# 4. 周勇志《原命局实际旺衰具体判定方法》：天干36分，地支100分
# 5. 曲炜《四柱详真》：通根邻支减20%，隔支减40%，遥支减60%
# 6. 李洪成："一本气通根可抵透干两比肩之力量"
#
# 总分体系：4天干×36 + 4地支×100 = 544分
# 五行均值（中和线）：544 ÷ 5 = 109分
# ============================================================

# ---------- 旺衰专用常量（v3）----------

# 天干基分（来源：天圆360度÷10干=36度/干）
TIANGAN_BASE_SCORE = 36

# 地支藏干分值（来源：周勇志/李洪成体系，地支满分100）
# 格式：{地支: {天干: 分值}}
DIZHI_CANGGAN_SCORE = {
    "子": {"癸": 100},
    "丑": {"己": 60, "癸": 30, "辛": 10},
    "寅": {"甲": 60, "丙": 30, "戊": 10},
    "卯": {"乙": 100},
    "辰": {"戊": 60, "乙": 30, "癸": 10},
    "巳": {"丙": 60, "庚": 30, "戊": 10},
    "午": {"丁": 70, "己": 30},
    "未": {"己": 60, "丁": 30, "乙": 10},
    "申": {"庚": 60, "壬": 30, "戊": 10},
    "酉": {"辛": 100},
    "戌": {"戊": 60, "辛": 30, "丁": 10},
    "亥": {"壬": 70, "甲": 30},
}

# 通根距离衰减系数（来源：周勇志/曲炜）
# 柱位索引：年柱=0, 月柱=1, 日柱=2, 时柱=3
# 距离 = abs(pillar_index - day_pillar_index)
# 本柱(距离0)不减力, 邻支(距离1)减20%, 隔支(距离2)减40%, 遥支(距离3)减60%
TONGEN_DISTANCE_FACTOR = {0: 1.0, 1: 0.8, 2: 0.6, 3: 0.4}

# 天干帮扶距离系数（来源：周勇志）
# 紧贴(距离1)=全力, 隔柱(距离2)=减半
TIANGAN_HELP_DISTANCE = {1: 1.0, 2: 0.5}

# 天干相生加力比例（来源：周勇志/曲炜）
# (是否异性, 是否紧贴) → 加力比例
TIANGAN_SHENG_RATIO = {
    (True, True): 0.30,    # 紧贴异性相生 +30%
    (False, True): 0.20,   # 紧贴同性相生 +20%
    (True, False): 0.15,   # 隔柱异性相生 +15%
    (False, False): 0.10,  # 隔柱同性相生 +10%
}


# 五行生克关系（用于判断干支组合类型）
WUXING_OF_TIANGAN_V3 = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
    "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
}
WUXING_OF_DIZHI_V3 = {
    "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土",
    "巳": "火", "午": "火", "未": "土", "申": "金", "酉": "金",
    "戌": "土", "亥": "水",
}

# 旺衰七档（来源：周勇志体系，基于109分中和线）
# 偏旺: 109-272, 太旺: 272-435, 旺极: 435+
# 偏弱: 45-109, 太弱: <45, 弱极: 孤立无援
WANGSHUAI_THRESHOLDS = [
    (435, "身旺", "极旺"),
    (272, "身旺", "太旺"),
    (163, "身旺", "偏旺"),    # 109 + 54(半档)
    (130, "身旺", "微旺"),    # 109 + 21
    (109, "中和", "中和"),
    (88, "身弱", "微弱"),     # 109 - 21
    (55, "身弱", "偏弱"),     # 109 - 54(半档)
    (45, "身弱", "太弱"),
    (0, "身弱", "极弱"),
]


def _get_changsheng_state(day_master: str, dizhi: str) -> str:
    """查日主在某个地支的十二长生状态"""
    yinyang = YINYANG_OF_TIANGAN.get(day_master, "阳")
    if yinyang == "阳":
        table = CHANGSHENG_YANG.get(day_master)
    else:
        table = CHANGSHENG_YIN.get(day_master)
    if not table:
        return "养"
    try:
        idx = table.index(dizhi)
        return CHANGSHENG_NAMES[idx]
    except (ValueError, IndexError):
        return "养"


def _get_month_status(dm_wuxing: str, month_wuxing: str) -> str:
    """判断日主五行在月令的旺相休囚死状态"""
    if month_wuxing == dm_wuxing:
        return "旺"
    elif WUXING_SHENG_WO.get(dm_wuxing) == month_wuxing:
        return "相"
    elif WUXING_SHENG.get(dm_wuxing) == month_wuxing:
        return "休"
    elif WUXING_KE_WO.get(dm_wuxing) == month_wuxing:
        return "囚"
    elif WUXING_KE.get(dm_wuxing) == month_wuxing:
        return "死"
    return "休"


def _get_ganzhi_combo_type(tiangan: str, dizhi: str) -> str:
    """判断单柱干支组合类型（来源：曲炜《四柱详真》）
    
    支生干：地支五行生天干五行（如甲子：水生木）
    干生支：天干五行生地支五行（如甲午：木生火）
    盖头：天干五行克地支五行（如甲戌：木克土）
    截脚：地支五行克天干五行（如甲申：金克木）
    比和：干支同五行（如甲寅：都是木）
    """
    gan_wx = WUXING_OF_TIANGAN_V3[tiangan]
    zhi_wx = WUXING_OF_DIZHI_V3[dizhi]
    if gan_wx == zhi_wx:
        return "比和"
    elif WUXING_SHENG.get(zhi_wx) == gan_wx:
        return "支生干"
    elif WUXING_SHENG.get(gan_wx) == zhi_wx:
        return "干生支"
    elif WUXING_KE.get(gan_wx) == zhi_wx:
        return "盖头"
    elif WUXING_KE.get(zhi_wx) == gan_wx:
        return "截脚"
    return "比和"




def _calc_tiangan_actual_score(tiangan: str, dizhi: str) -> Tuple[float, str]:
    """计算天干在其坐支影响下的实际力量分（来源：周勇志/曲炜）
    
    规则（来源：周勇志原文例题）：
    - 若天干在坐支有本气通根（≥60分，本气为同五行）→ 自坐强根，加力五成: 54
    - 若坐支五行与天干五行相同（比和，如甲坐寅）→ 自坐强根: 54
    - 若坐支生天干（支生干，如甲坐子）→ 加力三成: 46.8
    - 若天干生坐支（干生支/泄气，如甲坐午）→ 减力三成: 25.2
    - 若坐支克天干（截脚，如甲坐申）→ 减力五成: 18
    - 若天干克坐支（盖头，如甲坐戌）→ 耗力三成: 25.2
    
    关键：截脚/盖头时即使有微弱余气根(10分)也不改变判定，
    只有本气通根(≥60分)才能抵消截脚转为"坐强根"。
    来源：周勇志原文戊坐寅(寅中有余气戊10分)仍按截脚论。
    
    返回：(实际分值, 组合类型说明)
    """
    gan_wx = WUXING_OF_TIANGAN_V3[tiangan]
    zhi_wx = WUXING_OF_DIZHI_V3[dizhi]
    canggan_scores = DIZHI_CANGGAN_SCORE.get(dizhi, {})

    # 检查坐支藏干中是否有天干同五行的本气根(≥60分)
    has_benqi_root = False
    for cang_gan, score in canggan_scores.items():
        if WUXING_OF_TIANGAN_V3[cang_gan] == gan_wx and score >= 60:
            has_benqi_root = True
            break

    # 本气通根优先级最高：无论干支五行关系如何，有本气根=坐强根
    # 来源：周勇志例一壬坐子(癸100=水本气根)→坐强根
    # 来源：周勇志例二己坐丑(己60=土本气根)→坐强根
    if has_benqi_root:
        actual_score = TIANGAN_BASE_SCORE + 3.6 * 5  # 54
        return actual_score, "坐强根"

    # 无本气根，按地支五行与天干五行的关系判断
    # 注意：即使有余气根(10分/30分)，若地支主气克天干仍按截脚论
    if gan_wx == zhi_wx:
        # 干支同五行（如戊坐辰/未/丑/戌，但辰中戊是本气60已在上面处理）
        # 到这里说明同五行但藏干中天干五行的分数<60（不应该发生，但防御性处理）
        actual_score = TIANGAN_BASE_SCORE + 3.6 * 5  # 54
        return actual_score, "坐强根"
    elif WUXING_SHENG.get(zhi_wx) == gan_wx:
        # 支生干：加力三成
        actual_score = TIANGAN_BASE_SCORE + 3.6 * 3  # 46.8
        return actual_score, "支生干"
    elif WUXING_SHENG.get(gan_wx) == zhi_wx:
        # 干生支（泄气）：减力三成
        actual_score = TIANGAN_BASE_SCORE - 3.6 * 3  # 25.2
        return actual_score, "干生支"
    elif WUXING_KE.get(zhi_wx) == gan_wx:
        # 截脚（地支克天干）：减力五成
        actual_score = TIANGAN_BASE_SCORE - 3.6 * 5  # 18
        return actual_score, "截脚"
    elif WUXING_KE.get(gan_wx) == zhi_wx:
        # 盖头（天干克地支）：耗力三成
        actual_score = TIANGAN_BASE_SCORE - 3.6 * 3  # 25.2
        return actual_score, "盖头"
    else:
        return float(TIANGAN_BASE_SCORE), "中性"


def _is_different_yinyang(gan1: str, gan2: str) -> bool:
    """判断两个天干是否阴阳不同（异性）"""
    return YINYANG_OF_TIANGAN.get(gan1) != YINYANG_OF_TIANGAN.get(gan2)


def judge_wangshuai(paipan_data: dict) -> dict:
    """
    旺衰判定 v3（周勇志/曲炜打分法 — 子平法经典量化体系）

    计算公式（来源：周勇志《原命局实际旺衰具体判定方法》原文例题）：
    日主五行综合力量 = 日主自身力量 + 比劫天干帮扶力量 + 日主通根力量

    - 日主自身力量：36分 × 坐支修正（坐强根+50%, 截脚-50%, 盖头-30%等）
    - 比劫帮扶：其他天干中同五行的实际力量（受其坐支修正），紧贴全力/隔柱减半
    - 印星帮扶：生日主的天干，按"紧贴异性+30%，紧贴同性+20%"加在日主身上
    - 日主通根：地支藏干中与日主同五行的分值 × 距离衰减
    - 通根相连不减力：地支通根若紧邻同五行天干（比劫/日主），不按距离衰减

    结果与中和线109分对比 → 七档定论
    """
    from engine.paipan import get_shishen

    day_master = paipan_data["日主"]["天干"]
    dm_wuxing = paipan_data["日主"]["五行"]
    dm_yinyang = paipan_data["日主"]["阴阳"]
    month_zhi = paipan_data["月令"]["月支"]
    month_wuxing = MONTH_STRENGTH.get(month_zhi, "土")
    month_status = _get_month_status(dm_wuxing, month_wuxing)

    # 四柱地支列表（按索引：年0 月1 日2 时3）
    pillars = ["年柱", "月柱", "日柱", "时柱"]
    dizhi_list = [paipan_data["四柱"][p]["地支"] for p in pillars]
    tiangan_list = [paipan_data["四柱"][p]["天干"] for p in pillars]

    details = []  # 逐项计分明细
    day_pillar_index = 2  # 日柱索引

    # ====== Step 1: 日主自身基分 ======
    # 来源：周勇志例一"日干壬水自坐强根加力五成:36+(3.6×5)=54"
    # 来源：周勇志例三"日干自坐截脚损力五成剩：36-(3.6×5)=18"
    day_dizhi = dizhi_list[day_pillar_index]
    day_actual_score, day_combo = _calc_tiangan_actual_score(day_master, day_dizhi)
    details.append({
        "步骤": "Step1·日主基分",
        "来源": f"日主{day_master}坐{day_dizhi}({day_combo})",
        "得分": round(day_actual_score, 1),
        "说明": f"基分36, 坐支{day_combo}→{day_actual_score:.1f}",
    })

    # ====== Step 2: 天干帮扶力量 ======
    # 来源：周勇志⑤⑥ 比劫帮扶 + ①②③④ 印星加力
    #
    # 比劫实际力量 = 基分36 ± 坐支修正 ± 被紧邻天干克泄修正
    # 来源：周勇志例二"年干己土坐截脚减力五成，生月干又减力三成，隔柱×50%"
    # 来源：周勇志例三"月干庚金坐戌生加力三成，年干壬水泄力三成，加减抵平=36"
    #
    # 印星：加力在日主身上（不累加印星自身力量）
    # 来源：周勇志例四"癸水紧贴月干甲木相生，加力三成：36+(3.6×3)=46.8"

    tiangan_help_total = 0.0
    yinxing_bonus = 0.0

    for i, pos in enumerate(pillars):
        if i == day_pillar_index:
            continue
        other_gan = tiangan_list[i]
        other_dizhi = dizhi_list[i]
        shishen = paipan_data["四柱"][pos]["天干十神"]

        if shishen in ("比肩", "劫财"):
            # === 比劫帮扶：实际力量 × 距离系数 ===
            # 第一步：坐支修正
            other_actual, other_combo = _calc_tiangan_actual_score(other_gan, other_dizhi)
            other_wx = WUXING_OF_TIANGAN_V3[other_gan]

            # 第二步：被紧邻天干克泄的减力（来源：周勇志例二、例三）
            # 只看紧贴的天干（相邻柱位），每个克/泄关系减力三成(3.6×3=10.8)
            neighbor_penalty = 0.0
            penalty_desc_parts = []
            for j in range(4):
                if j == i or j == day_pillar_index:
                    continue
                if abs(j - i) != 1:
                    continue  # 只看紧贴的
                neighbor_gan = tiangan_list[j]
                neighbor_wx = WUXING_OF_TIANGAN_V3[neighbor_gan]
                # 被克：neighbor克other（neighbor_wx克other_wx）
                if WUXING_KE.get(neighbor_wx) == other_wx:
                    neighbor_penalty += 3.6 * 3
                    penalty_desc_parts.append(f"{neighbor_gan}克减3成")
                # 被泄：other生neighbor（other_wx生neighbor_wx）
                elif WUXING_SHENG.get(other_wx) == neighbor_wx:
                    neighbor_penalty += 3.6 * 3
                    penalty_desc_parts.append(f"生{neighbor_gan}减3成")

            actual_after_penalty = max(other_actual - neighbor_penalty, 0)

            # 第三步：距离系数（紧贴全力，隔柱减半）
            distance = abs(i - day_pillar_index)
            dist_factor = TIANGAN_HELP_DISTANCE.get(distance, 0.5)
            help_score = actual_after_penalty * dist_factor

            tiangan_help_total += help_score
            penalty_str = "→".join(penalty_desc_parts) if penalty_desc_parts else "无克泄"
            details.append({
                "步骤": "Step2·天干帮扶",
                "来源": f"{pos}·{other_gan}({shishen}·坐{other_dizhi}·{other_combo})",
                "得分": round(help_score, 1),
                "说明": (f"坐支{other_actual:.1f}-邻干({penalty_str})={actual_after_penalty:.1f}"
                         f"×距离{dist_factor}={help_score:.1f}"),
            })

        elif shishen in ("正印", "偏印"):
            # === 印星：加力在日主身上 ===
            distance = abs(i - day_pillar_index)
            is_diff_yy = _is_different_yinyang(other_gan, day_master)
            is_close = (distance == 1)
            sheng_ratio = TIANGAN_SHENG_RATIO.get((is_diff_yy, is_close), 0.10)
            bonus = TIANGAN_BASE_SCORE * sheng_ratio
            yinxing_bonus += bonus
            details.append({
                "步骤": "Step2·印星加力",
                "来源": f"{pos}·{other_gan}({shishen}·{'异性' if is_diff_yy else '同性'}·{'紧贴' if is_close else '隔柱'})",
                "得分": round(bonus, 1),
                "说明": f"日主加力{sheng_ratio*100:.0f}%=36×{sheng_ratio}={bonus:.1f}",
            })

    # ====== Step 3: 日主通根力量 ======
    # 来源：周勇志"通根力量计算原则：邻支减力二成，隔支减力四成；遥支减力六成。
    #        本坐支之通根不减力。若地支通根相连也不减力。"
    # 来源：周勇志例二"丑中己土60分，得月令午火(火生土)加力三成=60+(6×3)=78分"
    #
    # 通根 = 地支藏干中与日主天干同五行的分值 × 距离修正 × 月令生助修正
    # "通根相连不减力"：该地支同柱天干是日主同五行（比劫/日主），则不按距离衰减
    # "通根得月令生"：月令五行生日主五行时，通根加力三成

    # 标记哪些柱位的天干是日主同五行（比劫/日主本人）
    same_wuxing_pillar_indices = set()
    for i in range(4):
        if WUXING_OF_TIANGAN_V3.get(tiangan_list[i]) == dm_wuxing:
            same_wuxing_pillar_indices.add(i)

    # 月令对通根的力量修正
    # 依据来源：
    # - 旺+50%：周勇志第三章"旺的力量是相的三倍"→通根在旺令加力最大
    # - 相+30%：周勇志第五章例二"丑中己土得月令午火生加力三成"
    # - 休-20%：豆瓣AI命理量化（旺相休囚死=1.2/1.2/0.8/0.8/0.6）取0.8
    # - 囚-20%：同上取0.8（被克与泄气对通根的压制相当）
    # - 死-30%：豆瓣取0.6，折中取0.7（我克月令=持续消耗，损力较重）
    MONTH_TONGEN_FACTOR = {"旺": 1.5, "相": 1.3, "休": 0.8, "囚": 0.8, "死": 0.7}
    month_tongen_factor = MONTH_TONGEN_FACTOR.get(month_status, 1.0)
    MONTH_FACTOR_DESC = {
        "旺": "+得令50%", "相": "+月令生30%", "休": "-泄气20%",
        "囚": "-受克20%", "死": "-耗力30%",
    }
    month_factor_desc = MONTH_FACTOR_DESC.get(month_status, "")

    tongen_total = 0.0
    for i, pos in enumerate(pillars):
        dizhi = dizhi_list[i]
        canggan_scores = DIZHI_CANGGAN_SCORE.get(dizhi, {})
        distance = abs(i - day_pillar_index)

        for cang_gan, base_score in canggan_scores.items():
            cang_wx = WUXING_OF_TIANGAN_V3.get(cang_gan)
            if cang_wx != dm_wuxing:
                continue

            # 判断是否"通根相连不减力"
            is_connected = (i in same_wuxing_pillar_indices)

            # 确定距离衰减系数
            if i == day_pillar_index or is_connected:
                dist_factor = 1.0
                dist_desc = "本柱" if i == day_pillar_index else f"相连({tiangan_list[i]})"
            else:
                dist_factor = TONGEN_DISTANCE_FACTOR.get(distance, 0.4)
                dist_desc = f"距离{distance}×{dist_factor}"

            root_score = base_score * dist_factor * month_tongen_factor
            tongen_total += root_score
            details.append({
                "步骤": "Step3·日主通根",
                "来源": f"{pos}·{dizhi}藏{cang_gan}({cang_wx}·{dist_desc}·{base_score}分{month_factor_desc})",
                "得分": round(root_score, 1),
                "说明": f"{base_score}×{dist_factor}×{month_tongen_factor}={root_score:.1f}",
            })

    # ====== Step 4: 汇总日主方总力量 ======
    total_score = day_actual_score + tiangan_help_total + yinxing_bonus + tongen_total

    # ====== Step 5: 计算克泄耗方实际力量 ======
    # 来源：周勇志例三"命局中官杀未透干均藏在四个地支中，其实力为：30+10+60+30=130分"
    # 修正：有透干的五行力量全额计入，无透干的五行通根力量折半
    # 来源：周勇志第三章"天干透出再多若地支无根力量也不是很强大的"
    # 反向推论：地支有根但天干未透出，力量也是虚的（暗藏难以发挥全力）
    #
    # 克日主五行：WUXING_KE_WO[dm_wuxing]（克我者=官杀）
    # 泄日主五行：WUXING_SHENG[dm_wuxing]（我生者=食伤）
    # 耗日主五行：WUXING_KE[dm_wuxing]（我克者=财）
    ke_wuxing = WUXING_KE_WO.get(dm_wuxing)   # 官杀五行（克我）
    xie_wuxing = WUXING_SHENG.get(dm_wuxing)   # 食伤五行（我生=泄）
    hao_wuxing = WUXING_KE.get(dm_wuxing)      # 财星五行（我克=耗）

    opposing_wuxings = set()
    if ke_wuxing:
        opposing_wuxings.add(ke_wuxing)
    if xie_wuxing:
        opposing_wuxings.add(xie_wuxing)
    if hao_wuxing:
        opposing_wuxings.add(hao_wuxing)

    # 先确定哪些克泄耗五行有透干（透干=力量实，无透干=力量虚）
    tou_gan_wuxings = set()  # 有透干的克泄耗五行
    opposing_tiangan = 0.0
    opposing_details = []
    for i, pos in enumerate(pillars):
        if i == day_pillar_index:
            continue
        other_gan = tiangan_list[i]
        other_wx = WUXING_OF_TIANGAN_V3[other_gan]
        if other_wx not in opposing_wuxings:
            continue
        tou_gan_wuxings.add(other_wx)
        other_actual, other_combo = _calc_tiangan_actual_score(other_gan, dizhi_list[i])
        opposing_tiangan += other_actual
        opposing_details.append(f"{pos}·{other_gan}({other_wx}·{other_combo}·{other_actual:.1f})")

    # 克泄耗方地支通根力量
    # 规则：
    # 1. 有透干的五行：通根全额计入（力量实）
    # 2. 无透干的五行：通根×0.5（暗藏虚力折半）
    # 3. 距离衰减（体系对称性）：与日主方通根相同的距离系数
    #    来源：八字真鉴"年柱有对月柱的生克泄绊权"→远近影响力量大小
    #    本柱×1.0 / 邻柱×0.8 / 隔柱×0.6 / 遥柱×0.4
    #    参考柱位 = 该克泄耗五行透干所在的天干柱位（力量发源点）
    #    若无透干，则无参考柱位，不做距离衰减（暗藏力量散布各柱）
    opposing_tongen = 0.0
    # 先收集各克泄耗五行透干所在的柱位索引
    opposing_wx_pillar = {}  # {五行: [透干柱位索引列表]}
    for i, pos in enumerate(pillars):
        if i == day_pillar_index:
            continue
        other_gan = tiangan_list[i]
        other_wx = WUXING_OF_TIANGAN_V3[other_gan]
        if other_wx in opposing_wuxings:
            opposing_wx_pillar.setdefault(other_wx, []).append(i)

    for i, pos in enumerate(pillars):
        dizhi = dizhi_list[i]
        canggan_scores = DIZHI_CANGGAN_SCORE.get(dizhi, {})
        for cang_gan, base_score in canggan_scores.items():
            cang_wx = WUXING_OF_TIANGAN_V3.get(cang_gan)
            if cang_wx not in opposing_wuxings:
                continue

            # 透干修正
            if cang_wx in tou_gan_wuxings:
                tou_factor = 1.0
                tou_desc = "有透干"
            else:
                tou_factor = 0.5
                tou_desc = "无透干·折半"

            # 距离衰减：以最近的透干柱位为参考点
            if cang_wx in opposing_wx_pillar:
                nearest_pillar = min(opposing_wx_pillar[cang_wx],
                                     key=lambda p: abs(p - i))
                dist = abs(nearest_pillar - i)
                dist_factor = TONGEN_DISTANCE_FACTOR.get(dist, 0.4)
                dist_desc = f"距{dist}×{dist_factor}"
            else:
                # 无透干 = 暗藏散布，不做距离衰减
                dist_factor = 1.0
                dist_desc = "散布"

            actual_root = base_score * tou_factor * dist_factor
            opposing_tongen += actual_root
            opposing_details.append(
                f"{pos}·{dizhi}藏{cang_gan}({cang_wx}·{base_score}·{tou_desc}·{dist_desc}→{actual_root:.0f})"
            )

    opposing_score = opposing_tiangan + opposing_tongen

    # ====== Step 5b: 统计各五行得分（供通关用神使用）======
    wuxing_scores = {"木": 0.0, "火": 0.0, "土": 0.0, "金": 0.0, "水": 0.0}
    # 天干贡献
    for i, tg in enumerate(tiangan_list):
        wx = WUXING_OF_TIANGAN_V3[tg]
        actual, _ = _calc_tiangan_actual_score(tg, dizhi_list[i])
        wuxing_scores[wx] += actual
    # 地支藏干贡献
    for dz in dizhi_list:
        canggan_scores = DIZHI_CANGGAN_SCORE.get(dz, {})
        for cg, score in canggan_scores.items():
            wx = WUXING_OF_TIANGAN_V3.get(cg, "")
            if wx:
                wuxing_scores[wx] += score

    # ====== 旺衰综合判定（中和线 + 力量对比双维度）======
    # 来源：周勇志第五章 + 子平法核心原则
    # 维度一：日主方力量 vs 109中和线（绝对力量）
    # 维度二：日主方 vs 克泄耗方力量对比（相对力量 ratio）
    #
    # 判定规则：
    # 1. ratio >= 0.55 → 日主方绝对优势，按中和线定旺的程度
    # 2. ratio <= 0.42 → 克泄耗方压制日主，无论日主绝对值多少都判偏弱方向
    # 3. 0.42 < ratio < 0.55 → 按中和线定论
    #
    # 依据：周勇志第三章"旺衰的判定除了看日主自身力量，
    # 还要看命局中克泄耗的力量是否超过了日主的承受能力"
    #
    # ⚠️ 局限性说明（待后续迭代校准）：
    # - 0.42/0.55 阈值基于 3 个已知命例拟合（Vincy/蔡渣坡/金杭乐），样本量不足
    # - 曲炜体系用"日主占全局百分比"（偏弱<20%，偏旺>50%），与本体系ratio定义不同
    # - 随着黄金命例库扩充，阈值应基于更多命例回测校准
    # - 中间地带(0.42-0.55)的 fallback 到中和线判定，逻辑合理但需要更多验证
    ratio = total_score / (total_score + opposing_score) if (total_score + opposing_score) > 0 else 0.5

    if ratio >= 0.55:
        # 日主方绝对优势：按中和线细分旺的程度
        if total_score >= 435:
            conclusion, level = "身旺", "极旺"
        elif total_score >= 272:
            conclusion, level = "身旺", "太旺"
        elif total_score >= 163:
            conclusion, level = "身旺", "偏旺"
        else:
            conclusion, level = "身旺", "微旺"
    elif ratio <= 0.42:
        # 克泄耗方压制日主：日主虽有绝对力量但被克泄耗消耗殆尽
        # 按日主绝对值细分弱的程度
        if total_score <= 45:
            conclusion, level = "身弱", "太弱"
        elif total_score <= 88:
            conclusion, level = "身弱", "偏弱"
        else:
            conclusion, level = "身弱", "微弱"
    else:
        # 中间地带(0.40 < ratio < 0.55)：按中和线定论
        conclusion = "中和"
        level = "中和"
        for threshold, conc, lev in WANGSHUAI_THRESHOLDS:
            if total_score >= threshold:
                conclusion = conc
                level = lev
                break

    # ====== 兼容旧接口 ======
    if month_status in ("旺", "相"):
        deling_desc = f"得令·{month_status}（月支{month_zhi}属{month_wuxing}）"
    else:
        deling_desc = f"失令·{month_status}（月支{month_zhi}属{month_wuxing}）"

    dedi_details = [d["来源"] for d in details if "Step3" in d["步骤"]]
    desheng_details = [d["来源"] for d in details if "Step2" in d["步骤"]]

    return {
        "结论": conclusion,
        "程度": level,
        "总分": round(total_score, 2),
        "助力总分": round(total_score, 2),
        "泄耗总分": round(opposing_score, 2),
        "旺衰比": round(ratio, 4),
        "中和线": 109,
        "分层": {
            "Step1·日主基分": round(day_actual_score, 2),
            "Step2·天干帮扶": round(tiangan_help_total, 2),
            "Step2·印星加力": round(yinxing_bonus, 2),
            "Step3·日主通根": round(tongen_total, 2),
            "Step5·克泄耗方": round(opposing_score, 2),
        },
        "月令状态": month_status,
        "逐项明细": details,
        "克泄耗方明细": opposing_details,
        # 规则契约元数据
        "五行得分": {k: round(v, 1) for k, v in wuxing_scores.items()},
        "规则来源": "周勇志/曲炜打分法 + 月令系数(子平真诠)",
        "流派": "旺衰量化派(打分法)",
        "置信度": "高" if abs(ratio - 0.5) > 0.1 else "中",
        # 兼容旧接口
        "得令": {"得分": round(tongen_total, 1), "说明": deling_desc},
        "得地": {"得分": round(tongen_total, 2), "原始分": round(tongen_total, 2), "详情": dedi_details},
        "得生": {"得分": round(tiangan_help_total + yinxing_bonus, 2), "详情": desheng_details},
        "受克": {"得分": round(-opposing_score, 2), "原始分": round(opposing_score, 2), "详情": opposing_details},
    }


# ============================================================
# 格局判定（v2 完整子平真诠体系）
# ============================================================
#
# 判定优先级（来源：子平真诠/三命通会/滴天髓）：
# 1. 先判外格（专旺格/从格/化气格）→ 条件极苛刻
# 2. 不满足外格 → 正格取格（月令藏干透出）
# 3. 取格后判成败（相神护格/忌神破格/救应）
# ============================================================

# 专旺格条件常量（来源：三命通会/周易天地）
ZHUANWANG_CONDITIONS = {
    "曲直格": {
        "日干": {"甲", "乙"},
        "月支": {"寅", "卯"},
        "支方": [{"寅", "卯", "辰"}],  # 东方全
        "支局": [{"亥", "卯", "未"}],  # 木局
        "忌干": {"庚", "辛"},
        "忌支": {"申", "酉"},
        "五行": "木",
    },
    "炎上格": {
        "日干": {"丙", "丁"},
        "月支": {"巳", "午"},
        "支方": [{"巳", "午", "未"}],
        "支局": [{"寅", "午", "戌"}],
        "忌干": {"壬", "癸"},
        "忌支": {"亥", "子"},
        "五行": "火",
    },
    "稼穑格": {
        "日干": {"戊", "己"},
        "月支": {"辰", "未", "戌", "丑"},
        "支方": [{"辰", "戌", "丑", "未"}],
        "支局": [],  # 土无三合局，只有方
        "忌干": {"甲", "乙"},
        "忌支": {"寅", "卯"},
        "五行": "土",
    },
    "从革格": {
        "日干": {"庚", "辛"},
        "月支": {"申", "酉"},
        "支方": [{"申", "酉", "戌"}],
        "支局": [{"巳", "酉", "丑"}],
        "忌干": {"丙", "丁"},
        "忌支": {"午", "未"},
        "五行": "金",
    },
    "润下格": {
        "日干": {"壬", "癸"},
        "月支": {"亥", "子"},
        "支方": [{"亥", "子", "丑"}],
        "支局": [{"申", "子", "辰"}],
        "忌干": {"戊", "己"},
        "忌支": {"未", "戌"},
        "五行": "水",
    },
}

# 天干禄位表（用于判定建禄格）
TIANGAN_LU = {
    "甲": "寅", "乙": "卯", "丙": "巳", "丁": "午", "戊": "巳",
    "己": "午", "庚": "申", "辛": "酉", "壬": "亥", "癸": "子",
}

# 天干羊刃表（用于判定羊刃格）
TIANGAN_REN = {
    "甲": "卯", "乙": "寅", "丙": "午", "丁": "巳", "戊": "午",
    "己": "巳", "庚": "酉", "辛": "申", "壬": "子", "癸": "亥",
}


def _check_zhuanwang(paipan_data: dict) -> dict | None:
    """检查是否满足专旺格条件（来源：三命通会）
    条件极苛刻：日干属该五行 + 得令 + 支全方或局 + 天干地支藏干均无克神
    """
    day_master = paipan_data["日主"]["天干"]
    dizhi_list = [paipan_data["四柱"][pos]["地支"] for pos in ["年柱", "月柱", "日柱", "时柱"]]
    tiangan_list = [paipan_data["四柱"][pos]["天干"] for pos in ["年柱", "月柱", "日柱", "时柱"]]
    month_zhi = paipan_data["月令"]["月支"]
    dizhi_set = set(dizhi_list)

    for geju_name, cond in ZHUANWANG_CONDITIONS.items():
        if day_master not in cond["日干"]:
            continue
        if month_zhi not in cond["月支"]:
            continue

        # 检查地支是否全方或成局
        has_fang_or_ju = False
        for fang in cond["支方"]:
            if fang.issubset(dizhi_set):
                has_fang_or_ju = True
                break
        if not has_fang_or_ju:
            for ju in cond["支局"]:
                if ju.issubset(dizhi_set):
                    has_fang_or_ju = True
                    break
        if not has_fang_or_ju:
            continue

        # 检查忌神：天干中不能有克神
        has_ji = False
        for tg in tiangan_list:
            if tg in cond["忌干"]:
                has_ji = True
                break
        if has_ji:
            continue

        # 检查忌神：地支原字不能有克神
        for dz in dizhi_list:
            if dz in cond["忌支"]:
                has_ji = True
                break
        if has_ji:
            continue

        # 检查忌神：地支藏干中不能有克神五行的本气（≥60分才算有力）
        # 来源：三命通会"支中不杂他气"
        ke_wuxing = WUXING_KE_WO.get(cond["五行"])  # 克该五行的五行
        for dz in dizhi_list:
            canggan_scores = DIZHI_CANGGAN_SCORE.get(dz, {})
            for cang_gan, score in canggan_scores.items():
                if WUXING_OF_TIANGAN_V3.get(cang_gan) == ke_wuxing and score >= 60:
                    has_ji = True
                    break
            if has_ji:
                break
        if has_ji:
            continue

        return {
            "格局": geju_name,
            "格局类型": "外格·专旺",
            "定格十神": "比肩",
            "定格天干": day_master,
            "依据": f"日干{day_master}属{cond['五行']}，生于{month_zhi}月，支全{cond['五行']}方/局，天干地支无克神",
            "成败": "成格",
            "成败依据": "专旺格气势纯粹，一气专旺",
            "层次": "清",
        }

    return None


def _check_congge(paipan_data: dict, wangshuai: dict = None) -> dict | None:
    """检查是否满足从格条件（来源：三命通会/子平真诠/滴天髓）

    从格判定双重条件（经典依据：滴天髓"从得真者只论从"）：
    1. 日主在四柱地支无本气通根（无根方可从）
    2. 天干无印比帮扶（无一点生旺之气）
    3. ratio辅助确认（<=0.25为极弱参考线）

    从格细分（来源：三命通会）：
    - 从财格：财星最旺
    - 从杀格：官杀最旺
    - 从儿格：食伤最旺
    """
    if wangshuai is None:
        return None

    from engine.paipan import get_shishen

    ratio = wangshuai.get("旺衰比", 0.5)
    day_master = paipan_data["日主"]["天干"]
    dm_wuxing = paipan_data["日主"]["五行"]
    yin_wuxing = WUXING_SHENG_WO.get(dm_wuxing)  # 生我者=印
    tiangan_list = [paipan_data["四柱"][pos]["天干"] for pos in ["年柱", "月柱", "日柱", "时柱"]]
    dizhi_list = [paipan_data["四柱"][pos]["地支"] for pos in ["年柱", "月柱", "日柱", "时柱"]]

    # 条件1：ratio必须极低（<=0.25），经典依据：滴天髓"太弱"
    # 0.25是"日主方占比不足四分之一"的阈值，配合无根无帮判定
    if ratio > 0.25:
        return None

    # 条件2：日主在四柱地支无本气通根（来源：滴天髓"日主无根方论从"）
    # 本气通根=地支藏干中有与日主同五行的本气（分值>=60）
    has_root = False
    for dz in dizhi_list:
        canggan_scores = DIZHI_CANGGAN_SCORE.get(dz, {})
        for cang_gan, score in canggan_scores.items():
            if WUXING_OF_TIANGAN_V3.get(cang_gan) == dm_wuxing and score >= 60:
                has_root = True
                break
        if has_root:
            break
    if has_root:
        return None

    # 条件3：天干和地支藏干中无有力印比帮扶
    # 天干检查
    has_yin_bi = False
    for i, tg in enumerate(tiangan_list):
        if i == 2:  # 日柱天干=日主本身
            continue
        tg_wx = WUXING_OF_TIANGAN_V3.get(tg)
        if tg_wx == dm_wuxing or tg_wx == yin_wuxing:
            has_yin_bi = True
            break

    if has_yin_bi:
        return None

    # 地支藏干检查：是否有印星本气（分值>=60）
    for dz in dizhi_list:
        canggan_scores = DIZHI_CANGGAN_SCORE.get(dz, {})
        for cang_gan, score in canggan_scores.items():
            if WUXING_OF_TIANGAN_V3.get(cang_gan) == yin_wuxing and score >= 60:
                has_yin_bi = True
                break
        if has_yin_bi:
            break
    if has_yin_bi:
        return None

    # 满足从格条件，细分从格类型（来源：三命通会"从其旺神"）
    # 统计命局中各十神类别的力量（天干+地支藏干）
    # 来源：三命通会"从者，从其所旺之神也"
    wuxing_score = {"木": 0, "火": 0, "土": 0, "金": 0, "水": 0}
    for i, tg in enumerate(tiangan_list):
        if i == 2:
            continue
        wuxing_score[WUXING_OF_TIANGAN_V3[tg]] += TIANGAN_BASE_SCORE
    for dz in dizhi_list:
        canggan_scores = DIZHI_CANGGAN_SCORE.get(dz, {})
        for cang_gan, score in canggan_scores.items():
            wuxing_score[WUXING_OF_TIANGAN_V3[cang_gan]] += score

    # 去掉日主五行和印星五行，看剩余最旺的五行属于哪类十神
    # 财=我克者，官杀=克我者，食伤=我生者
    wo_ke = WUXING_KE.get(dm_wuxing)  # 我克=财
    ke_wo = WUXING_KE_WO.get(dm_wuxing)  # 克我=官杀
    wo_sheng = WUXING_SHENG.get(dm_wuxing)  # 我生=食伤

    category_score = {
        "财": wuxing_score.get(wo_ke, 0),
        "官杀": wuxing_score.get(ke_wo, 0),
        "食伤": wuxing_score.get(wo_sheng, 0),
    }

    max_category = max(category_score, key=category_score.get)
    if category_score[max_category] == 0:
        # 极端情况：所有克泄耗方力量都为0，说明月令五行决定
        month_wx = MONTH_STRENGTH.get(paipan_data["月令"]["月支"])
        if month_wx == wo_ke:
            max_category = "财"
        elif month_wx == ke_wo:
            max_category = "官杀"
        elif month_wx == wo_sheng:
            max_category = "食伤"
        else:
            max_category = "财"  # 兜底：不太可能走到此处

    cong_type_map = {
        "财": ("从财格", "财星当旺，日主从财"),
        "官杀": ("从杀格", "官杀当旺，日主从杀"),
        "食伤": ("从儿格", "食伤当旺，日主从儿"),
    }
    cong_name, cong_reason = cong_type_map[max_category]

    return {
        "格局": cong_name,
        "格局类型": "外格·从格",
        "定格十神": max_category,
        "定格天干": "",
        "依据": f"日主{day_master}无根(ratio={ratio:.3f})，天干地支无印比帮扶，{cong_reason}",
        "成败": "成格",
        "成败依据": "日主无根无气，从其旺神",
        "层次": "清",
    }


def _check_congwang(paipan_data: dict, wangshuai: dict = None) -> dict | None:
    """检查是否满足从旺格/从强格条件（来源：三命通会/滴天髓）

    从旺格（来源：三命通会"旺之极者，不可逆也"）：
    - 四柱比劫林立+有印生+无官杀制+无财星泄
    - ratio >= 0.80（日主方极旺）

    从强格（来源：三命通会"强者，印比均重"）：
    - 印比均旺+无财官杀+ratio >= 0.80
    - 与从旺格区别：从旺以比劫为主，从强以印星为主
    """
    if wangshuai is None:
        return None

    from engine.paipan import get_shishen

    ratio = wangshuai.get("旺衰比", 0.5)
    day_master = paipan_data["日主"]["天干"]
    dm_wuxing = paipan_data["日主"]["五行"]
    tiangan_list = [paipan_data["四柱"][pos]["天干"] for pos in ["年柱", "月柱", "日柱", "时柱"]]
    dizhi_list = [paipan_data["四柱"][pos]["地支"] for pos in ["年柱", "月柱", "日柱", "时柱"]]

    # 条件1：ratio必须极高（>=0.80），日主方力量占全局80%以上
    if ratio < 0.80:
        return None

    # 条件2：天干中无有力的财星和官杀（克泄日主者）
    ke_wo_wuxing = WUXING_KE_WO.get(dm_wuxing)  # 克我者=官杀
    wo_ke_wuxing = WUXING_KE.get(dm_wuxing)  # 我克者=财
    wo_sheng_wuxing = WUXING_SHENG.get(dm_wuxing)  # 我生者=食伤

    has_cai_guan = False
    for i, tg in enumerate(tiangan_list):
        if i == 2:
            continue
        tg_wx = WUXING_OF_TIANGAN_V3.get(tg)
        if tg_wx == ke_wo_wuxing or tg_wx == wo_ke_wuxing:
            has_cai_guan = True
            break

    if has_cai_guan:
        return None

    # 条件3：地支藏干中无有力的官杀/财本气（>=60分）
    for dz in dizhi_list:
        canggan_scores = DIZHI_CANGGAN_SCORE.get(dz, {})
        for cang_gan, score in canggan_scores.items():
            cang_wx = WUXING_OF_TIANGAN_V3.get(cang_gan)
            if (cang_wx == ke_wo_wuxing or cang_wx == wo_ke_wuxing) and score >= 60:
                has_cai_guan = True
                break
        if has_cai_guan:
            break
    if has_cai_guan:
        return None

    # 区分从旺格 vs 从强格：看印比哪个更重
    # 统计天干中比劫数量 vs 印星数量
    yin_wuxing = WUXING_SHENG_WO.get(dm_wuxing)
    bi_count = 0
    yin_count = 0
    for i, tg in enumerate(tiangan_list):
        if i == 2:
            continue
        tg_wx = WUXING_OF_TIANGAN_V3.get(tg)
        if tg_wx == dm_wuxing:
            bi_count += 1
        elif tg_wx == yin_wuxing:
            yin_count += 1

    if bi_count >= yin_count:
        return {
            "格局": "从旺格",
            "格局类型": "外格·从旺",
            "定格十神": "比肩",
            "定格天干": day_master,
            "依据": f"日主{day_master}极旺(ratio={ratio:.3f})，比劫林立，无官杀财星制泄",
            "成败": "成格",
            "成败依据": "旺之极者不可逆，从其旺势",
            "层次": "清",
        }
    else:
        return {
            "格局": "从强格",
            "格局类型": "外格·从强",
            "定格十神": "正印",
            "定格天干": "",
            "依据": f"日主{day_master}极旺(ratio={ratio:.3f})，印比均重，无财官杀",
            "成败": "成格",
            "成败依据": "印比均旺无克泄，从其强势",
            "层次": "清",
        }


# 化气格条件常量（来源：三命通会/子平真诠）
# 天干五合化出的五行 + 化神需得令的月支
HUAQI_CONDITIONS = {
    ("甲", "己"): {"化五行": "土", "化神得令": {"辰", "未", "戌", "丑"}},
    ("乙", "庚"): {"化五行": "金", "化神得令": {"申", "酉"}},
    ("丙", "辛"): {"化五行": "水", "化神得令": {"亥", "子"}},
    ("丁", "壬"): {"化五行": "木", "化神得令": {"寅", "卯"}},
    ("戊", "癸"): {"化五行": "火", "化神得令": {"巳", "午"}},
}


def _check_huaqi(paipan_data: dict) -> dict | None:
    """检查是否满足化气格条件（来源：三命通会/子平真诠）

    化气格条件极苛刻（来源：子平真诠"化得真者只论化"）：
    1. 日干与月干或时干紧贴相合（天干五合）
    2. 化神（合化后的五行）得月令（生于化神旺月）
    3. 四柱无克化神的五行（无破）
    4. 日主本身无强根（不能抗拒合化）
    """
    day_master = paipan_data["日主"]["天干"]
    dm_wuxing = paipan_data["日主"]["五行"]
    tiangan_list = [paipan_data["四柱"][pos]["天干"] for pos in ["年柱", "月柱", "日柱", "时柱"]]
    dizhi_list = [paipan_data["四柱"][pos]["地支"] for pos in ["年柱", "月柱", "日柱", "时柱"]]
    month_zhi = paipan_data["月令"]["月支"]

    # 检查日干与邻干（月干idx=1或时干idx=3）是否构成五合
    adjacent_indices = [1, 3]  # 月干、时干与日干(idx=2)紧贴
    for adj_idx in adjacent_indices:
        adj_gan = tiangan_list[adj_idx]
        # 查找是否构成五合对
        pair = None
        for (g1, g2), cond in HUAQI_CONDITIONS.items():
            if (day_master == g1 and adj_gan == g2) or (day_master == g2 and adj_gan == g1):
                pair = (g1, g2)
                hua_wuxing = cond["化五行"]
                deling_set = cond["化神得令"]
                break
        if pair is None:
            continue

        # 条件2：化神得月令
        if month_zhi not in deling_set:
            continue

        # 条件3：四柱无克化神的五行
        ke_hua_wuxing = WUXING_KE_WO.get(hua_wuxing)  # 克化神的五行
        has_ke = False
        for tg in tiangan_list:
            if WUXING_OF_TIANGAN_V3.get(tg) == ke_hua_wuxing:
                has_ke = True
                break
        if not has_ke:
            for dz in dizhi_list:
                canggan_scores = DIZHI_CANGGAN_SCORE.get(dz, {})
                for cang_gan, score in canggan_scores.items():
                    if WUXING_OF_TIANGAN_V3.get(cang_gan) == ke_hua_wuxing and score >= 60:
                        has_ke = True
                        break
                if has_ke:
                    break
        if has_ke:
            continue

        # 条件4：日主无强根（本气通根>=60分的地支）
        has_strong_root = False
        for dz in dizhi_list:
            canggan_scores = DIZHI_CANGGAN_SCORE.get(dz, {})
            for cang_gan, score in canggan_scores.items():
                if WUXING_OF_TIANGAN_V3.get(cang_gan) == dm_wuxing and score >= 60:
                    has_strong_root = True
                    break
            if has_strong_root:
                break
        if has_strong_root:
            continue

        return {
            "格局": f"{pair[0]}{pair[1]}化{hua_wuxing}格",
            "格局类型": "外格·化气",
            "定格十神": "化神",
            "定格天干": adj_gan,
            "依据": f"日干{day_master}与{adj_gan}合化{hua_wuxing}，{hua_wuxing}得月令{month_zhi}，无克破",
            "成败": "成格",
            "成败依据": "化神得令乘旺，合化成功",
            "层次": "清",
        }

    return None


def _take_zhengge(paipan_data: dict) -> dict:
    """正格取格（子平真诠体系）
    规则：
    1. 月令藏干按本气→中气→余气检查是否透干
    2. 比劫不取格（跳过）
    3. 透干取格
    4. 均不透有效十神 → 以月令本气定格
    5. 本气为比劫 → 建禄格/羊刃格
    """
    from engine.paipan import CANGGAN, get_shishen

    day_master = paipan_data["日主"]["天干"]
    month_zhi = paipan_data["月令"]["月支"]

    canggan_list = CANGGAN.get(month_zhi, [])
    tiangan_set = set()
    for pos in ["年柱", "月柱", "时柱"]:
        tiangan_set.add(paipan_data["四柱"][pos]["天干"])

    # 按本气→中气→余气顺序检查是否透干（跳过比劫）
    geju_gan = None
    geju_source = None
    for gan, qi_type, days in canggan_list:
        shishen = get_shishen(day_master, gan)
        # 比劫不取格
        if shishen in ("比肩", "劫财"):
            continue
        if gan in tiangan_set:
            geju_gan = gan
            geju_source = f"月支{month_zhi}{qi_type}{gan}透干"
            break

    # 均不透有效十神 → 以本气定格
    if geju_gan is None:
        benqi_gan = canggan_list[0][0] if canggan_list else None
        if benqi_gan:
            benqi_shishen = get_shishen(day_master, benqi_gan)
            if benqi_shishen in ("比肩", "劫财"):
                # 月令本气为比劫 → 建禄格或羊刃格
                if month_zhi == TIANGAN_LU.get(day_master):
                    return {
                        "格局": "建禄格",
                        "格局类型": "正格·建禄",
                        "定格十神": "比肩",
                        "定格天干": day_master,
                        "依据": f"月支{month_zhi}为{day_master}之禄位",
                        "成败": "待定",
                        "成败依据": "建禄格另取用神",
                        "层次": "待定",
                    }
                elif month_zhi == TIANGAN_REN.get(day_master):
                    return {
                        "格局": "羊刃格",
                        "格局类型": "正格·羊刃",
                        "定格十神": "劫财",
                        "定格天干": "",
                        "依据": f"月支{month_zhi}为{day_master}之刃位",
                        "成败": "待定",
                        "成败依据": "羊刃格喜官杀制刃",
                        "层次": "待定",
                    }
                else:
                    # 月令有比劫本气但非禄刃位，继续看中气余气
                    for gan, qi_type, days in canggan_list[1:]:
                        ss = get_shishen(day_master, gan)
                        if ss not in ("比肩", "劫财"):
                            geju_gan = gan
                            geju_source = f"月支{month_zhi}{qi_type}{gan}（本气比劫不取，取{qi_type}）"
                            break
                    if geju_gan is None:
                        geju_gan = benqi_gan
                        geju_source = f"月支{month_zhi}本气{benqi_gan}（均为比劫，以本气定格）"
            else:
                geju_gan = benqi_gan
                geju_source = f"月支{month_zhi}本气{benqi_gan}（藏干均不透，以本气定格）"

    if geju_gan is None:
        return {
            "格局": "未知", "格局类型": "未知", "定格十神": "",
            "定格天干": "", "依据": "无法判定", "成败": "未知",
            "成败依据": "", "层次": "未知",
        }

    geju_shishen = get_shishen(day_master, geju_gan)
    geju_name_map = {
        "食神": "食神格", "伤官": "伤官格",
        "偏财": "偏财格", "正财": "正财格",
        "七杀": "七杀格", "正官": "正官格",
        "偏印": "偏印格", "正印": "正印格",
        "比肩": "建禄格", "劫财": "羊刃格",
    }
    geju_name = geju_name_map.get(geju_shishen, f"{geju_shishen}格")

    return {
        "格局": geju_name,
        "格局类型": f"正格·{geju_name}",
        "定格十神": geju_shishen,
        "定格天干": geju_gan,
        "依据": geju_source,
        "成败": "待定",
        "成败依据": "",
        "层次": "待定",
    }


def _judge_chengbai(paipan_data: dict, geju: dict, wangshuai: dict = None) -> dict:
    """格局成败判定（子平真诠八格成败体系）

    来源：子平真诠/周易天地《常见格局的成格、破格》
    核心逻辑：检查格局的喜忌条件是否满足
    """
    from engine.paipan import get_shishen

    if geju.get("成败") != "待定":
        return geju

    day_master = paipan_data["日主"]["天干"]
    geju_shishen = geju["定格十神"]

    # 收集命局中所有透干的十神
    tiangan_shishen_set = set()
    for pos in ["年柱", "月柱", "时柱"]:
        tg = paipan_data["四柱"][pos]["天干"]
        ss = get_shishen(day_master, tg)
        tiangan_shishen_set.add(ss)

    # 判定旺衰方向
    is_strong = False
    if wangshuai:
        is_strong = wangshuai.get("结论") in ("身旺", "中和")

    # 根据格局类型判定成败
    chengbai = "成格"
    chengbai_reasons = []

    if geju_shishen == "正官":
        # 正官格成格：官逢财印又无伤官克、无杀混杂
        # 正官格败格：见伤官无印/杀来混杂
        if "伤官" in tiangan_shishen_set and "正印" not in tiangan_shishen_set and "偏印" not in tiangan_shishen_set:
            chengbai = "败格"
            chengbai_reasons.append("伤官见官无印护")
        if "七杀" in tiangan_shishen_set:
            chengbai = "败格"
            chengbai_reasons.append("官杀混杂")
        if chengbai == "成格":
            if "正财" in tiangan_shishen_set or "偏财" in tiangan_shishen_set:
                chengbai_reasons.append("有财生官")
            if "正印" in tiangan_shishen_set:
                chengbai_reasons.append("有印护官")

    elif geju_shishen == "七杀":
        # 七杀格成格：有食制杀/有印化杀
        # 七杀格败格：无制无化
        has_zhi = "食神" in tiangan_shishen_set
        has_hua = "正印" in tiangan_shishen_set or "偏印" in tiangan_shishen_set
        if not has_zhi and not has_hua and not is_strong:
            chengbai = "败格"
            chengbai_reasons.append("七杀无制无化，身又弱")
        else:
            if has_zhi:
                chengbai_reasons.append("食神制杀")
            if has_hua:
                chengbai_reasons.append("印星化杀")
            if is_strong:
                chengbai_reasons.append("身强能担杀")

    elif geju_shishen == "食神":
        # 食神格成格：身强食强见财/食制杀
        # 食神格败格：食轻逢枭
        if "偏印" in tiangan_shishen_set:
            chengbai = "败格"
            chengbai_reasons.append("枭神夺食")
            # 检查救应：有偏财制枭
            if "偏财" in tiangan_shishen_set:
                chengbai = "成格"
                chengbai_reasons.append("偏财制枭·救应")
        else:
            if "正财" in tiangan_shishen_set or "偏财" in tiangan_shishen_set:
                chengbai_reasons.append("食神生财")

    elif geju_shishen == "伤官":
        # 伤官格成格：身强伤生财/身弱有印护
        # 伤官格败格：见官
        if "正官" in tiangan_shishen_set:
            chengbai = "败格"
            chengbai_reasons.append("伤官见官")
            # 救应：有印制伤
            if "正印" in tiangan_shishen_set:
                chengbai = "成格"
                chengbai_reasons.append("印星制伤·救应")
        else:
            if "正财" in tiangan_shishen_set or "偏财" in tiangan_shishen_set:
                chengbai_reasons.append("伤官生财")
            if "正印" in tiangan_shishen_set:
                chengbai_reasons.append("伤官配印")

    elif geju_shishen in ("正财", "偏财"):
        # 财格成格：身强财强见官/身弱有印比
        # 财格败格：身强劫比重
        if "劫财" in tiangan_shishen_set and "比肩" in tiangan_shishen_set:
            if not ("正官" in tiangan_shishen_set or "七杀" in tiangan_shishen_set):
                chengbai = "败格"
                chengbai_reasons.append("比劫争财无官制")
        else:
            if "正官" in tiangan_shishen_set:
                chengbai_reasons.append("财生官")
            if "食神" in tiangan_shishen_set or "伤官" in tiangan_shishen_set:
                chengbai_reasons.append("食伤生财")

    elif geju_shishen in ("正印", "偏印"):
        # 印格成格：印逢官杀/身强印轻/印重有财制
        # 印格败格：印轻逢财坏
        if ("正财" in tiangan_shishen_set or "偏财" in tiangan_shishen_set):
            if not is_strong:
                chengbai = "败格"
                chengbai_reasons.append("身弱印轻逢财坏印")
            else:
                chengbai_reasons.append("身强印重有财制·平衡")
        else:
            if "正官" in tiangan_shishen_set or "七杀" in tiangan_shishen_set:
                chengbai_reasons.append("官杀生印")

    elif geju_shishen == "比肩":
        # 建禄格成败判定（来源：子平真诠"建禄月劫无格可取，
        # 须审用神轻重，或透官透印透财透食以取用"）
        # 建禄格本质：月令为日主禄位，身旺无疑，需泄耗制平衡
        # 成格：透官杀制身/透财泄秀/透食伤生财
        # 败格：满盘比劫无泄耗，旺而无用
        has_useful = ("正官" in tiangan_shishen_set or "七杀" in tiangan_shishen_set
                      or "正财" in tiangan_shishen_set or "偏财" in tiangan_shishen_set
                      or "食神" in tiangan_shishen_set or "伤官" in tiangan_shishen_set)
        if has_useful:
            if "正官" in tiangan_shishen_set or "七杀" in tiangan_shishen_set:
                chengbai_reasons.append("官杀制身")
            if "正财" in tiangan_shishen_set or "偏财" in tiangan_shishen_set:
                chengbai_reasons.append("财星泄秀")
            if "食神" in tiangan_shishen_set or "伤官" in tiangan_shishen_set:
                chengbai_reasons.append("食伤泄秀")
        else:
            chengbai = "败格"
            chengbai_reasons.append("满盘比劫无泄耗制，旺而无用")

    elif geju_shishen == "劫财":
        # 羊刃格成败判定（来源：子平真诠"阳刃格喜官杀制刃"）
        # 成格：有官杀制刃/有印化杀护刃
        # 败格：无官杀制，刃旺无制
        has_guansha = "正官" in tiangan_shishen_set or "七杀" in tiangan_shishen_set
        if has_guansha:
            if "正官" in tiangan_shishen_set:
                chengbai_reasons.append("官星制刃")
            if "七杀" in tiangan_shishen_set:
                chengbai_reasons.append("七杀制刃")
            if "正印" in tiangan_shishen_set or "偏印" in tiangan_shishen_set:
                chengbai_reasons.append("印化杀护刃")
        else:
            # 无官杀但有食伤泄秀也可
            if "食神" in tiangan_shishen_set or "伤官" in tiangan_shishen_set:
                chengbai_reasons.append("食伤泄刃")
            else:
                chengbai = "败格"
                chengbai_reasons.append("刃旺无官杀制，亦无食伤泄")

    # 格局层次判定（来源：子平真诠"清浊"论）
    # 清：格神有力+用神专一+无忌神杂气干扰
    # 浊：格神虽成但有杂气（官杀混杂/用忌并透/格神受损而有救）
    # 来源：子平真诠第十七章"论用神格局高低"
    if chengbai == "成格":
        has_hunza = False
        # 官杀混杂为浊（来源：子平真诠"正官格忌杀混"）
        if "七杀" in tiangan_shishen_set and "正官" in tiangan_shishen_set:
            has_hunza = True
        # 格局有救应（先败后救）为浊：虽成格但经历了破→救，不如纯粹
        if any("·救应" in r for r in chengbai_reasons):
            has_hunza = True

        if has_hunza:
            cengci = "浊"
        else:
            cengci = "清"
    else:
        cengci = "破"

    geju_updated = dict(geju)
    geju_updated["成败"] = chengbai
    geju_updated["成败依据"] = "；".join(chengbai_reasons) if chengbai_reasons else "基本成格"
    geju_updated["层次"] = cengci
    return geju_updated


def judge_geju(paipan_data: dict, wangshuai: dict = None) -> dict:
    """
    完整格局判定（v2 子平真诠体系）

    判定优先级：
    1. 外格·专旺格（条件极苛刻）
    2. 外格·从格（日主极弱无帮扶）
    3. 正格取格（月令藏干透出）
    4. 成败判定（相神/忌神/救应）

    参数：
        paipan_data: 排盘结果
        wangshuai: 旺衰判定结果（可选，用于辅助判定）

    返回：格局判定 JSON
    """
    # Step 1: 检查专旺格（条件最苛刻，优先）
    zhuanwang = _check_zhuanwang(paipan_data)
    if zhuanwang:
        return zhuanwang

    # Step 2: 检查从弱格（从财/从杀/从儿）
    congge = _check_congge(paipan_data, wangshuai)
    if congge:
        return congge

    # Step 3: 检查从旺格/从强格
    congwang = _check_congwang(paipan_data, wangshuai)
    if congwang:
        return congwang

    # Step 4: 检查化气格
    huaqi = _check_huaqi(paipan_data)
    if huaqi:
        return huaqi

    # Step 5: 正格取格
    geju = _take_zhengge(paipan_data)

    # Step 6: 成败判定
    geju = _judge_chengbai(paipan_data, geju, wangshuai)

    return geju


# ============================================================
# 十神分布统计
# ============================================================

def analyze_shishen(paipan_data: dict) -> dict:
    """统计十神在四柱中的分布（天干透出 + 地支藏干）"""
    from engine.paipan import get_shishen

    day_master = paipan_data["日主"]["天干"]
    distribution = {}

    # 天干透出
    for pos in ["年柱", "月柱", "时柱"]:
        ss = paipan_data["四柱"][pos]["天干十神"]
        if ss not in distribution:
            distribution[ss] = {"透干": [], "藏干": [], "力量": 0}
        distribution[ss]["透干"].append(pos)
        distribution[ss]["力量"] += 10

    # 地支藏干
    score_map = {"本气": 10, "中气": 5, "余气": 3}
    for pos in ["年柱", "月柱", "日柱", "时柱"]:
        for cg in paipan_data["四柱"][pos]["藏干"]:
            ss = cg["十神"]
            if ss not in distribution:
                distribution[ss] = {"透干": [], "藏干": [], "力量": 0}
            distribution[ss]["藏干"].append(f"{pos}·{cg['气类']}")
            distribution[ss]["力量"] += score_map.get(cg["气类"], 3)

    # 找出完全缺失的十神
    all_shishen = {"比肩", "劫财", "食神", "伤官", "偏财", "正财", "七杀", "正官", "偏印", "正印"}
    missing = all_shishen - set(distribution.keys())

    return {
        "分布": distribution,
        "缺失十神": list(missing),
    }


# ============================================================
# 合冲刑害分析
# ============================================================

def analyze_relationships(paipan_data: dict) -> dict:
    """
    分析四柱间的合冲刑害关系（v2 含力量判断）

    v2 新增字段（来源：子平真诠/滴天髓/三命通会）：
    - 远近：紧邻/隔柱/遥柱（影响力量大小）
    - 是否化成：天干合化/地支合化条件判定
    - 胜负：六冲中谁胜谁负（得令/有根/多寡）
    - 力量：强/中/弱
    """
    pillars = ["年柱", "月柱", "日柱", "时柱"]
    dizhi_list = [(pos, paipan_data["四柱"][pos]["地支"]) for pos in pillars]
    tiangan_list = [(pos, paipan_data["四柱"][pos]["天干"]) for pos in pillars]
    month_zhi = paipan_data["月令"]["月支"]
    month_wuxing = WUXING_OF_DIZHI_V3.get(month_zhi, "")

    results = {"六合": [], "六冲": [], "三合": [], "半合": [],
               "三刑": [], "自刑": [], "相害": [], "天干合": []}

    # 辅助：柱位索引距离 → 远近描述
    pillar_indices = {"年柱": 0, "月柱": 1, "日柱": 2, "时柱": 3}

    def _get_distance_desc(pos_a, pos_b):
        """获取两柱距离描述（来源：子平真诠'远近论'）"""
        dist = abs(pillar_indices[pos_a] - pillar_indices[pos_b])
        if dist == 1:
            return "紧邻", "强"
        elif dist == 2:
            return "隔柱", "中"
        else:
            return "遥隔", "弱"

    # 地支六合化成条件表（来源：三命通会）
    # {(支A, 支B): (化成五行, 需要月令五行)}
    LIUHE_HUACHENG = {
        "子丑": ("土", {"辰", "戌", "丑", "未"}),
        "寅亥": ("木", {"寅", "卯"}),
        "卯戌": ("火", {"巳", "午"}),
        "辰酉": ("金", {"申", "酉"}),
        "巳申": ("水", {"亥", "子"}),
        "午未": ("土", {"辰", "戌", "丑", "未", "巳", "午"}),  # 午未可化土或火
    }

    # 天干五合化成条件表（来源：三命通会"甲己化土非辰戌丑未月不行"）
    # {(干A, 干B): (化成五行, 需要月支属于的五行)}
    WUHE_HUACHENG_MONTH = {
        "土": {"辰", "戌", "丑", "未"},  # 甲己合化土：需土月
        "金": {"申", "酉"},  # 乙庚合化金：需金月
        "水": {"亥", "子"},  # 丙辛合化水：需水月
        "木": {"寅", "卯"},  # 丁壬合化木：需木月
        "火": {"巳", "午"},  # 戊癸合化火：需火月
    }

    # 地支两两检查
    for i in range(len(dizhi_list)):
        for j in range(i + 1, len(dizhi_list)):
            pos_a, zhi_a = dizhi_list[i]
            pos_b, zhi_b = dizhi_list[j]
            distance_desc, force_level = _get_distance_desc(pos_a, pos_b)

            # 六合
            if LIUHE.get(zhi_a) == zhi_b:
                # 判断是否化成（来源：三命通会·地支六合化成条件）
                he_key = zhi_a + zhi_b if zhi_a + zhi_b in LIUHE_HUACHENG else zhi_b + zhi_a
                hua_info = LIUHE_HUACHENG.get(he_key)
                is_huacheng = False
                hua_wuxing = ""
                if hua_info and distance_desc == "紧邻":
                    hua_wuxing, need_months = hua_info
                    if month_zhi in need_months:
                        is_huacheng = True

                results["六合"].append({
                    "柱位": f"{pos_a}+{pos_b}",
                    "地支": f"{zhi_a}{zhi_b}合",
                    "远近": distance_desc,
                    "力量": force_level,
                    "是否化成": is_huacheng,
                    "合化五行": hua_wuxing if is_huacheng else "",
                    "效应": f"合化{hua_wuxing}" if is_huacheng else "合绊（减力不化）",
                    "来源": "三命通会·地支六合",
                })

            # 六冲
            if LIUCHONG.get(zhi_a) == zhi_b:
                # 判断胜负（来源：滴天髓"旺冲衰则衰败"）
                wx_a = WUXING_OF_DIZHI_V3.get(zhi_a, "")
                wx_b = WUXING_OF_DIZHI_V3.get(zhi_b, "")
                # 得令者为胜方
                if wx_a == month_wuxing:
                    winner = zhi_a
                    loser = zhi_b
                    victory_reason = f"{zhi_a}得令({month_wuxing})胜"
                elif wx_b == month_wuxing:
                    winner = zhi_b
                    loser = zhi_a
                    victory_reason = f"{zhi_b}得令({month_wuxing})胜"
                else:
                    winner = ""
                    loser = ""
                    victory_reason = "双方均不得令，势均力敌"

                results["六冲"].append({
                    "柱位": f"{pos_a}+{pos_b}",
                    "地支": f"{zhi_a}{zhi_b}冲",
                    "远近": distance_desc,
                    "力量": force_level,
                    "胜方": winner,
                    "败方": loser,
                    "胜负依据": victory_reason,
                    "效应": f"{loser}被冲损" if loser else "互冲减力",
                    "来源": "滴天髓·冲之旺衰论",
                })

            # 相害
            if XIANGHARM.get(zhi_a) == zhi_b:
                results["相害"].append({
                    "柱位": f"{pos_a}+{pos_b}",
                    "地支": f"{zhi_a}{zhi_b}害",
                    "远近": distance_desc,
                    "力量": force_level,
                    "效应": "暗损（合中生害）",
                    "来源": "三命通会·相害",
                })

            # 自刑（同字并列）
            if zhi_a == zhi_b:
                if ZIXING_EXTENDED or zhi_a in ZIXING_STRICT:
                    results["自刑"].append({
                        "柱位": f"{pos_a}+{pos_b}",
                        "地支": f"{zhi_a}{zhi_b}自刑",
                        "远近": distance_desc,
                        "力量": force_level,
                        "效应": "同气内耗",
                        "来源": "三命通会·自刑",
                    })

    # 半合检查
    dizhi_set = {zhi for _, zhi in dizhi_list}
    for z1, z2, wuxing in BANHE:
        if z1 in dizhi_set and z2 in dizhi_set:
            pos_list = [pos for pos, zhi in dizhi_list if zhi in (z1, z2)]
            results["半合"].append({
                "柱位": "+".join(pos_list),
                "地支": f"{z1}{z2}半合{wuxing}",
                "合化五行": wuxing,
                "力量": "中",
                "效应": f"半合{wuxing}局（力弱于三合）",
                "来源": "三命通会·三合局",
            })

    # 三合检查
    for z1, z2, z3, wuxing in SANHE:
        if z1 in dizhi_set and z2 in dizhi_set and z3 in dizhi_set:
            results["三合"].append({
                "地支": f"{z1}{z2}{z3}三合{wuxing}局",
                "合化五行": wuxing,
                "力量": "强",
                "效应": f"三合成{wuxing}局（化力最强）",
                "来源": "三命通会·三合局",
            })

    # 天干合检查
    for i in range(len(tiangan_list)):
        for j in range(i + 1, len(tiangan_list)):
            pos_a, gan_a = tiangan_list[i]
            pos_b, gan_b = tiangan_list[j]
            if gan_a in TIANGAN_WUHE and TIANGAN_WUHE[gan_a][0] == gan_b:
                hua_wuxing = TIANGAN_WUHE[gan_a][1]
                distance_desc, force_level = _get_distance_desc(pos_a, pos_b)

                # 判断是否化成（来源：三命通会"甲己化土非辰戌丑未月不行"）
                need_months = WUHE_HUACHENG_MONTH.get(hua_wuxing, set())
                is_huacheng = (distance_desc == "紧邻" and month_zhi in need_months)

                results["天干合"].append({
                    "柱位": f"{pos_a}+{pos_b}",
                    "天干": f"{gan_a}{gan_b}合{hua_wuxing}",
                    "远近": distance_desc,
                    "力量": force_level,
                    "是否化成": is_huacheng,
                    "合化五行": hua_wuxing if is_huacheng else "",
                    "效应": f"合化{hua_wuxing}" if is_huacheng else "合绊（牵制减力不化）",
                    "来源": "三命通会·天干五合",
                })

    return results


def _annotate_yongshen_impact(relationships: dict, yongshen: dict, paipan_data: dict):
    """
    对合冲刑害结果进行用神净影响标注（原地修改 relationships）

    来源：子平真诠·论用神成败
    原则：
    - 合走用神 → 凶（用神被绊，不能发挥作用）
    - 冲开用神 → 凶（用神被损伤）
    - 合走忌神 → 吉（忌神被制，不能为害）
    - 冲开忌神 → 吉（忌神被冲去）
    """
    # 提取用神/忌神五行
    yongshen_wuxings = set()
    jishen_wuxings = set()
    for item in yongshen.get("用神", []):
        wx = item.get("五行", "")
        if wx:
            yongshen_wuxings.add(wx)
    for item in yongshen.get("忌神", []):
        wx = item.get("五行", "")
        if wx:
            jishen_wuxings.add(wx)

    if not yongshen_wuxings and not jishen_wuxings:
        return

    # 标注六合对用神的影响
    for item in relationships.get("六合", []):
        # 六合中被合的两支，各自五行
        dizhi_str = item.get("地支", "")
        if len(dizhi_str) >= 2:
            zhi_a, zhi_b = dizhi_str[0], dizhi_str[1]
            wx_a = WUXING_OF_DIZHI_V3.get(zhi_a, "")
            wx_b = WUXING_OF_DIZHI_V3.get(zhi_b, "")
            involved_wx = {wx_a, wx_b} - {""}

            if involved_wx & yongshen_wuxings:
                item["用神影响"] = "凶·用神被合绊"
            elif involved_wx & jishen_wuxings:
                item["用神影响"] = "吉·忌神被合制"
            else:
                item["用神影响"] = "中性"

    # 标注六冲对用神的影响
    for item in relationships.get("六冲", []):
        loser = item.get("败方", "")
        if loser:
            loser_wx = WUXING_OF_DIZHI_V3.get(loser, "")
            if loser_wx in yongshen_wuxings:
                item["用神影响"] = "凶·用神被冲损"
            elif loser_wx in jishen_wuxings:
                item["用神影响"] = "吉·忌神被冲去"
            else:
                item["用神影响"] = "中性"
        else:
            item["用神影响"] = "中性·势均力敌"

    # 标注天干合对用神的影响
    for item in relationships.get("天干合", []):
        tiangan_str = item.get("天干", "")
        if len(tiangan_str) >= 2:
            gan_a, gan_b = tiangan_str[0], tiangan_str[1]
            wx_a = WUXING_OF_TIANGAN_V3.get(gan_a, "")
            wx_b = WUXING_OF_TIANGAN_V3.get(gan_b, "")
            involved_wx = {wx_a, wx_b} - {""}

            if involved_wx & yongshen_wuxings:
                item["用神影响"] = "凶·用神被合绊"
            elif involved_wx & jishen_wuxings:
                item["用神影响"] = "吉·忌神被合制"
            else:
                item["用神影响"] = "中性"


# ============================================================
# 用神推导（v2 四法融合体系）
# 来源：子平真诠(格局用神)、穷通宝鉴(调候用神)、滴天髓(扶抑/通关)
# ============================================================

# 调候用神表（穷通宝鉴·十天干×十二月 = 120条）
# 格式：{日干: {月支: [主用神天干, 次用神天干, ...]}}
# 月支对应农历月份：寅=正月 卯=二月 ... 丑=十二月
# 来源：算准网《穷通宝鉴》调候用神简表 + 余春台原注
TIAOHUO_TABLE = {
    "甲": {
        "寅": ["丙", "癸"],  # 正月：丙火为主，癸水为佐
        "卯": ["庚", "丙", "丁"],  # 二月：专用庚金，无庚用丙丁
        "辰": ["庚", "丁", "壬"],  # 三月：用庚必须有丁，无庚用壬
        "巳": ["癸", "丁", "庚"],  # 四月
        "午": ["癸", "丁", "庚"],  # 五月：无癸用丁，木多取庚
        "未": ["癸", "庚", "丁"],  # 六月：上半月用癸，下半月取庚丁
        "申": ["庚", "丁", "壬"],  # 七月：伤官格可专用壬
        "酉": ["庚", "丁", "丙"],  # 八月：丙为调候，庚为主
        "戌": ["庚", "甲", "丁", "壬"],  # 九月：土多用甲，木多用庚
        "亥": ["庚", "丁", "丙"],  # 十月：用庚丁，丙为调候
        "子": ["丁", "庚", "丙"],  # 十一月：丁先庚后，丙火佐之
        "丑": ["丁", "庚", "丙"],  # 十二月：丁为必须
    },
    "乙": {
        "寅": ["丙", "癸"],  # 正月：取丙调候，癸水略取
        "卯": ["丙", "癸"],  # 二月：同正月
        "辰": ["癸", "丙", "戊"],  # 三月：水局专取戊制水
        "巳": ["癸"],  # 四月：专用癸水调候为急
        "午": ["癸", "丙"],  # 五月：上旬用癸，下旬丙癸兼用
        "未": ["癸", "丙"],  # 六月：多金水先取丙，忌戊己混
        "申": ["丙", "癸", "己"],  # 七月：有庚取丙癸克泄
        "酉": ["癸", "丙", "丁"],  # 八月：上旬癸先丙后，下旬丙先癸后
        "戌": ["癸", "辛"],  # 九月：癸辛金见甲谓藤萝系松柏
        "亥": ["丙", "戊"],  # 十月：专取丙用，水多兼用戊
        "子": ["丙"],  # 十一月：专用丙火
        "丑": ["丙"],  # 十二月：寒谷之木，专用丙火
    },
    "丙": {
        "寅": ["壬", "庚"],  # 正月：壬水为用，庚为佐
        "卯": ["壬", "己"],  # 二月：水多兼用戊
        "辰": ["壬", "甲"],  # 三月：专用壬水，土厚以甲为佐
        "巳": ["壬", "庚", "癸"],  # 四月：以庚为佐，无壬可用癸
        "午": ["壬", "庚"],  # 五月：庚通申支者更佳
        "未": ["壬", "庚"],  # 六月：同五月
        "申": ["壬", "戊"],  # 七月：水众取戊兼制
        "酉": ["壬", "癸"],  # 八月：独壬为奇，无壬取癸
        "戌": ["甲", "壬"],  # 九月：忌土厚，先取甲
        "亥": ["甲", "戊", "庚", "壬"],  # 十月：水众取甲，火旺用壬
        "子": ["壬", "戊", "己"],  # 十一月：水众以戊己制
        "丑": ["壬", "甲"],  # 十二月：土众必须以甲辅佐
    },
    "丁": {
        "寅": ["甲", "庚"],  # 正月：用甲必须兼用庚金
        "卯": ["庚", "甲"],  # 二月：有乙者庚为优先
        "辰": ["甲", "庚", "戊"],  # 三月：木盛用庚，水众用戊
        "巳": ["甲", "庚"],  # 四月：木多者取庚为先
        "午": ["壬", "庚", "癸"],  # 五月：壬癸二透为贵格
        "未": ["甲", "壬", "庚"],  # 六月：用甲者不可缺庚
        "申": ["甲", "庚", "丙", "戊"],  # 七月
        "酉": ["甲", "庚", "丙", "戊"],  # 八月：戊成局即伤官伤尽
        "戌": ["甲", "庚", "戊"],  # 九月：同八月论
        "亥": ["甲", "庚"],  # 十月：甲为主
        "子": ["甲", "庚"],  # 十一月：同十月
        "丑": ["甲", "庚"],  # 十二月：同十月
    },
    "戊": {
        "寅": ["丙", "甲", "癸"],  # 正月：先丙次甲次癸
        "卯": ["丙", "甲", "癸"],  # 二月：同正月
        "辰": ["甲", "丙", "癸"],  # 三月：土当令，先甲次丙次癸
        "巳": ["甲", "丙", "癸"],  # 四月：同三月
        "午": ["壬", "甲", "丙"],  # 五月：调候为上，先用壬水
        "未": ["癸", "丙", "甲"],  # 六月：壬水不足调候，癸水优先
        "申": ["丙", "癸", "甲"],  # 七月：初秋丙火为先
        "酉": ["丙", "癸"],  # 八月：中秋尤须丙火为尊
        "戌": ["甲", "丙", "癸"],  # 九月：有金局者癸先丙后
        "亥": ["甲", "丙"],  # 十月：二者俱不可缺
        "子": ["丙", "甲"],  # 十一月：丙为尊上，甲为佐
        "丑": ["丙", "甲"],  # 十二月：同十一月
    },
    "己": {
        "寅": ["丙", "庚", "甲"],  # 正月：忌壬水有根
        "卯": ["甲", "癸", "丙"],  # 二月：忌甲己合土
        "辰": ["丙", "癸", "甲"],  # 三月：土众者甲为优先
        "巳": ["癸", "丙"],  # 四月：调候为上，癸为尊
        "午": ["癸", "丙"],  # 五月：同四月
        "未": ["癸", "丙"],  # 六月：同四月
        "申": ["丙", "癸"],  # 七月：庚当令，必须丙火制之
        "酉": ["丙", "癸"],  # 八月：同七月，可酌取辛金
        "戌": ["甲", "丙", "癸"],  # 九月：土盛用甲
        "亥": ["丙", "甲", "戊"],  # 十月：调候以丙为上
        "子": ["丙", "甲", "戊"],  # 十一月：同十月
        "丑": ["丙", "甲", "戊"],  # 十二月：同十月
    },
    "庚": {
        "寅": ["戊", "甲", "丙", "丁"],  # 正月：火多重土
        "卯": ["丁", "甲", "丙"],  # 二月：无丁可取丙
        "辰": ["甲", "丁", "壬", "癸"],  # 三月：支火旺用癸
        "巳": ["壬", "丙", "丁", "戊"],  # 四月：支成金局以丁为主
        "午": ["壬", "癸"],  # 五月：火旺无壬癸可用戊己
        "未": ["丁", "甲"],  # 六月：支成土局则甲先丁后
        "申": ["丁", "甲"],  # 七月：专用丁火，无甲不可用乙
        "酉": ["丁", "甲", "丙"],  # 八月：丙火略取即可
        "戌": ["甲", "壬"],  # 九月：用壬忌见己土混浊
        "亥": ["丁", "丙"],  # 十月：无甲可用甲木
        "子": ["丁", "甲", "丙"],  # 十一月：丙不可缺
        "丑": ["丙", "丁", "甲"],  # 十二月：同十一月
    },
    "辛": {
        "寅": ["己", "壬", "庚"],  # 正月：己土生金为主
        "卯": ["壬", "甲"],  # 二月：忌丁透干支
        "辰": ["壬", "甲"],  # 三月：丙辛合水须兼用丙
        "巳": ["壬", "甲", "癸"],  # 四月：无戊者为上格
        "午": ["壬", "己", "癸"],  # 五月：壬己不宜偏旺
        "未": ["壬", "庚", "甲"],  # 六月：忌土旺
        "申": ["壬", "甲", "戊"],  # 七月：壬水为尊
        "酉": ["壬", "甲", "丁"],  # 八月：土盛甲为先
        "戌": ["壬", "甲"],  # 九月：畏火土旺
        "亥": ["壬", "丙"],  # 十月：金清水白之格
        "子": ["丙", "戊", "壬"],  # 十一月：丙不可缺
        "丑": ["丙", "戊", "壬"],  # 十二月：丙不可缺
    },
    "壬": {
        "寅": ["庚", "丙", "戊"],  # 正月：比劫重戊为先
        "卯": ["戊", "辛", "庚"],  # 二月：水多成局以戊为重
        "辰": ["甲", "庚", "丙"],  # 三月：金成方局须兼用丙
        "巳": ["壬", "辛", "庚", "癸"],  # 四月：比劫伏于庚辛
        "午": ["癸", "庚", "辛"],  # 五月：忌丁透干制癸
        "未": ["辛", "甲"],  # 六月：土众者甲先辛后
        "申": ["戊", "丁"],  # 七月：戊须坐辰戌，丁须坐午戌
        "酉": ["甲", "庚"],  # 八月：水只宜一位
        "戌": ["甲", "丙"],  # 九月：有合者丙先甲后
        "亥": ["戊", "丙", "庚"],  # 十月：木众之局庚为优先
        "子": ["戊", "丙"],  # 十一月：二者不可缺一
        "丑": ["丙", "甲", "丁"],  # 十二月：上旬丙优先，下旬丁甲并用
    },
    "癸": {
        "寅": ["辛", "丙"],  # 正月：无辛用庚须丙庚均势
        "卯": ["庚", "辛"],  # 二月：乙卯合庚优于用辛
        "辰": ["丙", "辛", "甲"],  # 三月：上旬用丙，下旬辛甲并用
        "巳": ["辛"],  # 四月：庚亦可代取用
        "午": ["庚", "辛", "癸"],  # 五月：不可见强力之丁火
        "未": ["庚", "辛", "癸"],  # 六月：同五月
        "申": ["丁"],  # 七月：有金局者丁须支通午未
        "酉": ["辛", "丙"],  # 八月：二全者水暖金温
        "戌": ["辛", "甲", "癸", "壬"],  # 九月：忌土盛
        "亥": ["庚", "辛", "戊", "丁"],  # 十月：水多戊为先，金众丁为先
        "子": ["丙", "辛"],  # 十一月：丙不可缺
        "丑": ["丙", "丁"],  # 十二月：宜夜生，火成方局则须庚辛
    },
}

# 天干五行映射
TIANGAN_WUXING = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
    "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
}

# 格局用神规则表（子平真诠·八格喜忌）
# 格式：{格局名: {"用神十神": [...], "忌神十神": [...], "相神十神": [...], "来源": "..."}}
GEJU_YONGSHEN_RULES = {
    "正官格": {
        "用神": ["正印", "正财"],  # 印制伤护官 / 财生官
        "忌神": ["伤官", "七杀"],  # 伤官见官为忌 / 杀混官
        "相神": ["正印"],  # 印为正官格之相神
        "来源": "子平真诠·论正官",
    },
    "七杀格": {
        "用神": ["食神", "正印"],  # 食制杀 / 印化杀
        "忌神": ["正财", "偏财"],  # 财生杀为忌
        "相神": ["食神"],  # 食为七杀格之相神
        "来源": "子平真诠·论偏官",
    },
    "正财格": {
        "用神": ["食神", "正官"],  # 食生财 / 官护财
        "忌神": ["比肩", "劫财"],  # 比劫夺财
        "相神": ["食神"],
        "来源": "子平真诠·论正财",
    },
    "偏财格": {
        "用神": ["食神", "七杀"],  # 食生财 / 杀制比劫护财
        "忌神": ["比肩", "劫财"],  # 比劫夺财
        "相神": ["食神"],
        "来源": "子平真诠·论偏财",
    },
    "正印格": {
        "用神": ["正官", "七杀"],  # 官杀生印
        "忌神": ["正财", "偏财"],  # 财坏印
        "相神": ["正官"],
        "来源": "子平真诠·论印绶",
    },
    "偏印格": {
        "用神": ["比肩", "劫财"],  # 比劫泄秀化枭
        "忌神": ["正财", "偏财"],  # 财坏印
        "相神": ["比肩"],
        "来源": "子平真诠·论印绶",
    },
    "食神格": {
        "用神": ["正财", "偏财"],  # 财化食生财
        "忌神": ["偏印"],  # 枭神夺食
        "相神": ["正财"],  # 财为食神格之相神（制枭救食）
        "来源": "子平真诠·论食神",
    },
    "伤官格": {
        "用神": ["正财", "正印"],  # 财化伤生财 / 印制伤
        "忌神": ["正官"],  # 伤官见官为忌
        "相神": ["正财", "正印"],
        "来源": "子平真诠·论伤官",
    },
    "建禄格": {
        "用神": ["正官", "七杀", "正财"],  # 官杀制刃 / 财泄比劫
        "忌神": ["比肩", "劫财"],  # 比劫太多无制
        "相神": ["正官"],
        "来源": "子平真诠·论建禄月劫",
    },
    "羊刃格": {
        "用神": ["正官", "七杀"],  # 官杀制刃
        "忌神": ["比肩", "劫财"],  # 比劫太多无制
        "相神": ["七杀"],  # 杀为羊刃格之相神
        "来源": "子平真诠·论阳刃",
    },
}

# 通关用神规则表（滴天髓）
# 两行相战时，取中间五行通关
TONGGUAN_TABLE = {
    ("木", "土"): "火",  # 木土交战，火通关
    ("土", "木"): "火",
    ("水", "火"): "木",  # 水火交战，木通关
    ("火", "水"): "木",
    ("金", "木"): "水",  # 金木交战，水通关
    ("木", "金"): "水",
    ("火", "金"): "土",  # 火金交战，土通关
    ("金", "火"): "土",
    ("土", "水"): "金",  # 土水交战，金通关
    ("水", "土"): "金",
}

# 冬月/夏月判定（调候急需度高的月支）
WINTER_MONTHS = {"亥", "子", "丑"}  # 冬月：调候急需丙火
SUMMER_MONTHS = {"巳", "午", "未"}  # 夏月：调候急需壬水


def _get_tiaohuo_yongshen(day_gan: str, month_zhi: str) -> dict:
    """
    查询穷通宝鉴调候用神表（来源：穷通宝鉴·余春台编订）

    返回: {"调候用神": [天干列表], "急需度": "高/中/低", "来源": "穷通宝鉴"}
    """
    tiaohuo_list = TIAOHUO_TABLE.get(day_gan, {}).get(month_zhi, [])
    if not tiaohuo_list:
        return {"调候用神": [], "急需度": "低", "来源": "穷通宝鉴"}

    if month_zhi in WINTER_MONTHS or month_zhi in SUMMER_MONTHS:
        urgency = "高"
    elif month_zhi in {"辰", "戌"}:
        urgency = "中"  # 辰戌为季月，调候需求中等
    else:
        urgency = "低"

    return {"调候用神": tiaohuo_list, "急需度": urgency, "来源": "穷通宝鉴"}


def _get_geju_yongshen(geju: dict, dm_wuxing: str) -> dict:
    """
    根据格局判定结果，推导格局用神（来源：子平真诠·八格喜忌）

    返回: {"格局用神": [十神], "格局忌神": [十神], "取用法": "格局/从格/病药", "来源": "..."}
    """
    geju_name = geju.get("格局", "")
    geju_type = geju.get("格局类型", "")
    chengbai = geju.get("成败", "")

    # 从格：顺势取用
    if "从格" in geju_type or "专旺" in geju_type:
        ding_ge_shishen = geju.get("定格十神", "")
        if "从财" in geju_name:
            return {
                "格局用神": ["正财", "偏财", "食神"],
                "格局忌神": ["比肩", "劫财", "正印", "偏印"],
                "取用法": "从格顺势",
                "来源": "子平真诠/滴天髓·从财格顺其旺神",
            }
        elif "从杀" in geju_name:
            return {
                "格局用神": ["七杀", "正官", "正财"],
                "格局忌神": ["比肩", "劫财", "正印", "食神"],
                "取用法": "从格顺势",
                "来源": "子平真诠/滴天髓·从杀格顺其旺神",
            }
        elif "从儿" in geju_name:
            return {
                "格局用神": ["食神", "伤官", "正财", "偏财"],
                "格局忌神": ["正印", "偏印", "正官", "七杀"],
                "取用法": "从格顺势",
                "来源": "子平真诠/滴天髓·从儿格顺其旺神",
            }
        elif "从旺" in geju_name or "从强" in geju_name:
            return {
                "格局用神": ["比肩", "劫财", "正印", "偏印"],
                "格局忌神": ["正官", "七杀", "正财", "偏财"],
                "取用法": "从格顺势",
                "来源": "滴天髓·从旺/从强格顺其旺神",
            }
        else:
            # 专旺格（曲直/炎上/润下/从革/稼穑）
            return {
                "格局用神": ["比肩", "劫财", "食神", "伤官"],
                "格局忌神": ["正官", "七杀"],
                "取用法": "专旺顺势",
                "来源": "三命通会·专旺格顺旺势泄秀",
            }

    # 正格：查表
    rules = GEJU_YONGSHEN_RULES.get(geju_name)
    if not rules:
        # 未匹配到格局规则，返回空
        return {"格局用神": [], "格局忌神": [], "取用法": "无格局规则", "来源": ""}

    if chengbai == "败格":
        # 败格：病药用神 → 去掉导致败格的"病"即为"药"
        # 病 = 忌神中实际出现的那个
        # 药 = 能制住病神的十神
        return {
            "格局用神": rules["用神"],
            "格局忌神": rules["忌神"],
            "取用法": "病药（败格需去病）",
            "来源": rules["来源"] + "·败格病药法",
        }

    # 成格：护格之神为用
    return {
        "格局用神": rules["用神"],
        "格局忌神": rules["忌神"],
        "取用法": "格局护格",
        "来源": rules["来源"],
    }


def _get_fuyi_yongshen(dm_wuxing: str, conclusion: str) -> dict:
    """
    扶抑用神（滴天髓·旺衰论）

    返回: {"扶抑用神": [{"五行": ..., "十神类": ...}], "扶抑忌神": [...]}
    """
    sheng_wo = WUXING_SHENG_WO[dm_wuxing]  # 印星五行
    tong_wo = dm_wuxing  # 比劫五行
    wo_sheng = WUXING_SHENG[dm_wuxing]  # 食伤五行
    wo_ke = WUXING_KE[dm_wuxing]  # 财星五行
    ke_wo = WUXING_KE_WO[dm_wuxing]  # 官杀五行

    if conclusion == "身弱":
        return {
            "扶抑用神": [
                {"五行": sheng_wo, "十神类": "印星", "理由": "生扶日主"},
                {"五行": tong_wo, "十神类": "比劫", "理由": "帮身"},
            ],
            "扶抑忌神": [
                {"五行": ke_wo, "十神类": "官杀", "理由": "克身加重"},
                {"五行": wo_ke, "十神类": "财星", "理由": "耗身"},
                {"五行": wo_sheng, "十神类": "食伤", "理由": "泄身"},
            ],
        }
    elif conclusion == "身旺":
        return {
            "扶抑用神": [
                {"五行": wo_sheng, "十神类": "食伤", "理由": "泄秀"},
                {"五行": wo_ke, "十神类": "财星", "理由": "耗身生财"},
                {"五行": ke_wo, "十神类": "官杀", "理由": "制身"},
            ],
            "扶抑忌神": [
                {"五行": sheng_wo, "十神类": "印星", "理由": "再生身过旺"},
                {"五行": tong_wo, "十神类": "比劫", "理由": "帮身过旺"},
            ],
        }
    else:
        # 中和：不明显偏向
        return {
            "扶抑用神": [
                {"五行": wo_sheng, "十神类": "食伤", "理由": "中和微泄为佳"},
            ],
            "扶抑忌神": [],
        }


def _check_tongguan(paipan_data: dict, wangshuai: dict) -> dict | None:
    """
    检查是否需要通关用神（滴天髓·两行相战）

    触发条件：命局中两种五行力量都很强且相克，形成交战局面。
    返回: {"通关五行": "X", "理由": "A·B交战，X通关"} 或 None
    """
    # 获取五行力量分布
    scores = wangshuai.get("五行得分", {})
    if not scores:
        return None

    total = sum(scores.values()) if scores else 1
    dm_wuxing = paipan_data["日主"]["五行"]

    # 找出最强的两个五行
    sorted_wx = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    if len(sorted_wx) < 2:
        return None

    top1_wx, top1_score = sorted_wx[0]
    top2_wx, top2_score = sorted_wx[1]

    # 两行相战条件：两个最强五行相克，且各自占比超过30%
    top1_ratio = top1_score / total if total > 0 else 0
    top2_ratio = top2_score / total if total > 0 else 0

    if top1_ratio < 0.30 or top2_ratio < 0.25:
        return None

    # 检查是否相克
    if WUXING_KE.get(top1_wx) == top2_wx or WUXING_KE.get(top2_wx) == top1_wx:
        tongguan_wx = TONGGUAN_TABLE.get((top1_wx, top2_wx))
        if tongguan_wx:
            return {
                "通关五行": tongguan_wx,
                "理由": f"{top1_wx}({top1_ratio:.0%})·{top2_wx}({top2_ratio:.0%})交战，{tongguan_wx}通关",
            }

    return None


def judge_yongshen(paipan_data: dict, wangshuai: dict, geju: dict | None = None) -> dict:
    """
    用神推导（v2 四法融合体系）

    优先级框架（来源：子平真诠/穷通宝鉴/滴天髓综合）：
    - 从格/专旺格 → 顺势取用（不可逆）
    - 正格成格 → 格局用神为主 + 调候为辅(冬夏加权)
    - 正格败格 → 病药用神(去病之神) + 调候为辅
    - 无明确格局 → 调候优先(冬夏) + 扶抑兜底

    参数:
        paipan_data: 排盘数据
        wangshuai: 旺衰判定结果
        geju: 格局判定结果（可选，不传则内部调用judge_geju）
    """
    dm_wuxing = paipan_data["日主"]["五行"]
    day_gan = paipan_data["日主"]["天干"]
    month_zhi = paipan_data["月令"]["月支"]
    conclusion = wangshuai["结论"]

    # 如果未传入格局，内部调用
    if geju is None:
        geju = judge_geju(paipan_data, wangshuai)

    # === Step 1: 收集四法结果 ===
    tiaohuo = _get_tiaohuo_yongshen(day_gan, month_zhi)
    geju_ys = _get_geju_yongshen(geju, dm_wuxing)
    fuyi = _get_fuyi_yongshen(dm_wuxing, conclusion)
    tongguan = _check_tongguan(paipan_data, wangshuai)

    # === Step 2: 综合判定主用神 ===
    geju_type = geju.get("格局类型", "")
    is_congge = "从格" in geju_type or "专旺" in geju_type
    is_baige = geju.get("成败") == "败格"
    is_winter_summer = month_zhi in WINTER_MONTHS or month_zhi in SUMMER_MONTHS

    # 确定主取用法
    if is_congge:
        primary_method = "从格顺势"
    elif geju_ys.get("格局用神"):
        primary_method = geju_ys["取用法"]
    elif is_winter_summer:
        primary_method = "调候为主"
    else:
        primary_method = "扶抑为主"

    # === Step 3: 构建用神列表 ===
    yongshen_list = []
    jishen_list = []
    priority = 1

    # 3a. 格局用神（或从格顺势）
    if geju_ys.get("格局用神"):
        for shishen_name in geju_ys["格局用神"]:
            wx = _shishen_to_wuxing(shishen_name, dm_wuxing)
            yongshen_list.append({
                "五行": wx,
                "十神": shishen_name,
                "优先级": priority,
                "理由": f"格局用神·{geju['格局']}·{geju_ys['来源']}",
                "取用法": geju_ys["取用法"],
            })
            priority += 1

    if geju_ys.get("格局忌神"):
        ji_priority = 1
        for shishen_name in geju_ys["格局忌神"]:
            wx = _shishen_to_wuxing(shishen_name, dm_wuxing)
            jishen_list.append({
                "五行": wx,
                "十神": shishen_name,
                "优先级": ji_priority,
                "理由": f"格局忌神·{geju['格局']}·{geju_ys['来源']}",
            })
            ji_priority += 1

    # 3b. 调候用神（补充）
    if tiaohuo["调候用神"]:
        tiaohuo_wuxing_list = [TIANGAN_WUXING.get(tg, "") for tg in tiaohuo["调候用神"]]
        # 调候用神如果与格局用神五行重合 → 不重复添加
        existing_wx = {item["五行"] for item in yongshen_list}
        for i, tg in enumerate(tiaohuo["调候用神"]):
            wx = TIANGAN_WUXING.get(tg, "")
            if wx and wx not in existing_wx:
                yongshen_list.append({
                    "五行": wx,
                    "十神": _wuxing_to_shishen_type(wx, dm_wuxing),
                    "优先级": priority,
                    "理由": f"调候用神·{day_gan}日{month_zhi}月取{tg}·穷通宝鉴",
                    "取用法": "调候",
                })
                existing_wx.add(wx)
                priority += 1

    # 3c. 扶抑用神（如果格局/调候都未覆盖的五行）
    if not is_congge:
        existing_wx = {item["五行"] for item in yongshen_list}
        for fuyi_item in fuyi["扶抑用神"]:
            if fuyi_item["五行"] not in existing_wx:
                yongshen_list.append({
                    "五行": fuyi_item["五行"],
                    "十神": fuyi_item["十神类"],
                    "优先级": priority,
                    "理由": f"扶抑用神·{fuyi_item['理由']}·滴天髓",
                    "取用法": "扶抑",
                })
                existing_wx.add(fuyi_item["五行"])
                priority += 1

        # 扶抑忌神补充
        existing_ji_wx = {item["五行"] for item in jishen_list}
        ji_priority = len(jishen_list) + 1
        for fuyi_ji in fuyi["扶抑忌神"]:
            if fuyi_ji["五行"] not in existing_ji_wx:
                jishen_list.append({
                    "五行": fuyi_ji["五行"],
                    "十神": fuyi_ji["十神类"],
                    "优先级": ji_priority,
                    "理由": f"扶抑忌神·{fuyi_ji['理由']}",
                })
                existing_ji_wx.add(fuyi_ji["五行"])
                ji_priority += 1

    # 3d. 通关用神（条件性补充）
    if tongguan:
        existing_wx = {item["五行"] for item in yongshen_list}
        if tongguan["通关五行"] not in existing_wx:
            yongshen_list.append({
                "五行": tongguan["通关五行"],
                "十神": _wuxing_to_shishen_type(tongguan["通关五行"], dm_wuxing),
                "优先级": priority,
                "理由": f"通关用神·{tongguan['理由']}·滴天髓",
                "取用法": "通关",
            })

    # === Step 4: 确保至少有一个用神 ===
    if not yongshen_list:
        # 极端兜底：使用扶抑法
        sheng_wo = WUXING_SHENG_WO[dm_wuxing]
        yongshen_list.append({
            "五行": sheng_wo,
            "十神": "印星",
            "优先级": 1,
            "理由": "兜底·扶抑法取印星",
            "取用法": "扶抑",
        })

    return {
        "用神": yongshen_list,
        "忌神": jishen_list,
        "取用法": primary_method,
        "调候": tiaohuo,
        "格局用神分析": geju_ys,
        "通关": tongguan,
    }


def _shishen_to_wuxing(shishen_name: str, dm_wuxing: str) -> str:
    """十神名称转五行（来源：十神定义）"""
    mapping = {
        "比肩": dm_wuxing,
        "劫财": dm_wuxing,
        "食神": WUXING_SHENG[dm_wuxing],
        "伤官": WUXING_SHENG[dm_wuxing],
        "正财": WUXING_KE[dm_wuxing],
        "偏财": WUXING_KE[dm_wuxing],
        "正官": WUXING_KE_WO[dm_wuxing],
        "七杀": WUXING_KE_WO[dm_wuxing],
        "正印": WUXING_SHENG_WO[dm_wuxing],
        "偏印": WUXING_SHENG_WO[dm_wuxing],
        "印星": WUXING_SHENG_WO[dm_wuxing],
        "官杀": WUXING_KE_WO[dm_wuxing],
        "财星": WUXING_KE[dm_wuxing],
    }
    return mapping.get(shishen_name, "")


def _wuxing_to_shishen_type(wuxing: str, dm_wuxing: str) -> str:
    """五行转十神类型名（来源：十神定义）"""
    if wuxing == dm_wuxing:
        return "比劫"
    elif wuxing == WUXING_SHENG[dm_wuxing]:
        return "食伤"
    elif wuxing == WUXING_KE[dm_wuxing]:
        return "财星"
    elif wuxing == WUXING_KE_WO[dm_wuxing]:
        return "官杀"
    elif wuxing == WUXING_SHENG_WO[dm_wuxing]:
        return "印星"
    return "未知"


# ============================================================
# 神煞分析
# ============================================================

# 天乙贵人查表：以日干查地支
TIANYI_GUIREN = {
    "甲": ["丑", "未"], "乙": ["子", "申"], "丙": ["亥", "酉"],
    "丁": ["亥", "酉"], "戊": ["丑", "未"], "己": ["子", "申"],
    "庚": ["丑", "未"], "辛": ["寅", "午"], "壬": ["卯", "巳"],
    "癸": ["卯", "巳"],
}

# 华盖查表：以日支查地支（三合局末位）
HUAGAI = {
    "子": "辰", "丑": "丑", "寅": "戌", "卯": "未",
    "辰": "辰", "巳": "丑", "午": "戌", "未": "未",
    "申": "辰", "酉": "丑", "戌": "戌", "亥": "未",
}

# 驿马查表：以日支查地支（三合局对冲的长生位）
YIMA = {
    "子": "寅", "丑": "亥", "寅": "申", "卯": "巳",
    "辰": "寅", "巳": "亥", "午": "申", "未": "巳",
    "申": "寅", "酉": "亥", "戌": "申", "亥": "巳",
}

# 金舆查表：以日干查地支
JINYU = {
    "甲": "辰", "乙": "巳", "丙": "未", "丁": "申",
    "戊": "未", "己": "申", "庚": "戌", "辛": "亥",
    "壬": "丑", "癸": "寅",
}

# 天罗地网：戌为天罗，辰为地网
TIANLUO_DIZHI = "戌"
DIWANG_DIZHI = "辰"

# 亡神查表：以年支查地支
WANGSHEN = {
    "子": "亥", "丑": "申", "寅": "巳", "卯": "寅",
    "辰": "亥", "巳": "申", "午": "巳", "未": "寅",
    "申": "亥", "酉": "申", "戌": "巳", "亥": "寅",
}


def analyze_shenshas(paipan_data: dict) -> list:
    """
    神煞分析：基于日干/日支/年支查表，返回命中的神煞列表。
    每个神煞包含：名称/查法/来源柱位/吉凶/命理效应关键词
    """
    day_gan = paipan_data["日主"]["天干"]
    pillars = paipan_data["四柱"]
    day_zhi = pillars["日柱"]["地支"]
    year_zhi = pillars["年柱"]["地支"]

    all_zhi = {
        "年支": pillars["年柱"]["地支"],
        "月支": pillars["月柱"]["地支"],
        "日支": pillars["日柱"]["地支"],
        "时支": pillars["时柱"]["地支"],
    }

    # 大运地支也纳入检测（标注来源为"大运"）
    dayun_zhi = {}
    for dayun in paipan_data.get("大运", {}).get("大运列表", []):
        dayun_key = f"大运·{dayun['干支']}({dayun['起始虚岁']}-{dayun['结束虚岁']}虚)"
        dayun_zhi[dayun_key] = dayun["地支"]

    results = []

    # 1. 天乙贵人（日干查地支）
    guiren_targets = TIANYI_GUIREN.get(day_gan, [])
    found_in = [pos for pos, zhi in all_zhi.items() if zhi in guiren_targets]
    found_in_dayun = [pos for pos, zhi in dayun_zhi.items() if zhi in guiren_targets]
    results.append({
        "名称": "天乙贵人",
        "查法": f"日干{day_gan}见{'/'.join(guiren_targets)}",
        "原局来源": found_in if found_in else ["原局无"],
        "大运来源": found_in_dayun[:3] if found_in_dayun else ["大运无"],
        "吉凶": "吉",
        "效应": "逢凶化吉·贵人相助·社会资源",
    })

    # 2. 华盖（日支查地支）
    huagai_target = HUAGAI.get(day_zhi, "")
    found_in = [pos for pos, zhi in all_zhi.items() if zhi == huagai_target]
    results.append({
        "名称": "华盖",
        "查法": f"日支{day_zhi}见{huagai_target}",
        "原局来源": found_in if found_in else ["原局无"],
        "吉凶": "中性偏吉",
        "效应": "孤高好学·宗教艺术哲学天赋·独处不孤独",
    })

    # 3. 驿马（日支查地支）
    yima_target = YIMA.get(day_zhi, "")
    found_in = [pos for pos, zhi in all_zhi.items() if zhi == yima_target]
    found_in_dayun = [pos for pos, zhi in dayun_zhi.items() if zhi == yima_target]
    results.append({
        "名称": "驿马",
        "查法": f"日支{day_zhi}见{yima_target}",
        "原局来源": found_in if found_in else ["原局无"],
        "大运来源": found_in_dayun[:3] if found_in_dayun else [],
        "吉凶": "中性",
        "效应": "变动奔波·出行·换工作·搬家",
    })

    # 4. 金舆（日干查地支）
    jinyu_target = JINYU.get(day_gan, "")
    found_in = [pos for pos, zhi in all_zhi.items() if zhi == jinyu_target]
    results.append({
        "名称": "金舆",
        "查法": f"日干{day_gan}见{jinyu_target}",
        "原局来源": found_in if found_in else ["原局无"],
        "吉凶": "吉",
        "效应": "出行平安·有车缘·晚年物质不差",
    })

    # 5. 天罗（看四柱有无戌）
    tianluo_count = sum(1 for zhi in all_zhi.values() if zhi == TIANLUO_DIZHI)
    if tianluo_count > 0:
        found_in = [pos for pos, zhi in all_zhi.items() if zhi == TIANLUO_DIZHI]
        results.append({
            "名称": "天罗",
            "查法": f"四柱见戌（{tianluo_count}个）",
            "原局来源": found_in,
            "吉凶": "凶",
            "效应": f"思想画地为牢·{'双重' if tianluo_count >= 2 else ''}天罗=自我设限",
        })

    # 6. 地网（看四柱有无辰）
    diwang_count = sum(1 for zhi in all_zhi.values() if zhi == DIWANG_DIZHI)
    if diwang_count > 0:
        found_in = [pos for pos, zhi in all_zhi.items() if zhi == DIWANG_DIZHI]
        results.append({
            "名称": "地网",
            "查法": f"四柱见辰（{diwang_count}个）",
            "原局来源": found_in,
            "吉凶": "凶",
            "效应": "行动受困·做事阻碍多",
        })

    # 7. 亡神（年支查地支）
    wangshen_target = WANGSHEN.get(year_zhi, "")
    found_in = [pos for pos, zhi in all_zhi.items() if zhi == wangshen_target]
    found_in_dayun = [pos for pos, zhi in dayun_zhi.items() if zhi == wangshen_target]
    results.append({
        "名称": "亡神",
        "查法": f"年支{year_zhi}见{wangshen_target}",
        "原局来源": found_in if found_in else ["原局无"],
        "大运来源": found_in_dayun[:3] if found_in_dayun else [],
        "吉凶": "凶",
        "效应": "判断力下降·聪明反被聪明误",
    })

    return results


# ============================================================
# 六亲十神映射（确定性·引擎层直接计算，严禁交给LLM）
# ============================================================

# 子平口诀：六亲与十神的固定映射
LIUQIN_SHISHEN_MAP = {
    "男": {
        "父亲": ["偏财"],
        "母亲": ["正印"],
        "兄弟姐妹": ["比肩", "劫财"],
        "配偶": ["正财"],
        "子女": ["七杀", "正官"],  # 七杀=儿子，正官=女儿
        "上司贵人": ["正官", "正印"],
    },
    "女": {
        "父亲": ["偏财"],
        "母亲": ["正印"],
        "兄弟姐妹": ["比肩", "劫财"],
        "配偶": ["正官"],
        "子女": ["食神", "伤官"],  # 食神=女儿，伤官=儿子
        "上司贵人": ["正官", "正印"],
    },
}

# 六亲对应宫位（哪个柱代表哪个六亲）
LIUQIN_PALACE = {
    "父亲": "年柱",
    "母亲": "月柱",
    "兄弟姐妹": "月柱",
    "配偶": "日柱",
    "子女": "时柱",
    "上司贵人": "月柱",
}


def analyze_liuqin(paipan_data: dict, gender: str) -> dict:
    """六亲十神映射分析（纯确定性计算，不依赖LLM）

    输出每个六亲的：
    1. 对应十神
    2. 该十神在原局的位置（柱位、天干/藏干、气类）
    3. 力量等级（透干/藏干本气/藏干中余气/缺失）
    4. 所在宫位是否匹配
    """
    day_master = paipan_data["日主"]["天干"]
    sizhu = paipan_data["四柱"]
    mapping = LIUQIN_SHISHEN_MAP.get(gender, LIUQIN_SHISHEN_MAP["男"])

    results = {}
    for role, target_shishens in mapping.items():
        palace = LIUQIN_PALACE[role]

        # 遍历四柱，找到所有匹配的十神位置
        found_positions = []
        for pos in ["年柱", "月柱", "日柱", "时柱"]:
            pillar = sizhu[pos]
            # 检查天干（日柱天干是日主，跳过）
            if pos != "日柱" and pillar["天干十神"] in target_shishens:
                found_positions.append({
                    "柱位": pos, "位置": "天干", "天干": pillar["天干"],
                    "十神": pillar["天干十神"], "气类": "透干",
                    "五行": pillar["天干五行"],
                })
            # 检查藏干
            for cg in pillar["藏干"]:
                if cg["十神"] in target_shishens and cg["十神"] != "日主":
                    found_positions.append({
                        "柱位": pos, "位置": "藏干", "天干": cg["天干"],
                        "十神": cg["十神"], "气类": cg["气类"],
                        "五行": cg["五行"],
                    })

        # 判断力量等级
        has_tougan = any(p["位置"] == "天干" for p in found_positions)
        has_benqi = any(p["位置"] == "藏干" and p["气类"] == "本气" for p in found_positions)
        has_zhongqi = any(p["气类"] == "中气" for p in found_positions)

        if has_tougan and has_benqi:
            strength = "透干通根·力量强"
        elif has_tougan:
            strength = "透干无根·力量虚"
        elif has_benqi:
            strength = "藏干本气·力量实但暗"
        elif has_zhongqi:
            strength = "藏干中气·力量弱"
        elif found_positions:
            strength = "藏干余气·力量微弱"
        else:
            strength = "原局缺失"

        # 宫位匹配
        in_palace = any(p["柱位"] == palace for p in found_positions)

        # 简明描述
        if found_positions:
            position_desc = "、".join(
                f"{p['柱位']}{p['天干']}({p['十神']}·{p['气类']})"
                for p in found_positions
            )
        else:
            position_desc = "原局未见"

        results[role] = {
            "角色": role,
            "对应十神": target_shishens,
            "原局位置": found_positions,
            "位置描述": position_desc,
            "力量": strength,
            "宫位": palace,
            "宫位匹配": in_palace,
            "宫位描述": f"{palace}({'匹配' if in_palace else '不在本宫'})",
        }

    return results


def generate_liuqin_text(paipan_data: dict, gender: str) -> str:
    """六亲十神映射的确定性人话翻译（给LLM的context，不是让LLM自己判断）"""
    liuqin = analyze_liuqin(paipan_data, gender)
    day_master = paipan_data["日主"]["天干"]
    dm_wuxing = paipan_data["日主"]["五行"]

    lines = []
    lines.append(f"**{day_master}{dm_wuxing}日主（{gender}命）六亲十神映射：**\n")
    lines.append("以下为引擎确定性计算结果，LLM请直接使用，**严禁修改十神对应关系**：\n")

    for role, data in liuqin.items():
        shishens = "/".join(data["对应十神"])
        lines.append(f"- **{role}** = {shishens}")
        lines.append(f"  - 原局位置：{data['位置描述']}")
        lines.append(f"  - 力量：{data['力量']}")
        lines.append(f"  - 宫位：{data['宫位描述']}")
        lines.append("")

    return "\n".join(lines)


# ============================================================
# 流年/流月/当下定位/人生四段（确定性·引擎层直接计算）
# ============================================================

def _check_dizhi_relation(zhi_a: str, zhi_b: str) -> list:
    """检查两个地支之间的所有关系（六合/六冲/相害/自刑）"""
    relations = []
    if LIUHE.get(zhi_a) == zhi_b:
        relations.append("六合")
    if LIUCHONG.get(zhi_a) == zhi_b:
        relations.append("六冲")
    if XIANGHARM.get(zhi_a) == zhi_b:
        relations.append("相害")
    if zhi_a == zhi_b:
        if ZIXING_EXTENDED or zhi_a in ZIXING_STRICT:
            relations.append("自刑")
        else:
            relations.append("伏吟")
    return relations


def _check_tiangan_relation(gan_a: str, gan_b: str) -> list:
    """检查两个天干之间的关系（五合/相克）"""
    relations = []
    he_info = TIANGAN_WUHE.get(gan_a)
    if he_info and he_info[0] == gan_b:
        relations.append(f"天干合({he_info[1]})")
    # 天干相克
    from engine.paipan import WUXING_OF_TIANGAN
    wx_a = WUXING_OF_TIANGAN[gan_a]
    wx_b = WUXING_OF_TIANGAN[gan_b]
    if WUXING_KE.get(wx_a) == wx_b:
        relations.append(f"{gan_a}克{gan_b}")
    elif WUXING_KE.get(wx_b) == wx_a:
        relations.append(f"{gan_b}克{gan_a}")
    return relations


def analyze_liunian(paipan_data: dict, year_count: int = 6) -> list:
    """流年逐年客观数据（纯确定性计算）

    对每个流年输出：
    1. 天干十神、地支藏干十神
    2. 与原局四柱的天干合克、地支合冲刑害
    3. 所在大运信息
    4. 十二长生状态
    """
    from engine.paipan import get_shishen, WUXING_OF_TIANGAN, WUXING_OF_DIZHI, CANGGAN
    from datetime import datetime

    day_master = paipan_data["日主"]["天干"]
    sizhu = paipan_data["四柱"]
    current_year = datetime.now().year

    # 原局四柱天干地支
    yuanju_tiangan = {
        pos: sizhu[pos]["天干"] for pos in ["年柱", "月柱", "时柱"]
    }
    yuanju_dizhi = {
        pos: sizhu[pos]["地支"] for pos in ["年柱", "月柱", "日柱", "时柱"]
    }

    # 大运列表
    dayun_list = paipan_data.get("大运", {}).get("大运列表", [])

    # 流年列表（paipan已算好）
    liunian_raw = paipan_data.get("流年", [])
    if isinstance(liunian_raw, list):
        liunian_list = liunian_raw
    else:
        liunian_list = liunian_raw.get("流年列表", [])

    # 筛选当前年份前后的流年
    target_years = range(current_year, current_year + year_count)
    results = []

    for ln in liunian_list:
        year = ln.get("公历年", 0)
        if year not in target_years:
            continue

        tg = ln["天干"]
        dz = ln["地支"]
        tg_shishen = get_shishen(day_master, tg)

        # 地支藏干十神
        canggan_shishen = []
        for cg_info in CANGGAN.get(dz, []):
            cg_gan, qi_type, _ = cg_info
            cg_ss = get_shishen(day_master, cg_gan)
            canggan_shishen.append({
                "天干": cg_gan, "十神": cg_ss, "气类": qi_type,
                "五行": WUXING_OF_TIANGAN[cg_gan],
            })

        # 十二长生
        changsheng = _get_changsheng_state(day_master, dz)

        # 与原局天干的关系
        tiangan_relations = []
        for pos, yuanju_tg in yuanju_tiangan.items():
            rels = _check_tiangan_relation(tg, yuanju_tg)
            for r in rels:
                tiangan_relations.append(f"流年{tg}与{pos}{yuanju_tg}：{r}")

        # 与原局地支的关系
        dizhi_relations = []
        for pos, yuanju_dz in yuanju_dizhi.items():
            rels = _check_dizhi_relation(dz, yuanju_dz)
            for r in rels:
                dizhi_relations.append(f"流年{dz}与{pos}{yuanju_dz}：{r}")

        # 所在大运
        xu_sui = ln.get("虚岁", 0)
        current_dayun = None
        for dy in dayun_list:
            if dy["起始虚岁"] <= xu_sui <= dy["结束虚岁"]:
                current_dayun = dy
                break

        results.append({
            "公历年": year,
            "干支": ln["干支"],
            "天干": tg,
            "地支": dz,
            "天干十神": tg_shishen,
            "地支五行": WUXING_OF_DIZHI[dz],
            "藏干十神": canggan_shishen,
            "十二长生": changsheng,
            "虚岁": xu_sui,
            "天干关系": tiangan_relations,
            "地支关系": dizhi_relations,
            "所在大运": {
                "干支": current_dayun["干支"],
                "天干十神": current_dayun["天干十神"],
            } if current_dayun else None,
        })

    return results


def generate_liunian_text(paipan_data: dict, year_count: int = 6) -> str:
    """流年逐年客观数据的确定性文本"""
    liunian = analyze_liunian(paipan_data, year_count)
    day_master = paipan_data["日主"]["天干"]

    lines = [f"**{day_master}日主 近{year_count}年流年客观数据：**\n"]
    lines.append("以下为引擎确定性计算结果，LLM请直接使用，**严禁修改十神/合冲关系**：\n")

    for ln in liunian:
        cg_desc = "、".join(f"{c['天干']}({c['十神']}·{c['气类']})" for c in ln["藏干十神"])
        lines.append(f"### {ln['公历年']}年 {ln['干支']}（虚岁{ln['虚岁']}）")
        lines.append(f"- 天干：{ln['天干']}（{ln['天干十神']}）")
        lines.append(f"- 地支：{ln['地支']}（{ln['地支五行']}）藏干：{cg_desc}")
        lines.append(f"- 十二长生：{ln['十二长生']}")
        if ln["所在大运"]:
            lines.append(f"- 所在大运：{ln['所在大运']['干支']}（{ln['所在大运']['天干十神']}）")
        if ln["天干关系"]:
            lines.append(f"- 天干动态：{'；'.join(ln['天干关系'])}")
        if ln["地支关系"]:
            lines.append(f"- 地支动态：{'；'.join(ln['地支关系'])}")
        lines.append("")

    return "\n".join(lines)


def analyze_liuyue(paipan_data: dict, target_year: int = None) -> list:
    """流月逐月客观数据（纯确定性计算）

    对指定年份的12个月输出：
    1. 月干支、天干十神、地支藏干十神
    2. 与原局的合冲关系
    """
    from engine.paipan import get_shishen, WUXING_OF_TIANGAN, WUXING_OF_DIZHI, CANGGAN
    from datetime import datetime
    from lunar_python import Solar, Lunar

    if target_year is None:
        target_year = datetime.now().year

    day_master = paipan_data["日主"]["天干"]
    sizhu = paipan_data["四柱"]
    yuanju_tiangan = {pos: sizhu[pos]["天干"] for pos in ["年柱", "月柱", "时柱"]}
    yuanju_dizhi = {pos: sizhu[pos]["地支"] for pos in ["年柱", "月柱", "日柱", "时柱"]}

    results = []
    for month in range(1, 13):
        try:
            # 用lunar-python计算每月中间日期的月干支
            solar = Solar.fromYmd(target_year, month, 15)
            lunar = solar.getLunar()
            month_gan = lunar.getMonthGan()
            month_zhi = lunar.getMonthZhi()
        except Exception:
            continue

        tg_shishen = get_shishen(day_master, month_gan)

        canggan_shishen = []
        for cg_info in CANGGAN.get(month_zhi, []):
            cg_gan, qi_type, _ = cg_info
            cg_ss = get_shishen(day_master, cg_gan)
            canggan_shishen.append({
                "天干": cg_gan, "十神": cg_ss, "气类": qi_type,
                "五行": WUXING_OF_TIANGAN[cg_gan],
            })

        # 与原局地支关系
        dizhi_relations = []
        for pos, yuanju_dz in yuanju_dizhi.items():
            rels = _check_dizhi_relation(month_zhi, yuanju_dz)
            for r in rels:
                dizhi_relations.append(f"月支{month_zhi}与{pos}{yuanju_dz}：{r}")

        tiangan_relations = []
        for pos, yuanju_tg in yuanju_tiangan.items():
            rels = _check_tiangan_relation(month_gan, yuanju_tg)
            for r in rels:
                tiangan_relations.append(f"月干{month_gan}与{pos}{yuanju_tg}：{r}")

        results.append({
            "公历月": month,
            "月干": month_gan,
            "月支": month_zhi,
            "干支": f"{month_gan}{month_zhi}",
            "天干十神": tg_shishen,
            "地支五行": WUXING_OF_DIZHI.get(month_zhi, ""),
            "藏干十神": canggan_shishen,
            "天干关系": tiangan_relations,
            "地支关系": dizhi_relations,
        })

    return results


def generate_liuyue_text(paipan_data: dict, target_year: int = None) -> str:
    """流月逐月客观数据的确定性文本"""
    from datetime import datetime
    if target_year is None:
        target_year = datetime.now().year

    liuyue = analyze_liuyue(paipan_data, target_year)
    day_master = paipan_data["日主"]["天干"]

    lines = [f"**{day_master}日主 {target_year}年逐月客观数据：**\n"]

    for lm in liuyue:
        cg_desc = "、".join(f"{c['天干']}({c['十神']})" for c in lm["藏干十神"])
        lines.append(f"- **{lm['公历月']}月** {lm['干支']}（{lm['天干十神']}）藏干：{cg_desc}")
        if lm["天干关系"]:
            lines.append(f"  天干：{'；'.join(lm['天干关系'])}")
        if lm["地支关系"]:
            lines.append(f"  地支：{'；'.join(lm['地支关系'])}")

    return "\n".join(lines)


def analyze_dangxia(paipan_data: dict, gender: str) -> dict:
    """当下定位结构化数据（纯确定性计算）

    输出：当前大运、剩余年数、交脱期判断、当前流年、虚岁
    """
    from engine.paipan import get_shishen, WUXING_OF_TIANGAN, CANGGAN
    from datetime import datetime
    import re

    current_year = datetime.now().year
    day_master = paipan_data["日主"]["天干"]

    # 虚岁
    birth_str = paipan_data.get("命主信息", {}).get("出生公历", "")
    year_match = re.search(r"(\d{4})年", birth_str)
    birth_year = int(year_match.group(1)) if year_match else current_year
    xu_sui = current_year - birth_year + 1

    # 当前大运
    dayun_list = paipan_data.get("大运", {}).get("大运列表", [])
    current_dayun = None
    next_dayun = None
    for i, dy in enumerate(dayun_list):
        if dy["起始虚岁"] <= xu_sui <= dy["结束虚岁"]:
            current_dayun = dy
            remaining = dy["结束虚岁"] - xu_sui
            if i + 1 < len(dayun_list):
                next_dayun = dayun_list[i + 1]
            break

    # 交脱期判断
    jiaotuo_status = "正常"
    if current_dayun:
        remaining = current_dayun["结束虚岁"] - xu_sui
        if remaining <= 2:
            jiaotuo_status = f"交脱前夜（距换运仅{remaining}年）"
        entered = xu_sui - current_dayun["起始虚岁"]
        if entered <= 2:
            jiaotuo_status = f"换挡期（进入新运仅{entered}年）"

    # 当前流年
    liunian_list = paipan_data.get("流年", [])
    if isinstance(liunian_list, dict):
        liunian_list = liunian_list.get("流年列表", [])
    current_liunian = None
    for ln in liunian_list:
        if ln.get("公历年") == current_year:
            current_liunian = ln
            break

    # 当前流年十神
    liunian_shishen = None
    if current_liunian:
        liunian_shishen = get_shishen(day_master, current_liunian["天干"])

    return {
        "虚岁": xu_sui,
        "出生年": birth_year,
        "当前年": current_year,
        "当前大运": {
            "干支": current_dayun["干支"],
            "天干十神": current_dayun["天干十神"],
            "起始虚岁": current_dayun["起始虚岁"],
            "结束虚岁": current_dayun["结束虚岁"],
            "剩余年数": current_dayun["结束虚岁"] - xu_sui,
        } if current_dayun else None,
        "下步大运": {
            "干支": next_dayun["干支"],
            "天干十神": next_dayun["天干十神"],
            "起始虚岁": next_dayun["起始虚岁"],
        } if next_dayun else None,
        "交脱期": jiaotuo_status,
        "当前流年": {
            "干支": current_liunian["干支"],
            "天干十神": liunian_shishen,
        } if current_liunian else None,
    }


def generate_dangxia_text(paipan_data: dict, gender: str) -> str:
    """当下定位的确定性文本"""
    dangxia = analyze_dangxia(paipan_data, gender)

    lines = ["**当下定位客观数据：**\n"]
    lines.append(f"- 虚岁：{dangxia['虚岁']}岁（{dangxia['出生年']}年生）")

    if dangxia["当前大运"]:
        dy = dangxia["当前大运"]
        lines.append(f"- 当前大运：{dy['干支']}（{dy['天干十神']}），虚岁{dy['起始虚岁']}-{dy['结束虚岁']}，剩余{dy['剩余年数']}年")

    if dangxia["下步大运"]:
        nd = dangxia["下步大运"]
        lines.append(f"- 下步大运：{nd['干支']}（{nd['天干十神']}），{nd['起始虚岁']}虚岁起")

    lines.append(f"- 交脱期状态：{dangxia['交脱期']}")

    if dangxia["当前流年"]:
        ln = dangxia["当前流年"]
        lines.append(f"- 当前流年：{ln['干支']}（{ln['天干十神']}）")

    return "\n".join(lines)


def analyze_rensheng_siduan(paipan_data: dict) -> list:
    """人生四段骨架数据（纯确定性计算）

    年柱=少年(0-16) 月柱=青年(17-32) 日柱=中年(33-48) 时柱=晚年(49+)
    每段对应柱的天干十神、地支五行、藏干十神
    """
    from engine.paipan import get_shishen, WUXING_OF_TIANGAN, CANGGAN

    day_master = paipan_data["日主"]["天干"]
    sizhu = paipan_data["四柱"]

    segments = [
        ("少年期", "年柱", "0-16岁", "家庭出身·父母影响·早年环境"),
        ("青年期", "月柱", "17-32岁", "事业起步·社交圈·兄弟助力"),
        ("中年期", "日柱", "33-48岁", "自身能力·婚姻关系·核心奋斗期"),
        ("晚年期", "时柱", "49岁后", "子女·晚年归宿·人生收官"),
    ]

    results = []
    for label, pos, age_range, theme in segments:
        pillar = sizhu[pos]
        tg = pillar["天干"]
        dz = pillar["地支"]
        tg_shishen = pillar["天干十神"] if pos != "日柱" else "日主"

        canggan = []
        for cg in pillar["藏干"]:
            canggan.append(f"{cg['天干']}({cg['十神']}·{cg['气类']})")

        changsheng = _get_changsheng_state(day_master, dz)

        results.append({
            "阶段": label,
            "柱位": pos,
            "年龄": age_range,
            "主题": theme,
            "天干": tg,
            "地支": dz,
            "天干十神": tg_shishen,
            "藏干": "、".join(canggan),
            "十二长生": changsheng,
        })

    return results


def generate_rensheng_siduan_text(paipan_data: dict) -> str:
    """人生四段的确定性文本"""
    segments = analyze_rensheng_siduan(paipan_data)

    lines = ["**人生四段客观数据：**\n"]
    for seg in segments:
        lines.append(f"### {seg['阶段']}（{seg['年龄']}）— {seg['柱位']}{seg['天干']}{seg['地支']}")
        lines.append(f"- 天干：{seg['天干']}（{seg['天干十神']}）")
        lines.append(f"- 藏干：{seg['藏干']}")
        lines.append(f"- 十二长生：{seg['十二长生']}")
        lines.append(f"- 主题：{seg['主题']}")
        lines.append("")

    return "\n".join(lines)


# ============================================================
# 确定性推演文本生成（下沉到引擎层，替代AI判读）
# ============================================================

WUXING_CN = {"木": "木", "火": "火", "土": "土", "金": "金", "水": "水"}
SHISHEN_RENHUA = {
    "比肩": "同类帮手·兄弟朋友",
    "劫财": "竞争者·争夺资源的同类",
    "食神": "才华输出·温和表达",
    "伤官": "锋芒毕露·叛逆创新",
    "偏财": "意外之财·父亲·情人",
    "正财": "稳定收入·妻子（男命）",
    "七杀": "压力·危机·权力·丈夫（女命）",
    "正官": "规则·上司·丈夫（女命正缘）",
    "偏印": "偏门学问·孤独思考",
    "正印": "母亲·贵人·学历·庇护",
}

HECHONG_EFFECT = {
    "六合": "合=拉近·绑定·亲密·合作",
    "六冲": "冲=冲突·变动·分离·重组",
    "半合": "半合=半成的局·有趋势但不满",
    "三合": "三合=成局·力量最大的合化",
    "自刑": "自刑=自我内耗·反复纠结·同一坑摔两次",
    "相害": "害=暗伤·信任危机·表面和气内在矛盾",
    "天干合": "天干合=表面关系的绑定·明面上的合作",
    "三刑": "三刑=三方矛盾·复杂冲突",
}

PILLAR_MEANING = {
    "年柱": "祖上·父母·0-16岁·社会形象",
    "月柱": "父母·兄弟·17-32岁·事业宫",
    "日柱": "自己·配偶·33-48岁·婚姻宫",
    "时柱": "子女·下属·49岁后·晚年归宿",
}


def generate_wangshuai_text(paipan_data: dict, wangshuai: dict) -> str:
    """旺衰推演的确定性人话翻译（适配v3周勇志打分法输出结构）"""
    day_master = paipan_data["日主"]["天干"]
    dm_wuxing = paipan_data["日主"]["五行"]
    dm_yinyang = paipan_data["日主"]["阴阳"]
    month_zhi = paipan_data["月令"]["月支"]
    month_wx = MONTH_STRENGTH.get(month_zhi, "土")
    conclusion = wangshuai["结论"]
    level = wangshuai["程度"]
    total = wangshuai["总分"]
    ratio = wangshuai["旺衰比"]
    help_total = wangshuai["助力总分"]
    harm_total = wangshuai["泄耗总分"]
    layers = wangshuai["分层"]
    month_status = wangshuai.get("月令状态", "休")

    lines = []
    lines.append(f"**{day_master}{dm_wuxing}日主（{dm_yinyang}{dm_wuxing}）旺衰推演（周勇志打分法）：**\n")

    # 月令状态
    if month_status in ("旺", "相"):
        month_desc = f"得令（{month_status}）——月令{month_zhi}属{month_wx}，{'同属' if month_status == '旺' else '生助'}{dm_wuxing}，主场作战"
    elif month_status == "休":
        month_desc = f"失令（{month_status}）——月令{month_zhi}属{month_wx}，{dm_wuxing}生{month_wx}，泄气"
    elif month_status == "囚":
        month_desc = f"失令（{month_status}）——月令{month_zhi}属{month_wx}，{month_wx}克{dm_wuxing}，被压制"
    else:
        month_desc = f"失令（{month_status}）——月令{month_zhi}属{month_wx}，{dm_wuxing}克{month_wx}，耗力"
    lines.append(f"- **月令**：{month_desc}\n")

    # Step1: 日主基分
    step1 = layers.get("Step1·日主基分", 0)
    lines.append(f"- **Step1·日主基分**：{step1:.1f}分")

    # Step2: 天干帮扶
    step2_help = layers.get("Step2·天干帮扶", 0)
    step2_yin = layers.get("Step2·印星加力", 0)
    help_details = [d for d in wangshuai.get("逐项明细", []) if "Step2" in d.get("步骤", "")]
    if help_details:
        help_items = "；".join(f"{d['来源']}={d['得分']}" for d in help_details)
        lines.append(f"- **Step2·天干帮扶**：{step2_help + step2_yin:.1f}分（{help_items}）")
    else:
        lines.append(f"- **Step2·天干帮扶**：{step2_help + step2_yin:.1f}分")

    # Step3: 日主通根
    step3 = layers.get("Step3·日主通根", 0)
    root_details = [d for d in wangshuai.get("逐项明细", []) if "Step3" in d.get("步骤", "")]
    if root_details:
        root_items = "；".join(f"{d['来源']}={d['得分']}" for d in root_details)
        lines.append(f"- **Step3·日主通根**：{step3:.1f}分（{root_items}）")
    else:
        lines.append(f"- **Step3·日主通根**：{step3:.1f}分")

    # 日主方合计
    lines.append(f"\n- **日主方合计**：{total:.1f}分（中和线=109）")

    # Step5: 克泄耗方
    step5 = layers.get("Step5·克泄耗方", 0)
    lines.append(f"- **克泄耗方**：{step5:.1f}分")

    # 综合结论
    lines.append(f"\n**综合结论**：日主方{total:.1f} vs 克泄耗方{harm_total:.1f}，ratio={ratio:.3f}→**{conclusion}·{level}**")
    if conclusion == "身弱":
        lines.append(f"  - 自身能量不足，需要外部助力（印星生扶、比劫帮身）\n")
    elif conclusion == "身旺":
        lines.append(f"  - 自身能量充沛，需要释放出口（食伤泄秀、财星耗身）\n")
    else:
        lines.append(f"  - 旺衰相对均衡，灵活应对\n")

    # 趋利避害
    sheng_wo = WUXING_SHENG_WO[dm_wuxing]
    wo_sheng = WUXING_SHENG[dm_wuxing]
    lines.append("**趋利避害**：")
    if conclusion == "身弱":
        lines.append(f"- ✅ 多接触{sheng_wo}属性（印星生扶），找贵人、学新技能")
        lines.append(f"- ✅ 多接触{dm_wuxing}属性（比劫帮身），与同辈合作")
        lines.append(f"- ⚠️ 减少{WUXING_KE_WO[dm_wuxing]}属性消耗（官杀克身）")
    elif conclusion == "身旺":
        lines.append(f"- ✅ 多输出（{wo_sheng}属性=食伤泄秀），写作/创作/分享")
        lines.append(f"- ✅ 拓展事业（{WUXING_KE[dm_wuxing]}属性=财星耗身），积极求财")
        lines.append(f"- ⚠️ 避免过度帮扶同类（比劫过旺=争斗）")
    else:
        lines.append(f"- ✅ 保持灵活，调候为先——冬生补火暖局，夏生补水润局")

    return "\n".join(lines)


def generate_shishen_text(paipan_data: dict, shishen_data: dict, geju: dict) -> str:
    """十神组合判读的确定性推演"""
    day_master = paipan_data["日主"]["天干"]
    dm_wuxing = paipan_data["日主"]["五行"]
    distribution = shishen_data["分布"]
    missing = shishen_data["缺失十神"]
    geju_name = geju["格局"]
    geju_shishen = geju.get("定格十神", "")

    lines = []
    lines.append("**十神组合核心判读：**\n")

    # 1. 格局定格十神
    if geju_shishen and geju_shishen in distribution:
        info = distribution[geju_shishen]
        renhua = SHISHEN_RENHUA.get(geju_shishen, "")
        lines.append(f"**① 定格十神·{geju_shishen}（{renhua}）**")
        tg = "、".join(info["透干"]) if info["透干"] else "无透干"
        cg = "、".join(info["藏干"]) if info["藏干"] else "无藏干"
        lines.append(f"- 透干：{tg} / 藏干：{cg} / 力量：{info['力量']}")
        lines.append(f"- 👉 {geju_shishen}是{geju_name}的核心十神，决定命局的主旋律\n")

    # 2. 检查关键组合
    has_sha = "七杀" in distribution
    has_yin = "偏印" in distribution or "正印" in distribution
    has_shishang = "食神" in distribution or "伤官" in distribution
    has_cai = "偏财" in distribution or "正财" in distribution
    has_guan = "正官" in distribution

    combos = []
    if has_sha and has_yin:
        yin_name = "正印" if "正印" in distribution else "偏印"
        combos.append(f"**② 杀印相生**：七杀（压力·危机）+ {yin_name}（化解·智慧）= 压力转化为能力的通道。"
                      f"有杀有印=能扛压又能化解，适合高压环境（管理/创业/专业领域）")

    if has_sha and has_shishang:
        ss_name = "食神" if "食神" in distribution else "伤官"
        combos.append(f"**{'③' if combos else '②'} 食神制杀/伤官驾杀**：{ss_name}制约七杀 = 用才华驯服压力。"
                      f"但如果食伤力量不够，杀重无制=压力失控")

    if has_sha and not has_yin and not has_shishang:
        combos.append(f"**{'③' if combos else '②'} 杀重无制**：七杀透出但无印化无食制 = 压力大且无出口。"
                      f"👉 人话：外部压力持续施压，自身缺乏消化机制，容易焦虑内耗")

    if has_cai and has_guan:
        combos.append(f"**{'④' if len(combos)>=2 else '③' if combos else '②'} 财生官**：财星生正官 = 用实力换地位。"
                      f"适合体制内/稳定发展路线")

    if not combos:
        combos.append("**② 无明显组合**：十神分布较散，无强势组合，命局主题不集中")

    for combo in combos:
        lines.append(combo)
        lines.append("")

    # 3. 缺失十神分析
    if missing:
        lines.append(f"**缺失十神分析**：{'、'.join(missing)}")
        for miss in missing:
            renhua = SHISHEN_RENHUA.get(miss, "")
            if miss in ("食神", "伤官"):
                lines.append(f"- {miss}缺失（{renhua}）→ 才华表达受限·不善主动输出·闷在心里")
            elif miss in ("偏财", "正财"):
                lines.append(f"- {miss}缺失（{renhua}）→ 财缘需后天努力·不是天生财运型")
            elif miss in ("七杀", "正官"):
                lines.append(f"- {miss}缺失（{renhua}）→ 外部压力感低·自律需自我驱动")
            elif miss in ("偏印", "正印"):
                lines.append(f"- {miss}缺失（{renhua}）→ 贵人缘薄·需自学成才·独立性强")
            elif miss in ("比肩", "劫财"):
                lines.append(f"- {miss}缺失（{renhua}）→ 同辈助力少·独行侠倾向")

    # 趋利避害
    lines.append("\n**十神组合趋利避害**：\n")
    if has_sha and has_yin:
        lines.append("- ✅ 杀印相生是你最大的红利——主动寻找高压+有导师的环境（如大公司/专业机构/考证深造）")
        lines.append("- ✅ 遇到压力不要逃避，找到'翻译官'（贵人/学习）帮你化解")
    if has_sha and not has_yin:
        lines.append("- ⚠️ 有杀无印=压力无化解通道，必须后天补印（学习/拜师/找导师）")
    if "食神" in missing and "伤官" in missing:
        lines.append("- ✅ 食伤全缺=表达是你最需要刻意练习的能力。写作/演讲/分享/教学，任何'把内在变成外在'的事都在补这个缺口")
        lines.append("- ⚠️ 不要等'准备好了'再输出，从小范围开始（朋友圈/小群/一对一）")
    if "偏财" in missing and "正财" in missing:
        lines.append("- ✅ 财星缺失=走专业路线比直接求财更有效。越专业越有钱")
    if not combos:
        lines.append("- ✅ 十神分散=多面手潜质，不要局限在单一赛道")

    return "\n".join(lines)


def generate_hechong_text(paipan_data: dict, relationships: dict) -> str:
    """合冲刑害逐条解读的确定性推演"""
    lines = []
    lines.append("**合冲刑害逐条解读：**\n")

    has_content = False
    for rel_type in ["自刑", "六冲", "相害", "六合", "半合", "三合", "天干合", "三刑"]:
        items = relationships.get(rel_type, [])
        if not items:
            continue
        has_content = True

        effect = HECHONG_EFFECT.get(rel_type, "")
        lines.append(f"**{rel_type}**（{effect}）：")

        for item in items:
            pillars = item.get("柱位", "")
            dizhi = item.get("地支", item.get("天干", ""))

            # 根据柱位组合判断影响领域
            pillar_parts = pillars.split("+") if pillars else []
            meanings = [PILLAR_MEANING.get(p.strip(), "") for p in pillar_parts if p.strip() in PILLAR_MEANING]
            domain = " × ".join(meanings) if meanings else ""

            lines.append(f"- **{dizhi}**（{pillars}）")
            if domain:
                lines.append(f"  - 影响领域：{domain}")

            # 特定组合的人话翻译
            if rel_type == "自刑":
                zhi = item.get("地支", "")[:1]
                if zhi == "戌":
                    lines.append("  - 👉 人话：戌为墓库，双戌自刑=同一领域反复内耗、钻牛角尖。墓库叠加=过度收藏·放不下")
                elif zhi == "午":
                    lines.append("  - 👉 人话：午为心火，双午自刑=心急火燎·冲动决策后后悔")
                elif zhi == "酉":
                    lines.append("  - 👉 人话：酉为金，双酉自刑=过度追求完美·自我要求太高")
                else:
                    lines.append(f"  - 👉 人话：同字自刑=同一模式反复出现，需要觉察打破循环")

            elif rel_type == "六冲":
                lines.append("  - 👉 人话：对冲=两股力量拉扯，主变动·分离·重新洗牌。不一定是坏事，有时是打破僵局")

            elif rel_type == "半合":
                wuxing = item.get("合化五行", "")
                lines.append(f"  - 👉 人话：半合{wuxing}局=有{wuxing}的趋势但未完全成形。遇到大运/流年补齐第三个地支时会完全激活")

            elif rel_type == "六合":
                lines.append("  - 👉 人话：六合=两柱亲密绑定，对应领域关系紧密、互相牵制")

            elif rel_type == "天干合":
                lines.append("  - 👉 人话：天干合=表面关系绑定，两柱代表的人/事容易产生合作或牵绊")

        lines.append("")

    if not has_content:
        lines.append("原局无明显合冲刑害关系。\n")

    # 趋利避害
    if has_content:
        lines.append("**合冲刑害趋利避害**：\n")
        for rel_type in ["自刑", "六冲", "相害"]:
            items = relationships.get(rel_type, [])
            for item in items:
                pillars = item.get("柱位", "")
                if rel_type == "自刑":
                    lines.append(f"- ⚠️ {item.get('地支', '')}：觉察自我内耗模式，遇到反复纠结时主动跳出——换环境/找人聊/做运动打断循环")
                elif rel_type == "六冲":
                    lines.append(f"- ✅ {item.get('地支', '')}：冲=变动信号。顺势而为不要硬抗，冲开后反而是重新洗牌的机会")
                elif rel_type == "相害":
                    lines.append(f"- ⚠️ {item.get('地支', '')}：暗伤信号——对应领域建立边界感，不要过度信任也不要过度猜疑")
        for rel_type in ["六合", "半合"]:
            items = relationships.get(rel_type, [])
            for item in items:
                if rel_type == "六合":
                    lines.append(f"- ✅ {item.get('地支', '')}：合=绑定红利。主动维护对应领域的关系，合的能量会持续给你加分")
                elif rel_type == "半合":
                    wuxing = item.get("合化五行", "")
                    lines.append(f"- ✅ {item.get('地支', '')}：半合{wuxing}局有成局趋势。遇到大运/流年补齐第三支时注意把握机会")
        lines.append("")

    return "\n".join(lines)


def generate_shenshas_text(shenshas: list) -> str:
    """神煞组合效应的确定性推演"""
    lines = []
    lines.append("**神煞组合判读：**\n")

    if not shenshas:
        lines.append("原局无明显神煞。")
        return "\n".join(lines)

    # 逐个解读
    active_shenshas = [s for s in shenshas if "原局无" not in s.get("原局来源", ["原局无"])]
    inactive_shenshas = [s for s in shenshas if "原局无" in s.get("原局来源", ["原局无"])]

    if active_shenshas:
        lines.append(f"**原局命中 {len(active_shenshas)} 个神煞**：\n")
        for shensha in active_shenshas:
            name = shensha["名称"]
            sources = "、".join(shensha["原局来源"])
            effect = shensha["效应"]
            jixiong = shensha["吉凶"]
            icon = "🟢" if "吉" in jixiong else "🔴" if "凶" in jixiong else "🟡"
            lines.append(f"- {icon} **{name}**（{sources}）：{effect}")

            # 人话翻译
            if name == "华盖":
                lines.append("  - 👉 人话：天生喜欢独处思考，有艺术/宗教/哲学天赋。不是不合群，而是精神世界丰富到不需要凑热闹")
            elif name == "天乙贵人":
                lines.append("  - 👉 人话：关键时刻总有人拉你一把，贵人运好。社交中容易获得他人信任和帮助")
            elif name == "驿马":
                lines.append("  - 👉 人话：闲不住的命，适合需要出差/变动/跨区域的工作。安稳坐办公室反而憋得慌")
            elif name == "金舆":
                lines.append("  - 👉 人话：出行安全·座驾运好·有被照顾的福气。古代叫'坐金车'，物质享受运不错")
            elif name == "天罗":
                count = shensha["查法"].split("（")[1].split("个")[0] if "个" in shensha["查法"] else "1"
                if count == "1":
                    lines.append("  - 👉 人话：思想容易画地为牢，自我设限。明明有能力但总觉得'我不行'")
                else:
                    lines.append("  - 👉 人话：双重天罗=自我设限加倍。容易陷入'想做又不敢做'的循环，需要外力推一把才能突破")
            elif name == "地网":
                lines.append("  - 👉 人话：行动层面容易受阻，做事阻碍多。不是能力不够，而是外部环境总有绊脚石")
            elif name == "亡神":
                lines.append("  - 👉 人话：聪明但容易'想太多'，判断力在关键时刻可能失灵。需要培养'先做再想'的行动力")
            lines.append("")

    # 组合效应
    active_names = {s["名称"] for s in active_shenshas}
    combo_lines = []

    if "华盖" in active_names and "天罗" in active_names:
        combo_lines.append("- **华盖 + 天罗**：独处倾向 × 自我设限 = 容易沉浸在自己的精神世界里出不来。"
                           "优势是深度思考能力极强，劣势是行动力不足、社交圈窄")
    if "华盖" in active_names and "天乙贵人" in active_names:
        combo_lines.append("- **华盖 + 天乙贵人**：虽然喜欢独处，但关键时刻贵人会主动找上门。适合专家型路线")
    if "驿马" in active_names and "天罗" in active_names:
        combo_lines.append("- **驿马 + 天罗**：想动又怕动，内心矛盾。建议用'小步快跑'策略，不要一步到位的大变动")
    if "天罗" in active_names and "亡神" in active_names:
        combo_lines.append("- **天罗 + 亡神**：自我设限 × 判断力波动 = 容易在关键决策时犹豫不决。建议重大决定找信任的人商量")
    if "华盖" in active_names and "亡神" in active_names:
        combo_lines.append("- **华盖 + 亡神**：深度思考 × 判断力波动 = 想得深但偶尔想偏。需要定期和外界校准认知")

    if combo_lines:
        lines.append("**神煞叠加效应**：\n")
        lines.extend(combo_lines)
        lines.append("")

    # 未命中的神煞简述
    if inactive_shenshas:
        names = "、".join(s["名称"] for s in inactive_shenshas)
        lines.append(f"**原局未命中**：{names}（大运流年遇到时可能激活）")

    # 趋利避害
    if active_shenshas:
        lines.append("\n**神煞趋利避害**：\n")
        for shensha in active_shenshas:
            name = shensha["名称"]
            if name == "华盖":
                lines.append("- ✅ 华盖天赋：安排固定独处时间（阅读/冥想/创作），这是你的充电方式")
                lines.append("- ⚠️ 注意不要过度封闭——每周至少1次主动社交，保持与外界校准")
            elif name == "天乙贵人":
                lines.append("- ✅ 贵人运好：主动维护贵人关系，关键时刻敢于开口求助")
            elif name == "天罗":
                lines.append("- ⚠️ 天罗自我设限：每周做一件'让自己不舒服但不危险的事'，逐步松动限制")
                lines.append("- ✅ 找到一个信任的人（导师/教练/好友），定期'被推一把'")
            elif name == "驿马":
                lines.append("- ✅ 驿马主动：适合需要出差/变动的工作，不要拒绝变化")
            elif name == "亡神":
                lines.append("- ⚠️ 重大决定找人商量，不要独自拍板。培养'先做再想'的行动力")
            elif name == "金舆":
                lines.append("- ✅ 金舆=物质享受运好，适度犒赏自己是正确的能量管理")

    return "\n".join(lines)


YONGSHEN_DAILY = {
    "木": {
        "方位": "东方",
        "颜色": "绿色、青色",
        "行业": "教育/文化/出版/园艺/中医/环保",
        "食物": "绿色蔬菜、酸味食物",
        "习惯": "早起散步、亲近植物、读书学习",
        "贵人": "属虎、属兔的人",
    },
    "火": {
        "方位": "南方",
        "颜色": "红色、紫色、橙色",
        "行业": "互联网/电子/能源/餐饮/传媒",
        "食物": "红色食物、苦味食物",
        "习惯": "运动出汗、社交活动、晒太阳",
        "贵人": "属蛇、属马的人",
    },
    "土": {
        "方位": "中央、本地",
        "颜色": "黄色、棕色、米色",
        "行业": "房地产/建筑/农业/陶瓷/矿业",
        "食物": "根茎类、甜味食物",
        "习惯": "接地气活动、园艺、稳定作息",
        "贵人": "属龙、属狗、属牛、属羊的人",
    },
    "金": {
        "方位": "西方",
        "颜色": "白色、金色、银色",
        "行业": "金融/法律/军警/机械/珠宝/IT硬件",
        "食物": "白色食物、辛辣食物",
        "习惯": "规律生活、收纳整理、果断决策",
        "贵人": "属猴、属鸡的人",
    },
    "水": {
        "方位": "北方",
        "颜色": "黑色、蓝色、深灰",
        "行业": "贸易/物流/旅游/水利/咨询/自由职业",
        "食物": "黑色食物、咸味食物",
        "习惯": "多喝水、游泳、灵活变通",
        "贵人": "属鼠、属猪的人",
    },
}


def generate_yongshen_text(paipan_data: dict, yongshen_data: dict, wangshuai: dict) -> str:
    """用神日常建议的确定性推演"""
    dm_wuxing = paipan_data["日主"]["五行"]
    conclusion = wangshuai["结论"]
    lines = []
    lines.append("**用神深度解读与日常化建议：**\n")

    # 旺衰逻辑解释
    if conclusion == "身弱":
        lines.append(f"日主{dm_wuxing}偏弱，核心策略是**补给**——给自己充电、找帮手、获取支持。\n")
    elif conclusion == "身旺":
        lines.append(f"日主{dm_wuxing}偏旺，核心策略是**释放**——输出才华、拓展事业、消耗多余能量。\n")
    else:
        lines.append(f"日主{dm_wuxing}中和，核心策略是**平衡**——根据季节和环境灵活调整。\n")

    # 用神逐个解读
    for ys in yongshen_data["用神"]:
        wx = ys["五行"]
        if wx == "需AI判读":
            continue
        shishen = ys["十神"]
        priority = ys["优先级"]
        reason = ys["理由"]
        daily = YONGSHEN_DAILY.get(wx, {})

        icon = "🥇" if priority == 1 else "🥈" if priority == 2 else "🥉"
        lines.append(f"### {icon} 第{priority}用神：{wx}（{shishen}）\n")
        lines.append(f"**命理依据**：{reason}\n")

        if daily:
            lines.append("| 维度 | 建议 |")
            lines.append("|---|---|")
            lines.append(f"| ✅ 方位 | 多往{daily['方位']}方向发展 |")
            lines.append(f"| ✅ 颜色 | 多穿戴{daily['颜色']} |")
            lines.append(f"| ✅ 行业 | {daily['行业']} |")
            lines.append(f"| ✅ 饮食 | 多吃{daily['食物']} |")
            lines.append(f"| ✅ 日常 | {daily['习惯']} |")
            lines.append(f"| ✅ 贵人 | 多接触{daily['贵人']} |")
            lines.append("")

    # 忌神提示
    lines.append("**忌神提醒**：\n")
    for js in yongshen_data["忌神"]:
        wx = js["五行"]
        if wx == "需AI判读":
            continue
        shishen = js["十神"]
        reason = js["理由"]
        daily = YONGSHEN_DAILY.get(wx, {})
        avoid_color = daily.get("颜色", "") if daily else ""
        lines.append(f"- ⚠️ **忌{wx}（{shishen}）**：{reason}")
        if avoid_color:
            lines.append(f"  - ⚠️ 少穿{avoid_color}系衣物，少往{daily.get('方位', '')}方向发展")
        lines.append("")

    return "\n".join(lines)


SHISHEN_DAYUN_THEME = {
    "比肩": "合作·竞争·同辈关系密集期",
    "劫财": "争夺·破财风险·需守财",
    "食神": "才华绽放·创作丰收·享受生活",
    "伤官": "锋芒毕露·变革·叛逆创新·口舌是非",
    "偏财": "意外收获·投资机会·父亲缘·桃花",
    "正财": "稳定收入增长·置业·婚姻（男命）",
    "七杀": "高压挑战·权力角逐·危机与转机并存",
    "正官": "升职·规则·体制·稳步上升",
    "偏印": "转型·偏门学问·孤独求索·灵感爆发",
    "正印": "贵人提携·学历提升·获得庇护·母亲缘",
}


def generate_dayun_text(paipan_data: dict, wangshuai: dict, yongshen_data: dict,
                        current_year: int = None) -> str:
    """大运分段主题词的确定性推演

    Args:
        current_year: 当前公历年份，用于检测大运交脱期。默认None时自动获取。
    """
    import datetime
    if current_year is None:
        current_year = datetime.datetime.now().year

    dayun_list = paipan_data["大运"]["大运列表"]
    conclusion = wangshuai["结论"]
    dm_wuxing = paipan_data["日主"]["五行"]

    # 收集用神和忌神的五行
    yongshen_wx = {ys["五行"] for ys in yongshen_data["用神"] if ys["五行"] != "需AI判读"}
    jishen_wx = {js["五行"] for js in yongshen_data["忌神"] if js["五行"] != "需AI判读"}

    lines = []
    lines.append("**大运分段总论：**\n")

    for idx, dayun in enumerate(dayun_list):
        ganzi = dayun["干支"]
        shishen = dayun["天干十神"]
        dz_wx = dayun["地支五行"]
        age_start = dayun["起始虚岁"]
        age_end = dayun["结束虚岁"]
        year_start = dayun["起始公历年"]
        year_end = dayun["结束公历年"]
        theme = SHISHEN_DAYUN_THEME.get(shishen, "综合运")

        # 判断对命主的利弊
        tg_wx = dayun["天干"]
        from engine.paipan import WUXING_OF_TIANGAN
        tg_wuxing = WUXING_OF_TIANGAN.get(tg_wx, "")

        favorable_count = 0
        unfavorable_count = 0
        if tg_wuxing in yongshen_wx:
            favorable_count += 1
        if tg_wuxing in jishen_wx:
            unfavorable_count += 1
        if dz_wx in yongshen_wx:
            favorable_count += 1
        if dz_wx in jishen_wx:
            unfavorable_count += 1

        if favorable_count > unfavorable_count:
            rating = "🟢 用神得力"
            rating_desc = "整体有利"
        elif unfavorable_count > favorable_count:
            rating = "🔴 忌神当值"
            rating_desc = "整体需谨慎"
        else:
            rating = "🟡 吉凶参半"
            rating_desc = "机遇与风险并存"

        lines.append(f"### {ganzi}运（{age_start}-{age_end}岁 / {year_start}-{year_end}年）{rating}")
        lines.append(f"- **天干十神**：{shishen} → {theme}")
        lines.append(f"- **地支五行**：{dz_wx}")
        lines.append(f"- **对命主影响**：{rating_desc}")

        # 人话翻译 + 趋利避害
        if shishen == "七杀":
            lines.append("- 👉 人话：这步运压力大但机会也大，是'拼一把'的阶段。能扛住压力就脱胎换骨，扛不住就被压垮")
            lines.append("- ✅ 主动找导师/靠山化解七杀压力，不要独自硬扛")
            lines.append("- ⚠️ 注意身体和情绪管理，七杀运最怕透支")
        elif shishen == "正官":
            lines.append("- 👉 人话：规矩中求发展的阶段，适合在体制/大公司里稳步上升。守规矩会有回报")
            lines.append("- ✅ 适合考证、升职、进入体制/大平台。按规矩办事会有回报")
            lines.append("- ⚠️ 不宜叛逆冒险，这步运的红利在'稳'不在'变'")
        elif shishen == "正印":
            lines.append("- 👉 人话：有人罩你的阶段，贵人运旺。适合学习深造、考证、拜师、找靠山")
            lines.append("- ✅ 最佳学习窗口——深造/考证/拜师/读书，投资自己回报最大")
            lines.append("- ✅ 主动接近长辈/权威/母亲型人物，她们是你这步运的贵人")
        elif shishen == "偏印":
            lines.append("- 👉 人话：独行侠阶段，适合钻研偏门/小众领域。可能感觉孤独但收获独特能力")
            lines.append("- ✅ 适合钻研小众/偏门领域，建立独特竞争力")
            lines.append("- ⚠️ 注意不要过度封闭，保持基本社交频率")
        elif shishen == "比肩":
            lines.append("- 👉 人话：同辈互动频繁，合作机会多。但也意味着竞争加剧，注意合作中的利益分配")
            lines.append("- ✅ 适合合伙/团队作战，借助同辈力量")
            lines.append("- ⚠️ 注意合作中的利益分配，白纸黑字先说清楚")
        elif shishen == "劫财":
            lines.append("- 👉 人话：破财信号明显，投资要保守。身边可能出现'抢你资源'的人，守住本分")
            lines.append("- ⚠️ 投资极度保守，不做担保/借贷。守住现有资产")
            lines.append("- ⚠️ 警惕身边'借钱/合伙/代持'的请求")
        elif shishen == "食神":
            lines.append("- 👉 人话：最舒服的运之一，才华自然流淌，适合创作、享受生活。但注意不要太安逸而失去进取心")
            lines.append("- ✅ 最佳创作/表达窗口——写书/做课/拍视频/建品牌")
            lines.append("- ⚠️ 注意不要太安逸而失去进取心。舒服是好事但不能躺平")
        elif shishen == "伤官":
            lines.append("- 👉 人话：锋芒毕露的阶段，创新力爆棚但容易得罪人。管好嘴巴，把锋芒用在作品上而非人际上")
            lines.append("- ✅ 创新/转型/独立项目的最佳时机。锋芒用在作品上")
            lines.append("- ⚠️ 管好嘴巴！伤官最忌'说真话得罪人'。学会柔性表达")
        elif shishen == "偏财":
            lines.append("- 👉 人话：意外收获的机会多，偏财运好。适合投资、社交拓展。但偏财来得快去得也快，别贪")
            lines.append("- ✅ 适合社交拓展/投资试水/副业探索")
            lines.append("- ⚠️ 偏财来得快去得也快，见好就收不要贪")
        elif shishen == "正财":
            lines.append("- 👉 人话：稳定收入增长期，适合置业、储蓄。男命这步运婚姻缘分也会增强")
            lines.append("- ✅ 适合置业/储蓄/长期投资。稳定收入增长期")
            lines.append("- ✅ 男命婚姻缘增强，女命母亲/长辈女性缘好")

        # 交脱期检测：当前年份落在本步大运最后2年 或 下步大运前2年
        is_current_dayun = year_start <= current_year <= year_end
        years_left = year_end - current_year
        is_tail = is_current_dayun and 0 <= years_left <= 1  # 最后2年（含本年）
        next_dayun = dayun_list[idx + 1] if idx + 1 < len(dayun_list) else None
        is_head = False
        if next_dayun:
            next_start = next_dayun["起始公历年"]
            is_head = next_start <= current_year <= next_start + 1  # 前2年

        if is_tail or is_head:
            next_ganzi = next_dayun["干支"] if next_dayun else "未知"
            next_shishen = next_dayun["天干十神"] if next_dayun else "未知"
            if is_tail:
                lines.append(f"\n> ⚠️ **大运交脱警示**：当前处于{ganzi}运最后{years_left + 1}年，即将换入{next_ganzi}（{next_shishen}）运。")
            else:
                prev_ganzi = dayun_list[idx - 1]["干支"] if idx > 0 else "未知"
                lines.append(f"\n> ⚠️ **大运交脱警示**：刚从{prev_ganzi}运换入{ganzi}运，处于新运适应期。")

            lines.append(">")
            lines.append("> **交脱期行动分类**：")
            lines.append("> - ⚠️ **冒险型变动（不宜）**：跳槽/创业/大额投资/搬家/重大关系变动 → 交脱期能量不稳，冒险容易翻车")
            lines.append("> - ✅ **蓄力型投资（适宜）**：读书/考证/深造/技能学习/建人脉/找导师 → 印星类行动=充电蓄力，交脱期反而是最佳窗口")
            lines.append("> - 👉 人话：交脱期像换挡——换挡时不要猛踩油门（冒险），但可以看地图规划路线（蓄力）")

        lines.append("")

    return "\n".join(lines)


# ============================================================
# 事件推理引擎（P3：大运/流年 → 事件候选 + 证据链 + 强度评分）
# 来源：滴天髓·通变/源流/官杀章 + 子平真诠·用神成败论 + 穷通宝鉴·调候 + 实战经验
# ============================================================

# --- 事件触发规则表 ---
# 每条规则：领域 / 事件名 / 触发条件函数 / 证据模板 / 基础强度 / 规则来源
# 触发条件函数签名：(day_master_wx, shishen, dizhi_rels, tiangan_rels, yongshen_info, gender) -> bool

EVENT_RULES = [
    # ========== 婚恋类 ==========
    {
        "领域": "婚恋",
        "事件": "婚恋缘分增强",
        "触发十神": ["正财", "正官"],
        "gender_filter": None,  # 男正财=妻星，女正官=夫星
        "地支触发": ["六合", "三合"],
        "证据模板": "流年{shishen}透出{extra}",
        "基础强度": 70,
        "来源": "子平真诠·论正财/正官",
    },
    {
        "领域": "婚恋",
        "事件": "夫妻宫动荡",
        "触发十神": None,
        "gender_filter": None,
        "地支触发": ["六冲"],
        "冲位要求": "日支",
        "证据模板": "流年地支冲日支（夫妻宫）{extra}",
        "基础强度": 75,
        "来源": "滴天髓·冲之旺衰论",
    },
    {
        "领域": "婚恋",
        "事件": "伤官见官·感情风险",
        "触发十神": ["正官"],
        "gender_filter": "女",
        "原局条件": "伤官",  # 原局有伤官
        "证据模板": "女命原局有伤官，流年正官透出形成伤官见官{extra}",
        "基础强度": 80,
        "来源": "子平真诠·论伤官",
    },
    # ========== 事业类 ==========
    {
        "领域": "事业",
        "事件": "升职/晋升机会",
        "触发十神": ["正官", "正印"],
        "gender_filter": None,
        "地支触发": None,
        "证据模板": "流年{shishen}当值，官印相生利仕途{extra}",
        "基础强度": 65,
        "来源": "子平真诠·论正官/印绶",
    },
    {
        "领域": "事业",
        "事件": "职场压力/竞争加剧",
        "触发十神": ["七杀"],
        "gender_filter": None,
        "地支触发": None,
        "证据模板": "流年七杀透出攻身{extra}",
        "基础强度": 70,
        "来源": "滴天髓·官杀章",
    },
    {
        "领域": "事业",
        "事件": "创新/转型机遇",
        "触发十神": ["伤官"],
        "gender_filter": None,
        "地支触发": None,
        "证据模板": "流年伤官透出，锐意进取利创新{extra}",
        "基础强度": 60,
        "来源": "子平真诠·论伤官",
    },
    {
        "领域": "事业",
        "事件": "贵人相助",
        "触发十神": ["正印", "偏印"],
        "gender_filter": None,
        "地支触发": None,
        "证据模板": "流年印星透出，贵人/长辈助力{extra}",
        "基础强度": 60,
        "来源": "子平真诠·论印绶",
    },
    # ========== 财运类 ==========
    {
        "领域": "财运",
        "事件": "正财收入增加",
        "触发十神": ["正财"],
        "gender_filter": None,
        "地支触发": None,
        "证据模板": "流年正财透出，稳定收入增长{extra}",
        "基础强度": 65,
        "来源": "子平真诠·论正财",
    },
    {
        "领域": "财运",
        "事件": "偏财/意外之财",
        "触发十神": ["偏财"],
        "gender_filter": None,
        "地支触发": None,
        "证据模板": "流年偏财透出，投资/副业/意外收入{extra}",
        "基础强度": 55,
        "来源": "子平真诠·论偏财",
    },
    {
        "领域": "财运",
        "事件": "破财风险",
        "触发十神": ["劫财"],
        "gender_filter": None,
        "地支触发": None,
        "证据模板": "流年劫财透出，争财信号{extra}",
        "基础强度": 70,
        "来源": "滴天髓·劫财论",
    },
    {
        "领域": "财运",
        "事件": "食神生财",
        "触发十神": ["食神"],
        "gender_filter": None,
        "地支触发": None,
        "证据模板": "流年食神透出，才华变现利创作经商{extra}",
        "基础强度": 60,
        "来源": "子平真诠·论食神",
    },
    # ========== 健康类 ==========
    {
        "领域": "健康",
        "事件": "健康注意信号",
        "触发十神": None,
        "gender_filter": None,
        "地支触发": ["六冲", "刑"],
        "冲位要求": None,
        "证据模板": "流年地支与原局形成冲/刑，身体需注意{extra}",
        "基础强度": 55,
        "来源": "滴天髓·冲刑论",
    },
    # ========== 学业类 ==========
    {
        "领域": "学业",
        "事件": "学业/考试有利",
        "触发十神": ["正印", "食神"],
        "gender_filter": None,
        "地支触发": None,
        "证据模板": "流年{shishen}透出，利学习考试深造{extra}",
        "基础强度": 60,
        "来源": "子平真诠·论印绶/食神",
    },
    # ========== 六亲类（P5） ==========
    # --- 父亲（男女同：偏财）---
    {
        "领域": "六亲",
        "事件": "父亲运势不利",
        "触发十神": ["偏财"],
        "gender_filter": None,
        "地支触发": ["六冲"],
        "冲位要求": "年支",
        "证据模板": "流年冲年支（父母宫）且偏财（父星）动{extra}",
        "基础强度": 65,
        "来源": "子平真诠·论偏财·父星与年柱",
    },
    # --- 母亲（男女同：正印）---
    {
        "领域": "六亲",
        "事件": "母亲运势关注",
        "触发十神": None,
        "gender_filter": None,
        "地支触发": ["六冲"],
        "冲位要求": "月支",
        "证据模板": "流年冲月支（母亲宫），母亲运势需关注{extra}",
        "基础强度": 60,
        "来源": "子平真诠·论印绶·母星与月柱",
    },
    # --- 配偶（男：正财，女：正官）---
    {
        "领域": "六亲",
        "事件": "男命·妻星透出利婚姻",
        "触发十神": ["正财"],
        "gender_filter": "男",
        "地支触发": None,
        "证据模板": "流年正财（妻星）透出，婚姻/异性缘增强{extra}",
        "基础强度": 60,
        "来源": "子平真诠·论正财·妻星",
    },
    {
        "领域": "六亲",
        "事件": "女命·夫星透出利婚姻",
        "触发十神": ["正官"],
        "gender_filter": "女",
        "地支触发": None,
        "证据模板": "流年正官（夫星）透出，婚姻/异性缘增强{extra}",
        "基础强度": 60,
        "来源": "子平真诠·论正官·夫星",
    },
    # --- 子女（男：七杀/正官，女：食神/伤官）---
    {
        "领域": "六亲",
        "事件": "女命·子女运活跃",
        "触发十神": ["食神", "伤官"],
        "gender_filter": "女",
        "地支触发": None,
        "证据模板": "流年{shishen}（女命子女星）透出，子女运活跃{extra}",
        "基础强度": 55,
        "来源": "子平真诠·论食伤·女命子女星",
    },
    {
        "领域": "六亲",
        "事件": "男命·子女运活跃",
        "触发十神": ["七杀", "正官"],
        "gender_filter": "男",
        "地支触发": None,
        "证据模板": "流年{shishen}（男命子女星）透出，子女运活跃{extra}",
        "基础强度": 55,
        "来源": "子平真诠·论官杀·男命子女星",
    },
    # --- 时柱（子女宫）被冲 ---
    {
        "领域": "六亲",
        "事件": "子女宫动荡",
        "触发十神": None,
        "gender_filter": None,
        "地支触发": ["六冲"],
        "冲位要求": "时支",
        "证据模板": "流年冲时支（子女宫），子女相关事务需关注{extra}",
        "基础强度": 60,
        "来源": "滴天髓·冲之旺衰论·子女宫",
    },
]


def analyze_events(paipan_data: dict, wangshuai: dict, yongshen: dict,
                   geju: dict, relationships: dict, gender: str = "男",
                   year_count: int = 6) -> list:
    """事件推理引擎：大运+流年 → 事件候选 + 证据链 + 强度评分

    Args:
        paipan_data: 排盘数据
        wangshuai: 旺衰判定结果
        yongshen: 用神忌神判定结果
        geju: 格局判定结果
        relationships: 合冲刑害数据
        gender: 性别
        year_count: 预测年数

    Returns:
        list: 每年一个dict，包含该年所有被触发的事件候选
    """
    from engine.paipan import get_shishen, WUXING_OF_TIANGAN, WUXING_OF_DIZHI, CANGGAN
    from datetime import datetime

    day_master = paipan_data["日主"]["天干"]
    dm_wuxing = paipan_data["日主"]["五行"]
    ws_conclusion = wangshuai["结论"]  # 身旺/身弱
    sizhu = paipan_data["四柱"]

    # 收集用神/忌神五行
    yongshen_wuxing_set = {ys["五行"] for ys in yongshen.get("用神", [])
                           if ys.get("五行") and ys["五行"] != "需AI判读"}
    jishen_wuxing_set = {js["五行"] for js in yongshen.get("忌神", [])
                          if js.get("五行") and js["五行"] != "需AI判读"}

    # 原局十神分布（用于检测"原局有伤官"等条件）
    yuanju_shishen_set = set()
    for pos in ["年柱", "月柱", "时柱"]:
        tg = sizhu[pos]["天干"]
        yuanju_shishen_set.add(get_shishen(day_master, tg))
    for pos in ["年柱", "月柱", "日柱", "时柱"]:
        for cg in sizhu[pos].get("藏干", []):
            cg_gan = cg.get("天干", "")
            if cg_gan:
                yuanju_shishen_set.add(get_shishen(day_master, cg_gan))

    # 原局地支
    yuanju_dizhi = {
        "年支": sizhu["年柱"]["地支"],
        "月支": sizhu["月柱"]["地支"],
        "日支": sizhu["日柱"]["地支"],
        "时支": sizhu["时柱"]["地支"],
    }

    # 获取流年数据
    liunian_data = analyze_liunian(paipan_data, year_count)
    dayun_list = paipan_data.get("大运", {}).get("大运列表", [])

    yearly_events = []

    for liunian in liunian_data:
        year = liunian["公历年"]
        ln_tg = liunian["天干"]
        ln_dz = liunian["地支"]
        ln_shishen = liunian["天干十神"]
        ln_changsheng = liunian.get("十二长生", "")
        tiangan_rels = liunian.get("天干关系", [])
        dizhi_rels = liunian.get("地支关系", [])
        dayun_info = liunian.get("所在大运")

        # 流年天干五行
        ln_tg_wx = WUXING_OF_TIANGAN.get(ln_tg, "")
        ln_dz_wx = WUXING_OF_DIZHI.get(ln_dz, "")

        # 流年地支藏干十神列表（P3.1精度提升：不仅看天干，还看藏干）
        ln_canggan_shishen = []
        for cg_item in CANGGAN.get(ln_dz, []):
            cg_gan = cg_item[0]
            cg_qilei = cg_item[1]
            cg_shishen = get_shishen(day_master, cg_gan)
            ln_canggan_shishen.append((cg_shishen, cg_gan, cg_qilei))

        # 大运天干十神
        dayun_shishen = dayun_info["天干十神"] if dayun_info else ""

        triggered_events = []

        for rule in EVENT_RULES:
            # 性别过滤
            if rule.get("gender_filter") and rule["gender_filter"] != gender:
                continue

            triggered = False
            evidence_parts = []
            strength_modifier = 0

            # --- 条件1：十神触发（天干 + 藏干）---
            if rule.get("触发十神"):
                # 1a. 天干直接命中（力量最强）
                if ln_shishen in rule["触发十神"]:
                    triggered = True
                    evidence_parts.append(f"流年天干{ln_tg}为{ln_shishen}")
                else:
                    # 1b. 藏干命中（力量较弱但仍触发）
                    for cg_ss, cg_gan, cg_qilei in ln_canggan_shishen:
                        if cg_ss in rule["触发十神"]:
                            triggered = True
                            if cg_qilei == "本气":
                                strength_modifier -= 5  # 藏干本气比透干弱一档
                                evidence_parts.append(
                                    f"流年地支{ln_dz}藏干{cg_gan}为{cg_ss}(本气)")
                            elif cg_qilei == "中气":
                                strength_modifier -= 10  # 中气更弱
                                evidence_parts.append(
                                    f"流年地支{ln_dz}藏干{cg_gan}为{cg_ss}(中气)")
                            else:
                                strength_modifier -= 15  # 余气最弱
                                evidence_parts.append(
                                    f"流年地支{ln_dz}藏干{cg_gan}为{cg_ss}(余气)")
                            break  # 只取第一个命中的藏干

            # --- 条件2：地支关系触发 ---
            if rule.get("地支触发"):
                for rel_str in dizhi_rels:
                    for trigger_type in rule["地支触发"]:
                        if trigger_type in rel_str:
                            # 如果有冲位要求，检查是否满足
                            if rule.get("冲位要求"):
                                if rule["冲位要求"] in rel_str:
                                    triggered = True
                                    evidence_parts.append(rel_str)
                            else:
                                triggered = True
                                evidence_parts.append(rel_str)

            # --- 条件3：原局条件 ---
            if rule.get("原局条件"):
                if rule["原局条件"] not in yuanju_shishen_set:
                    triggered = False  # 原局不满足，取消触发

            if not triggered:
                continue

            # --- 强度修正 ---
            base_strength = rule["基础强度"]

            # 修正1：用神/忌神加减分
            if ln_tg_wx in yongshen_wuxing_set:
                strength_modifier += 10
                evidence_parts.append("流年天干五行为用神")
            elif ln_tg_wx in jishen_wuxing_set:
                strength_modifier -= 10
                evidence_parts.append("流年天干五行为忌神")

            if ln_dz_wx in yongshen_wuxing_set:
                strength_modifier += 5
                evidence_parts.append("流年地支五行为用神")
            elif ln_dz_wx in jishen_wuxing_set:
                strength_modifier -= 5
                evidence_parts.append("流年地支五行为忌神")

            # 修正2：大运同向加强
            if dayun_shishen and rule.get("触发十神"):
                if dayun_shishen in rule["触发十神"]:
                    strength_modifier += 15
                    evidence_parts.append(f"大运{dayun_info['干支']}({dayun_shishen})同向加强")

            # 修正3：身旺身弱与事件类型的适配
            if rule["领域"] == "财运" and "破财" not in rule["事件"]:
                if ws_conclusion == "身旺":
                    strength_modifier += 5  # 身旺担财
                else:
                    strength_modifier -= 5  # 身弱不担财
            elif rule["领域"] == "事业" and "压力" in rule["事件"]:
                if ws_conclusion == "身弱":
                    strength_modifier += 10  # 身弱遇杀更凶
                else:
                    strength_modifier -= 5  # 身旺能扛

            # 修正4：十二长生加减
            if ln_changsheng in ["临官", "帝旺", "长生"]:
                strength_modifier += 5
            elif ln_changsheng in ["死", "墓", "绝"]:
                if rule["领域"] in ["健康"]:
                    strength_modifier += 10

            final_strength = max(10, min(100, base_strength + strength_modifier))

            # 判断吉凶
            if rule["领域"] in ["婚恋"]:
                if "动荡" in rule["事件"] or "风险" in rule["事件"]:
                    jixiong = "凶" if ln_tg_wx in jishen_wuxing_set else "中"
                else:
                    jixiong = "吉" if ln_tg_wx in yongshen_wuxing_set else "中偏吉"
            elif rule["领域"] == "财运":
                if "破财" in rule["事件"]:
                    jixiong = "凶"
                else:
                    jixiong = "吉" if ws_conclusion == "身旺" else "中"
            elif "压力" in rule["事件"]:
                jixiong = "凶" if ws_conclusion == "身弱" else "中"
            else:
                jixiong = "吉" if ln_tg_wx in yongshen_wuxing_set else "中"

            # 构建证据文本
            extra_info = "；".join(evidence_parts) if evidence_parts else ""
            evidence_text = rule["证据模板"].format(
                shishen=ln_shishen, extra=f"（{extra_info}）" if extra_info else ""
            )

            triggered_events.append({
                "领域": rule["领域"],
                "事件": rule["事件"],
                "吉凶": jixiong,
                "强度": final_strength,
                "证据": evidence_text,
                "证据链": evidence_parts,
                "触发源": f"流年{ln_tg}{ln_dz}({ln_shishen})",
                "大运": dayun_info["干支"] if dayun_info else "未知",
                "规则来源": rule["来源"],
            })

        # --- 神煞触发事件（P3.3：桃花/驿马/禄神/天乙贵人/华盖）---
        day_zhi = sizhu["日柱"]["地支"]
        day_gan = day_master

        # 桃花：以日支查（子午卯酉为桃花位）
        # 三合局桃花查表：申子辰→酉，巳酉丑→午，寅午戌→卯，亥卯未→子
        taohua_map = {
            "申": "酉", "子": "酉", "辰": "酉",
            "巳": "午", "酉": "午", "丑": "午",
            "寅": "卯", "午": "卯", "戌": "卯",
            "亥": "子", "卯": "子", "未": "子",
        }
        taohua_target = taohua_map.get(day_zhi, "")
        if ln_dz == taohua_target:
            strength = 65
            if ln_tg_wx in yongshen_wuxing_set:
                strength += 10
            elif ln_tg_wx in jishen_wuxing_set:
                strength -= 5
            triggered_events.append({
                "领域": "婚恋",
                "事件": "桃花星动·异性缘旺",
                "吉凶": "吉" if ln_tg_wx in yongshen_wuxing_set else "中偏吉",
                "强度": strength,
                "证据": f"流年地支{ln_dz}为日支{day_zhi}之桃花位，异性缘/社交运增强",
                "证据链": [f"流年{ln_dz}命中桃花({day_zhi}→{taohua_target})"],
                "触发源": f"流年{ln_tg}{ln_dz}({ln_shishen})",
                "大运": dayun_info["干支"] if dayun_info else "未知",
                "规则来源": "三命通会·桃花查表",
            })

        # 驿马：以日支查
        yima_target = YIMA.get(day_zhi, "")
        if ln_dz == yima_target:
            strength = 60
            if ln_tg_wx in yongshen_wuxing_set:
                strength += 10
            elif ln_tg_wx in jishen_wuxing_set:
                strength -= 5
            triggered_events.append({
                "领域": "事业",
                "事件": "驿马星动·变动/出行",
                "吉凶": "吉" if ln_tg_wx in yongshen_wuxing_set else "中",
                "强度": strength,
                "证据": f"流年地支{ln_dz}为日支{day_zhi}之驿马位，主变动/出差/搬家/换工作",
                "证据链": [f"流年{ln_dz}命中驿马({day_zhi}→{yima_target})"],
                "触发源": f"流年{ln_tg}{ln_dz}({ln_shishen})",
                "大运": dayun_info["干支"] if dayun_info else "未知",
                "规则来源": "三命通会·驿马查表",
            })

        # 禄神：以日干查（天干禄位）
        lu_target = TIANGAN_LU.get(day_gan, "")
        if ln_dz == lu_target:
            strength = 70
            if ln_tg_wx in yongshen_wuxing_set:
                strength += 10
            triggered_events.append({
                "领域": "财运",
                "事件": "禄神临位·进财得禄",
                "吉凶": "吉",
                "强度": strength,
                "证据": f"流年地支{ln_dz}为{day_gan}日主之禄位，主进财/俸禄/实力提升",
                "证据链": [f"流年{ln_dz}命中禄神({day_gan}→{lu_target})"],
                "触发源": f"流年{ln_tg}{ln_dz}({ln_shishen})",
                "大运": dayun_info["干支"] if dayun_info else "未知",
                "规则来源": "三命通会·禄神查表",
            })

        # 天乙贵人：以日干查
        guiren_targets = TIANYI_GUIREN.get(day_gan, [])
        if ln_dz in guiren_targets:
            strength = 60
            if ln_tg_wx in yongshen_wuxing_set:
                strength += 10
            triggered_events.append({
                "领域": "事业",
                "事件": "天乙贵人·逢凶化吉",
                "吉凶": "吉",
                "强度": strength,
                "证据": f"流年地支{ln_dz}为{day_gan}日主之天乙贵人位，主贵人相助/逢凶化吉",
                "证据链": [f"流年{ln_dz}命中天乙贵人({day_gan}→{guiren_targets})"],
                "触发源": f"流年{ln_tg}{ln_dz}({ln_shishen})",
                "大运": dayun_info["干支"] if dayun_info else "未知",
                "规则来源": "三命通会·天乙贵人查表",
            })

        # 华盖：以日支查
        huagai_target = HUAGAI.get(day_zhi, "")
        if ln_dz == huagai_target:
            strength = 50
            triggered_events.append({
                "领域": "学业",
                "事件": "华盖星动·利学术/修行",
                "吉凶": "中",
                "强度": strength,
                "证据": f"流年地支{ln_dz}为日支{day_zhi}之华盖位，主学术/宗教/独处/内在成长",
                "证据链": [f"流年{ln_dz}命中华盖({day_zhi}→{huagai_target})"],
                "触发源": f"流年{ln_tg}{ln_dz}({ln_shishen})",
                "大运": dayun_info["干支"] if dayun_info else "未知",
                "规则来源": "三命通会·华盖查表",
            })

        # 按强度降序排列
        triggered_events.sort(key=lambda x: x["强度"], reverse=True)

        yearly_events.append({
            "公历年": year,
            "干支": liunian["干支"],
            "天干十神": ln_shishen,
            "虚岁": liunian.get("虚岁", 0),
            "所在大运": dayun_info["干支"] if dayun_info else "未知",
            "事件候选": triggered_events,
            "事件数": len(triggered_events),
        })

    return yearly_events


def analyze_monthly_events(paipan_data: dict, wangshuai: dict, yongshen: dict,
                           geju: dict, relationships: dict, gender: str = "男",
                           target_year: int = None) -> list:
    """流月级事件推理：指定年份12个月 → 每月事件候选 + 证据链 + 强度评分

    复用 EVENT_RULES 规则表，与 analyze_events 共享推理逻辑。
    流月事件强度整体下调（月级影响力 < 年级），基础强度 ×0.8。
    """
    from engine.paipan import get_shishen, WUXING_OF_TIANGAN, WUXING_OF_DIZHI, CANGGAN
    from datetime import datetime

    if target_year is None:
        target_year = datetime.now().year

    day_master = paipan_data["日主"]["天干"]
    dm_wuxing = paipan_data["日主"]["五行"]
    ws_conclusion = wangshuai["结论"]
    sizhu = paipan_data["四柱"]

    # 用神/忌神五行
    yongshen_wuxing_set = {ys["五行"] for ys in yongshen.get("用神", [])
                           if ys.get("五行") and ys["五行"] != "需AI判读"}
    jishen_wuxing_set = {js["五行"] for js in yongshen.get("忌神", [])
                          if js.get("五行") and js["五行"] != "需AI判读"}

    # 原局十神和地支
    yuanju_shishen_set = set()
    for pos in ["年柱", "月柱", "时柱"]:
        yuanju_shishen_set.add(get_shishen(day_master, sizhu[pos]["天干"]))
    for pos in ["年柱", "月柱", "日柱", "时柱"]:
        for cg in sizhu[pos].get("藏干", []):
            if cg.get("天干"):
                yuanju_shishen_set.add(get_shishen(day_master, cg["天干"]))

    yuanju_dizhi = {
        "年支": sizhu["年柱"]["地支"],
        "月支": sizhu["月柱"]["地支"],
        "日支": sizhu["日柱"]["地支"],
        "时支": sizhu["时柱"]["地支"],
    }

    # 获取流月数据
    liuyue_data = analyze_liuyue(paipan_data, target_year)

    # 获取当年所在大运
    dayun_list = paipan_data.get("大运", {}).get("大运列表", [])
    current_dayun = None
    for dy in dayun_list:
        if dy["起始公历年"] <= target_year <= dy["结束公历年"]:
            current_dayun = dy
            break
    dayun_shishen = current_dayun["天干十神"] if current_dayun else ""

    monthly_events = []

    for liuyue in liuyue_data:
        month_num = liuyue["公历月"]
        lm_tg = liuyue["月干"]
        lm_dz = liuyue["月支"]
        lm_shishen = liuyue["天干十神"]
        dizhi_rels = liuyue.get("地支关系", [])
        tiangan_rels = liuyue.get("天干关系", [])

        lm_tg_wx = WUXING_OF_TIANGAN.get(lm_tg, "")
        lm_dz_wx = WUXING_OF_DIZHI.get(lm_dz, "")

        # 流月地支藏干十神
        lm_canggan_shishen = []
        for cg_item in CANGGAN.get(lm_dz, []):
            cg_gan, cg_qilei = cg_item[0], cg_item[1]
            cg_ss = get_shishen(day_master, cg_gan)
            lm_canggan_shishen.append((cg_ss, cg_gan, cg_qilei))

        triggered_events = []

        for rule in EVENT_RULES:
            if rule.get("gender_filter") and rule["gender_filter"] != gender:
                continue

            triggered = False
            evidence_parts = []
            strength_modifier = 0

            # 十神触发（天干 + 藏干）
            if rule.get("触发十神"):
                if lm_shishen in rule["触发十神"]:
                    triggered = True
                    evidence_parts.append(f"流月天干{lm_tg}为{lm_shishen}")
                else:
                    for cg_ss, cg_gan, cg_qilei in lm_canggan_shishen:
                        if cg_ss in rule["触发十神"]:
                            triggered = True
                            penalty = {"本气": -5, "中气": -10}.get(cg_qilei, -15)
                            strength_modifier += penalty
                            evidence_parts.append(
                                f"流月地支{lm_dz}藏{cg_gan}为{cg_ss}({cg_qilei})")
                            break

            # 地支关系触发
            if rule.get("地支触发"):
                for rel_str in dizhi_rels:
                    for trigger_type in rule["地支触发"]:
                        if trigger_type in rel_str:
                            if rule.get("冲位要求"):
                                if rule["冲位要求"] in rel_str:
                                    triggered = True
                                    evidence_parts.append(rel_str)
                            else:
                                triggered = True
                                evidence_parts.append(rel_str)

            # 原局条件
            if rule.get("原局条件"):
                if rule["原局条件"] not in yuanju_shishen_set:
                    triggered = False

            if not triggered:
                continue

            # 流月强度 = 基础 × 0.8 + 修正
            base_strength = int(rule["基础强度"] * 0.8)

            # 用神/忌神修正
            if lm_tg_wx in yongshen_wuxing_set:
                strength_modifier += 8
                evidence_parts.append("月干五行为用神")
            elif lm_tg_wx in jishen_wuxing_set:
                strength_modifier -= 8
                evidence_parts.append("月干五行为忌神")

            if lm_dz_wx in yongshen_wuxing_set:
                strength_modifier += 4
            elif lm_dz_wx in jishen_wuxing_set:
                strength_modifier -= 4

            # 大运同向
            if dayun_shishen and rule.get("触发十神"):
                if dayun_shishen in rule["触发十神"]:
                    strength_modifier += 10
                    evidence_parts.append(f"大运{current_dayun['干支']}同向")

            # 身旺身弱修正
            if rule["领域"] == "财运" and "破财" not in rule["事件"]:
                strength_modifier += 4 if ws_conclusion == "身旺" else -4
            elif rule["领域"] == "事业" and "压力" in rule["事件"]:
                strength_modifier += 8 if ws_conclusion == "身弱" else -4

            final_strength = max(10, min(100, base_strength + strength_modifier))

            # 吉凶判断
            if "动荡" in rule["事件"] or "风险" in rule["事件"] or "破财" in rule["事件"]:
                jixiong = "凶" if lm_tg_wx in jishen_wuxing_set else "中"
            elif "压力" in rule["事件"]:
                jixiong = "凶" if ws_conclusion == "身弱" else "中"
            else:
                jixiong = "吉" if lm_tg_wx in yongshen_wuxing_set else "中"

            extra_info = "；".join(evidence_parts) if evidence_parts else ""
            evidence_text = rule["证据模板"].format(
                shishen=lm_shishen, extra=f"（{extra_info}）" if extra_info else ""
            )

            triggered_events.append({
                "领域": rule["领域"],
                "事件": rule["事件"],
                "吉凶": jixiong,
                "强度": final_strength,
                "证据": evidence_text,
                "证据链": evidence_parts,
                "触发源": f"流月{lm_tg}{lm_dz}({lm_shishen})",
                "规则来源": rule["来源"],
            })

        # --- 神煞触发事件（流月级）---
        day_zhi = sizhu["日柱"]["地支"]
        day_gan = day_master

        # 桃花
        taohua_map = {
            "申": "酉", "子": "酉", "辰": "酉",
            "巳": "午", "酉": "午", "丑": "午",
            "寅": "卯", "午": "卯", "戌": "卯",
            "亥": "子", "卯": "子", "未": "子",
        }
        taohua_target = taohua_map.get(day_zhi, "")
        if lm_dz == taohua_target:
            strength = int(65 * 0.8)
            if lm_tg_wx in yongshen_wuxing_set:
                strength += 8
            triggered_events.append({
                "领域": "婚恋", "事件": "桃花星动·异性缘旺",
                "吉凶": "吉" if lm_tg_wx in yongshen_wuxing_set else "中偏吉",
                "强度": strength,
                "证据": f"流月地支{lm_dz}为日支{day_zhi}之桃花位",
                "证据链": [f"流月{lm_dz}命中桃花"],
                "触发源": f"流月{lm_tg}{lm_dz}({lm_shishen})",
                "规则来源": "三命通会·桃花查表",
            })

        # 驿马
        yima_target = YIMA.get(day_zhi, "")
        if lm_dz == yima_target:
            strength = int(60 * 0.8)
            if lm_tg_wx in yongshen_wuxing_set:
                strength += 8
            triggered_events.append({
                "领域": "事业", "事件": "驿马星动·变动/出行",
                "吉凶": "吉" if lm_tg_wx in yongshen_wuxing_set else "中",
                "强度": strength,
                "证据": f"流月地支{lm_dz}为日支{day_zhi}之驿马位",
                "证据链": [f"流月{lm_dz}命中驿马"],
                "触发源": f"流月{lm_tg}{lm_dz}({lm_shishen})",
                "规则来源": "三命通会·驿马查表",
            })

        # 禄神
        lu_target = TIANGAN_LU.get(day_gan, "")
        if lm_dz == lu_target:
            strength = int(70 * 0.8)
            if lm_tg_wx in yongshen_wuxing_set:
                strength += 8
            triggered_events.append({
                "领域": "财运", "事件": "禄神临位·进财得禄",
                "吉凶": "吉", "强度": strength,
                "证据": f"流月地支{lm_dz}为{day_gan}日主之禄位",
                "证据链": [f"流月{lm_dz}命中禄神"],
                "触发源": f"流月{lm_tg}{lm_dz}({lm_shishen})",
                "规则来源": "三命通会·禄神查表",
            })

        # 天乙贵人
        guiren_targets = TIANYI_GUIREN.get(day_gan, [])
        if lm_dz in guiren_targets:
            strength = int(60 * 0.8)
            if lm_tg_wx in yongshen_wuxing_set:
                strength += 8
            triggered_events.append({
                "领域": "事业", "事件": "天乙贵人·逢凶化吉",
                "吉凶": "吉", "强度": strength,
                "证据": f"流月地支{lm_dz}为{day_gan}日主之天乙贵人位",
                "证据链": [f"流月{lm_dz}命中天乙贵人"],
                "触发源": f"流月{lm_tg}{lm_dz}({lm_shishen})",
                "规则来源": "三命通会·天乙贵人查表",
            })

        # 华盖
        huagai_target = HUAGAI.get(day_zhi, "")
        if lm_dz == huagai_target:
            strength = int(50 * 0.8)
            triggered_events.append({
                "领域": "学业", "事件": "华盖星动·利学术/修行",
                "吉凶": "中", "强度": strength,
                "证据": f"流月地支{lm_dz}为日支{day_zhi}之华盖位",
                "证据链": [f"流月{lm_dz}命中华盖"],
                "触发源": f"流月{lm_tg}{lm_dz}({lm_shishen})",
                "规则来源": "三命通会·华盖查表",
            })

        triggered_events.sort(key=lambda x: x["强度"], reverse=True)

        monthly_events.append({
            "公历月": f"{target_year}.{month_num:02d}",
            "干支": liuyue["干支"],
            "天干十神": lm_shishen,
            "事件候选": triggered_events,
            "事件数": len(triggered_events),
        })

    return monthly_events


def generate_monthly_events_text(paipan_data: dict, wangshuai: dict, yongshen: dict,
                                 geju: dict, relationships: dict, gender: str = "男",
                                 target_year: int = None) -> str:
    """流月事件推理的人话输出"""
    from datetime import datetime
    if target_year is None:
        target_year = datetime.now().year

    events = analyze_monthly_events(paipan_data, wangshuai, yongshen, geju,
                                    relationships, gender, target_year)
    day_master = paipan_data["日主"]["天干"]

    lines = [f"**{day_master}日主 {target_year}年逐月事件推理：**\n"]

    for month_data in events:
        month_str = month_data["公历月"]
        ganzi = month_data["干支"]
        shishen = month_data["天干十神"]
        event_list = month_data["事件候选"]

        if not event_list:
            continue  # 无事件的月份不输出

        lines.append(f"#### {month_str} {ganzi}（{shishen}）")
        for evt in event_list[:5]:  # 每月最多显示5条
            icon = {"吉": "🟢", "中": "🟡", "凶": "🔴"}.get(evt["吉凶"], "⚪")
            lines.append(f"- {icon} {evt['事件']}（{evt['领域']}）强度{evt['强度']}")
        lines.append("")

    return "\n".join(lines)


def generate_events_text(paipan_data: dict, wangshuai: dict, yongshen: dict,
                         geju: dict, relationships: dict, gender: str = "男",
                         year_count: int = 6) -> str:
    """事件推理引擎的人话输出"""
    events = analyze_events(paipan_data, wangshuai, yongshen, geju,
                            relationships, gender, year_count)
    day_master = paipan_data["日主"]["天干"]

    lines = [f"**{day_master}日主 近{year_count}年事件推理（引擎确定性预测）：**\n"]
    lines.append("以下为引擎基于经典规则的事件候选，按触发强度排序。")
    lines.append("每条事件均附证据链和规则来源，可追溯、可复核。\n")

    for year_data in events:
        year = year_data["公历年"]
        ganzi = year_data["干支"]
        shishen = year_data["天干十神"]
        xu_sui = year_data["虚岁"]
        dayun = year_data["所在大运"]
        event_list = year_data["事件候选"]

        lines.append(f"### {year}年 {ganzi}（{shishen}）· 虚岁{xu_sui} · {dayun}大运")

        if not event_list:
            lines.append("- 本年无强触发事件\n")
            continue

        lines.append(f"| 领域 | 事件 | 吉凶 | 强度 | 证据 | 来源 |")
        lines.append(f"|------|------|------|------|------|------|")
        for evt in event_list:
            jixiong_icon = {"吉": "🟢", "中": "🟡", "中偏吉": "🟢", "凶": "🔴"}.get(evt["吉凶"], "⚪")
            lines.append(
                f"| {evt['领域']} | {evt['事件']} | {jixiong_icon} {evt['吉凶']} "
                f"| {evt['强度']} | {evt['证据'][:60]} | {evt['规则来源']} |"
            )
        lines.append("")

    return "\n".join(lines)


# ============================================================
# 主分析函数
# ============================================================

def full_analysis(paipan_data: dict, gender: str = "男") -> dict:
    """
    完整规则分析，输出所有可自动化的判定结果

    返回 JSON 包含：旺衰/格局/十神/合冲刑害/用神/神煞/六亲/流年/流月/当下定位/人生四段/推演文本
    """
    wangshuai = judge_wangshuai(paipan_data)
    geju = judge_geju(paipan_data, wangshuai)
    shishen = analyze_shishen(paipan_data)
    relationships = analyze_relationships(paipan_data)
    yongshen = judge_yongshen(paipan_data, wangshuai, geju)
    shenshas = analyze_shenshas(paipan_data)

    # P2-1: 合冲刑害对用神净影响标注（来源：子平真诠·用神成败论）
    # 原则：合走用神为凶，冲开忌神为吉；合走忌神为吉，冲开用神为凶
    _annotate_yongshen_impact(relationships, yongshen, paipan_data)

    # 确定性分析（不依赖LLM）
    liuqin = analyze_liuqin(paipan_data, gender)
    liunian = analyze_liunian(paipan_data, 6)
    liuyue = analyze_liuyue(paipan_data)
    dangxia = analyze_dangxia(paipan_data, gender)
    rensheng = analyze_rensheng_siduan(paipan_data)

    # P3: 事件推理引擎（大运+流年 → 事件候选 + 证据链 + 强度评分）
    events = analyze_events(paipan_data, wangshuai, yongshen, geju,
                            relationships, gender, 6)

    # P3.1: 流月级事件推理（当前年份12个月）
    monthly_events = analyze_monthly_events(paipan_data, wangshuai, yongshen,
                                            geju, relationships, gender)

    # 生成确定性推演文本（下沉到引擎层，替代AI判读）
    engine_texts = {
        "wangshuai_renhua": generate_wangshuai_text(paipan_data, wangshuai),
        "shishen_zuhe": generate_shishen_text(paipan_data, shishen, geju),
        "hechong_detail": generate_hechong_text(paipan_data, relationships),
        "shenshas_detail": generate_shenshas_text(shenshas),
        "yongshen_detail": generate_yongshen_text(paipan_data, yongshen, wangshuai),
        "dayun_zonglun": generate_dayun_text(paipan_data, wangshuai, yongshen),
        "liuqin_detail": generate_liuqin_text(paipan_data, gender),
        "liunian_detail": generate_liunian_text(paipan_data, 6),
        "liuyue_detail": generate_liuyue_text(paipan_data),
        "dangxia_detail": generate_dangxia_text(paipan_data, gender),
        "rensheng_siduan": generate_rensheng_siduan_text(paipan_data),
        "events_detail": generate_events_text(paipan_data, wangshuai, yongshen,
                                               geju, relationships, gender, 6),
        "monthly_events_detail": generate_monthly_events_text(
            paipan_data, wangshuai, yongshen, geju, relationships, gender),
    }

    return {
        # 引擎元数据（规则输出契约 P1-3）
        "引擎版本": "v3.1",
        "规则体系": {
            "旺衰": "周勇志/曲炜打分法 + 子平真诠月令系数",
            "格局": "子平真诠·八格成败体系 + 三命通会·专旺/从格",
            "用神": "四法融合（格局用神/调候用神/扶抑用神/通关用神）",
            "调候": "穷通宝鉴·十天干十二月120条",
            "神煞": "三命通会·常用神煞查表",
            "事件推理": "滴天髓/子平真诠/穷通宝鉴 → 事件候选+证据链+强度评分（含藏干+神煞）",
            "流月推理": "EVENT_RULES × 0.8 + 神煞触发 → 逐月事件候选",
        },
        "置信度说明": "高=经典有明确规则且计算确定 / 中=有规则但边界模糊 / 低=需AI辅助判断",
        # 核心判定结果
        "旺衰": wangshuai,
        "格局": geju,
        "十神分布": shishen,
        "合冲刑害": relationships,
        "用神忌神": yongshen,
        "神煞": shenshas,
        "六亲": liuqin,
        "流年": liunian,
        "流月": liuyue,
        "当下定位": dangxia,
        "人生四段": rensheng,
        "事件推理": events,
        "流月事件": monthly_events,
        "推演文本": engine_texts,
    }


# ============================================================
# 命令行入口
# ============================================================

if __name__ == "__main__":
    import json
    import sys
    sys.path.insert(0, "/Users/caizaiheng/vscode/八字项目")
    from engine.paipan import paipan

    # 默认陶命
    data = paipan(1982, 10, 26, 17, 30, "女")
    result = full_analysis(data, gender="女")
    print(json.dumps(result, ensure_ascii=False, indent=2))
