"""
八字排盘引擎 - 基于 lunar-python
输入：出生年月日时(公历) + 性别
输出：完整结构化 JSON（四柱/十神/藏干/五行/大运/流年/神煞/合冲刑害）

核心约束：精准度 > 速度，所有数据可追溯至 lunar-python 计算结果
"""

import json
import math
from datetime import datetime, timedelta
from lunar_python import Solar, Lunar


# ============================================================
# 常量定义
# ============================================================

TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

WUXING_OF_TIANGAN = {
    "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土",
    "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水"
}

WUXING_OF_DIZHI = {
    "子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火",
    "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水"
}

YINYANG_OF_TIANGAN = {
    "甲": "阳", "乙": "阴", "丙": "阳", "丁": "阴", "戊": "阳",
    "己": "阴", "庚": "阳", "辛": "阴", "壬": "阳", "癸": "阴"
}

# 地支藏干（本气/中气/余气）
CANGGAN = {
    "子": [("癸", "本气", 30)],
    "丑": [("己", "本气", 18), ("癸", "中气", 9), ("辛", "余气", 3)],
    "寅": [("甲", "本气", 16), ("丙", "中气", 7), ("戊", "余气", 7)],
    "卯": [("乙", "本气", 30)],
    "辰": [("戊", "本气", 18), ("乙", "中气", 9), ("癸", "余气", 3)],
    "巳": [("丙", "本气", 16), ("庚", "中气", 9), ("戊", "余气", 5)],
    "午": [("丁", "本气", 21), ("己", "中气", 9)],
    "未": [("己", "本气", 18), ("丁", "中气", 9), ("乙", "余气", 3)],
    "申": [("庚", "本气", 16), ("壬", "中气", 7), ("戊", "余气", 7)],
    "酉": [("辛", "本气", 30)],
    "戌": [("戊", "本气", 18), ("辛", "中气", 9), ("丁", "余气", 3)],
    "亥": [("壬", "本气", 21), ("甲", "中气", 9)],
}

# 十神关系映射：(日主五行, 日主阴阳, 其他天干五行, 其他天干阴阳) → 十神
def get_shishen(day_master: str, other_gan: str) -> str:
    """计算十神关系"""
    if day_master == other_gan:
        return "比肩"

    dm_wx = WUXING_OF_TIANGAN[day_master]
    dm_yy = YINYANG_OF_TIANGAN[day_master]
    ot_wx = WUXING_OF_TIANGAN[other_gan]
    ot_yy = YINYANG_OF_TIANGAN[other_gan]

    same_yinyang = (dm_yy == ot_yy)

    # 五行生克关系
    sheng_map = {"木": "火", "火": "土", "土": "金", "金": "水", "水": "木"}
    ke_map = {"木": "土", "火": "金", "土": "水", "金": "木", "水": "火"}

    if dm_wx == ot_wx:
        return "比肩" if same_yinyang else "劫财"
    elif sheng_map[dm_wx] == ot_wx:
        return "食神" if same_yinyang else "伤官"
    elif ke_map[dm_wx] == ot_wx:
        return "偏财" if same_yinyang else "正财"
    elif sheng_map[ot_wx] == dm_wx:
        return "偏印" if same_yinyang else "正印"
    elif ke_map[ot_wx] == dm_wx:
        return "七杀" if same_yinyang else "正官"
    return "未知"


def get_nayin(tiangan: str, dizhi: str) -> str:
    """计算纳音"""
    nayin_table = [
        "海中金", "炉中火", "大林木", "路旁土", "剑锋金", "山头火",
        "涧下水", "城头土", "白蜡金", "杨柳木", "泉中水", "屋上土",
        "霹雳火", "松柏木", "长流水", "砂中金", "山下火", "平地木",
        "壁上土", "金箔金", "覆灯火", "天河水", "大驿土", "钗钏金",
        "桑柘木", "大溪水", "砂中土", "天上火", "石榴木", "大海水"
    ]
    tg_idx = TIANGAN.index(tiangan)
    dz_idx = DIZHI.index(dizhi)
    idx = (tg_idx * 12 + dz_idx) // 2
    return nayin_table[idx % 30]


# ============================================================
# 真太阳时计算（来源：Jean Meeus《天文算法》第2版）
# ============================================================

# 中国主要城市经度表（精确到小数点后1位）
# 来源：国家测绘地理信息局公开数据
CITY_LONGITUDE = {
    # 直辖市
    "北京": 116.4, "天津": 117.2, "上海": 121.5, "重庆": 106.5,
    # 华东
    "杭州": 120.2, "南京": 118.8, "苏州": 120.6, "宁波": 121.5,
    "温州": 120.7, "合肥": 117.3, "福州": 119.3, "厦门": 118.1,
    "济南": 117.0, "青岛": 120.4, "南昌": 115.9,
    # 华南
    "广州": 113.3, "深圳": 114.1, "珠海": 113.6, "东莞": 113.8,
    "佛山": 113.1, "南宁": 108.3, "海口": 110.3,
    # 华中
    "武汉": 114.3, "长沙": 113.0, "郑州": 113.7,
    # 西南
    "成都": 104.1, "昆明": 102.7, "贵阳": 106.7, "拉萨": 91.1,
    # 西北
    "西安": 108.9, "兰州": 103.8, "西宁": 101.8, "银川": 106.3,
    "乌鲁木齐": 87.6,
    # 东北
    "沈阳": 123.4, "大连": 121.6, "长春": 125.3, "哈尔滨": 126.6,
    # 其他
    "石家庄": 114.5, "太原": 112.5, "呼和浩特": 111.7,
    "长治": 113.1, "洛阳": 112.4, "开封": 114.3,
    "庐江": 117.3, "无锡": 120.3, "常州": 119.9,
}

# 标准经度（北京时间 = 东经120°）
STANDARD_LONGITUDE = 120.0


def _fuzzy_match_city_longitude(birth_place: str) -> float:
    """模糊匹配城市经度。

    支持常见变体：'北京市'→'北京', '广东广州'→'广州', '新疆乌鲁木齐'→'乌鲁木齐'
    匹配策略（按优先级）：
      1. 精确匹配
      2. 去掉末尾'市/区/县'后匹配
      3. 城市表中任一城市名是输入的子串（如 '广东广州' 包含 '广州'）
      4. 输入是城市表中某城市名的子串（如 '乌市' 包含于 '乌鲁木齐' → 不做，太容易误匹）
    """
    if not birth_place:
        return None

    # 1. 精确匹配
    if birth_place in CITY_LONGITUDE:
        return CITY_LONGITUDE[birth_place]

    # 2. 去掉末尾行政后缀
    stripped = birth_place.rstrip("市区县")
    if stripped and stripped in CITY_LONGITUDE:
        return CITY_LONGITUDE[stripped]

    # 3. 城市表中的城市名作为子串出现在输入中（从长到短匹配，避免歧义）
    candidates = sorted(CITY_LONGITUDE.keys(), key=len, reverse=True)
    for city_name in candidates:
        if city_name in birth_place:
            return CITY_LONGITUDE[city_name]

    return None


def calculate_equation_of_time(year: int, month: int, day: int,
                                hour: int = 12, minute: int = 0) -> float:
    """
    计算均时差（Equation of Time）

    来源：Jean Meeus《天文算法》第28章
    精度：约±1秒（1000-3000年范围）

    参数：公历年月日时分
    返回：均时差（分钟），正值表示真太阳时快于平太阳时
    """
    # 计算儒略日 (JD)
    if month <= 2:
        year -= 1
        month += 12
    a_val = int(year / 100)
    b_val = 2 - a_val + int(a_val / 4)
    jd = (int(365.25 * (year + 4716)) + int(30.6001 * (month + 1))
          + day + (hour + minute / 60.0) / 24.0 + b_val - 1524.5)

    # 儒略世纪数 T（从J2000.0起算）
    t_century = (jd - 2451545.0) / 36525.0

    # 平黄道倾角 ε（度）
    epsilon = 23.439291 - 0.0130042 * t_century

    # 几何平黄经 L0（度）
    l0_deg = 280.46646 + 36000.76983 * t_century + 0.0003032 * t_century ** 2
    l0_deg = l0_deg % 360

    # 地球轨道离心率 e
    eccentricity = 0.016708634 - 0.000042037 * t_century - 0.0000001267 * t_century ** 2

    # 平近点角 M（度）
    m_deg = 357.52911 + 35999.05029 * t_century - 0.0001537 * t_century ** 2
    m_deg = m_deg % 360

    # 转弧度
    epsilon_rad = math.radians(epsilon)
    l0_rad = math.radians(l0_deg)
    m_rad = math.radians(m_deg)

    # y = tan²(ε/2)
    y_val = math.tan(epsilon_rad / 2) ** 2

    # 均时差公式（弧度）
    eot_rad = (y_val * math.sin(2 * l0_rad)
               - 2 * eccentricity * math.sin(m_rad)
               + 4 * eccentricity * y_val * math.sin(m_rad) * math.cos(2 * l0_rad)
               - 0.5 * y_val ** 2 * math.sin(4 * l0_rad)
               - 1.25 * eccentricity ** 2 * math.sin(2 * m_rad))

    # 转为分钟（弧度→度→分钟：1弧度 = 180/π度，1度 = 4分钟）
    eot_minutes = eot_rad * 4 * 180 / math.pi
    return eot_minutes


def calculate_true_solar_time(year: int, month: int, day: int,
                               hour: int, minute: int,
                               longitude: float) -> tuple:
    """
    计算真太阳时

    来源：Jean Meeus《天文算法》
    公式：真太阳时 = 北京时间 + 经度修正 + 均时差
    经度修正 = (当地经度 - 120°) × 4分钟/度

    参数：
        year, month, day, hour, minute: 北京时间
        longitude: 当地经度（东经，度）

    返回：
        (year, month, day, hour, minute, correction_minutes, detail_str)
        correction_minutes: 总修正量（分钟）
        detail_str: 修正明细说明
    """
    # 经度修正（分钟）
    longitude_correction = (longitude - STANDARD_LONGITUDE) * 4.0

    # 均时差（分钟）
    eot_minutes = calculate_equation_of_time(year, month, day, hour, minute)

    # 总修正量
    total_correction = longitude_correction + eot_minutes

    # 应用修正
    original_dt = datetime(year, month, day, hour, minute)
    corrected_dt = original_dt + timedelta(minutes=total_correction)

    detail_str = (f"经度修正{longitude_correction:+.1f}分(经度{longitude}°) + "
                  f"均时差{eot_minutes:+.1f}分 = 总修正{total_correction:+.1f}分")

    return (corrected_dt.year, corrected_dt.month, corrected_dt.day,
            corrected_dt.hour, corrected_dt.minute,
            round(total_correction, 1), detail_str)


def lunar_to_solar(year: int, month: int, day: int, is_leap_month: bool = False) -> tuple:
    """
    农历转公历

    来源：lunar-python 库
    参数：
        year: 农历年
        month: 农历月（1-12）
        day: 农历日
        is_leap_month: 是否闰月

    返回：(公历年, 公历月, 公历日)
    """
    if is_leap_month:
        lunar = Lunar.fromYmd(year, -month, day)
    else:
        lunar = Lunar.fromYmd(year, month, day)
    solar = lunar.getSolar()
    return (solar.getYear(), solar.getMonth(), solar.getDay())


# ============================================================
# 核心排盘函数
# ============================================================

def paipan(birth_year: int, birth_month: int, birth_day: int,
           birth_hour: int, birth_minute: int, gender: str,
           birth_place: str = "未知", name: str = "",
           calendar_type: str = "公历", is_leap_month: bool = False,
           use_true_solar_time: bool = False, longitude: float = None) -> dict:
    """
    完整八字排盘

    参数:
        birth_year: 年
        birth_month: 月
        birth_day: 日
        birth_hour: 时(0-23)
        birth_minute: 分(0-59)
        gender: "男" 或 "女"
        birth_place: 出生地（用于查询经度，计算真太阳时）
        name: 命主姓名
        calendar_type: "公历" 或 "农历"（默认公历）
        is_leap_month: 农历是否闰月（仅 calendar_type="农历" 时有效）
        use_true_solar_time: 是否启用真太阳时校正（默认 False）
        longitude: 出生地经度（度）。若为 None 则从 CITY_LONGITUDE 查询 birth_place

    返回:
        完整排盘 JSON 字典
    """
    # --- 农历转公历 ---
    solar_year, solar_month, solar_day = birth_year, birth_month, birth_day
    time_info = {"原始输入": f"{birth_year}-{birth_month:02d}-{birth_day:02d} {birth_hour:02d}:{birth_minute:02d}",
                 "历法": calendar_type}

    if calendar_type == "农历":
        solar_year, solar_month, solar_day = lunar_to_solar(
            birth_year, birth_month, birth_day, is_leap_month)
        time_info["农历转公历"] = f"{solar_year}-{solar_month:02d}-{solar_day:02d}"

    # --- 真太阳时校正 ---
    actual_hour, actual_minute = birth_hour, birth_minute
    if use_true_solar_time:
        # 确定经度（支持模糊匹配城市名）
        actual_longitude = longitude
        if actual_longitude is None:
            actual_longitude = _fuzzy_match_city_longitude(birth_place)
        if actual_longitude is not None:
            (solar_year, solar_month, solar_day,
             actual_hour, actual_minute,
             correction_minutes, detail_str) = calculate_true_solar_time(
                solar_year, solar_month, solar_day,
                birth_hour, birth_minute, actual_longitude)
            time_info["真太阳时校正"] = detail_str
            time_info["校正后时间"] = f"{solar_year}-{solar_month:02d}-{solar_day:02d} {actual_hour:02d}:{actual_minute:02d}"
            time_info["经度"] = actual_longitude
        else:
            time_info["真太阳时校正"] = "未启用（未找到出生地经度）"

    solar = Solar.fromYmdHms(solar_year, solar_month, solar_day,
                             actual_hour, actual_minute, 0)
    lunar = solar.getLunar()
    bazi = lunar.getEightChar()
    # 早子时换日：23:00-23:59 按次日日柱计算（子平法主流做法）
    # 来源：项目方法论 "默认早子时换日"
    bazi.setSect(1)

    # --- 基础四柱 ---
    year_gan = bazi.getYearGan()
    year_zhi = bazi.getYearZhi()
    month_gan = bazi.getMonthGan()
    month_zhi = bazi.getMonthZhi()
    day_gan = bazi.getDayGan()
    day_zhi = bazi.getDayZhi()
    time_gan = bazi.getTimeGan()
    time_zhi = bazi.getTimeZhi()

    day_master = day_gan  # 日主

    # --- 十神 ---
    def pillar_info(gan, zhi, position):
        """构建单柱信息"""
        gan_shishen = get_shishen(day_master, gan) if gan != day_master or position != "日柱" else "日主"
        canggan_list = []
        for cg, qi_type, days in CANGGAN.get(zhi, []):
            canggan_list.append({
                "天干": cg,
                "气类": qi_type,
                "天数": days,
                "十神": get_shishen(day_master, cg),
                "五行": WUXING_OF_TIANGAN[cg]
            })
        return {
            "天干": gan,
            "地支": zhi,
            "天干五行": WUXING_OF_TIANGAN[gan],
            "地支五行": WUXING_OF_DIZHI[zhi],
            "天干阴阳": YINYANG_OF_TIANGAN[gan],
            "天干十神": gan_shishen,
            "纳音": get_nayin(gan, zhi),
            "藏干": canggan_list
        }

    sizhu = {
        "年柱": pillar_info(year_gan, year_zhi, "年柱"),
        "月柱": pillar_info(month_gan, month_zhi, "月柱"),
        "日柱": pillar_info(day_gan, day_zhi, "日柱"),
        "时柱": pillar_info(time_gan, time_zhi, "时柱"),
    }

    # --- 五行统计（含藏干加权）---
    wuxing_score = {"木": 0, "火": 0, "土": 0, "金": 0, "水": 0}

    # 天干计分（各10分）
    for pos in ["年柱", "月柱", "日柱", "时柱"]:
        wx = sizhu[pos]["天干五行"]
        wuxing_score[wx] += 10

    # 地支本气计分（各10分，中气5分，余气3分）
    zhi_score_map = {"本气": 10, "中气": 5, "余气": 3}
    for pos in ["年柱", "月柱", "日柱", "时柱"]:
        for cg in sizhu[pos]["藏干"]:
            wuxing_score[cg["五行"]] += zhi_score_map.get(cg["气类"], 0)

    total_score = sum(wuxing_score.values())
    wuxing_percent = {k: round(v / total_score * 100, 1) for k, v in wuxing_score.items()}

    # --- 大运计算 ---
    yun = bazi.getYun(1 if gender == "男" else 0)
    start_age = yun.getStartYear()
    dayun_list = []
    for dy in yun.getDaYun():
        gz = dy.getGanZhi()
        if not gz or len(gz) < 2:
            continue  # 跳过起运前的"幼运"（空干支）
        age_start = dy.getStartAge()
        age_end = dy.getEndAge()
        dy_gan = gz[0]
        dy_zhi = gz[1]
        dayun_list.append({
            "干支": gz,
            "天干": dy_gan,
            "地支": dy_zhi,
            "天干十神": get_shishen(day_master, dy_gan),
            "地支五行": WUXING_OF_DIZHI[dy_zhi],
            "起始虚岁": age_start,
            "结束虚岁": age_end,
            "起始公历年": birth_year + age_start - 1,
            "结束公历年": birth_year + age_end - 1,
        })

    # --- 流年计算（从当前年前3年到后5年）---
    current_year = datetime.now().year
    liunian_list = []
    for year in range(current_year - 3, current_year + 6):
        ln_solar = Solar.fromYmdHms(year, 6, 15, 12, 0, 0)
        ln_lunar = ln_solar.getLunar()
        ln_bazi = ln_lunar.getEightChar()
        ln_year_gan = ln_bazi.getYearGan()
        ln_year_zhi = ln_bazi.getYearZhi()
        virtual_age = year - birth_year + 1
        liunian_list.append({
            "公历年": year,
            "干支": ln_year_gan + ln_year_zhi,
            "天干": ln_year_gan,
            "地支": ln_year_zhi,
            "天干十神": get_shishen(day_master, ln_year_gan),
            "地支五行": WUXING_OF_DIZHI[ln_year_zhi],
            "虚岁": virtual_age,
        })

    # --- 流月计算（当前年12个月）---
    liuyue_list = []
    for month in range(1, 13):
        try:
            lm_solar = Solar.fromYmdHms(current_year, month, 15, 12, 0, 0)
            lm_lunar = lm_solar.getLunar()
            lm_bazi = lm_lunar.getEightChar()
            lm_month_gan = lm_bazi.getMonthGan()
            lm_month_zhi = lm_bazi.getMonthZhi()
            liuyue_list.append({
                "公历月": f"{current_year}.{month:02d}",
                "干支": lm_month_gan + lm_month_zhi,
                "天干": lm_month_gan,
                "地支": lm_month_zhi,
                "天干十神": get_shishen(day_master, lm_month_gan),
                "地支五行": WUXING_OF_DIZHI[lm_month_zhi],
            })
        except Exception:
            pass

    # --- 月令信息 ---
    yue_ling = {
        "月支": month_zhi,
        "本气": CANGGAN[month_zhi][0][0] if month_zhi in CANGGAN else "未知",
        "本气十神": get_shishen(day_master, CANGGAN[month_zhi][0][0]) if month_zhi in CANGGAN else "未知",
        "本气五行": WUXING_OF_TIANGAN[CANGGAN[month_zhi][0][0]] if month_zhi in CANGGAN else "未知",
    }

    # --- 节气信息（精确时间 + 贴节气风险评估）---
    prev_jieqi = lunar.getPrevJieQi()
    next_jieqi = lunar.getNextJieQi()
    prev_jieqi_solar = prev_jieqi.getSolar()
    next_jieqi_solar = next_jieqi.getSolar()

    birth_dt = datetime(birth_year, birth_month, birth_day, birth_hour, birth_minute, 0)
    prev_jieqi_dt = datetime(
        prev_jieqi_solar.getYear(), prev_jieqi_solar.getMonth(), prev_jieqi_solar.getDay(),
        prev_jieqi_solar.getHour(), prev_jieqi_solar.getMinute(), prev_jieqi_solar.getSecond()
    )
    next_jieqi_dt = datetime(
        next_jieqi_solar.getYear(), next_jieqi_solar.getMonth(), next_jieqi_solar.getDay(),
        next_jieqi_solar.getHour(), next_jieqi_solar.getMinute(), next_jieqi_solar.getSecond()
    )

    gap_hours_prev = abs((birth_dt - prev_jieqi_dt).total_seconds()) / 3600
    gap_hours_next = abs((next_jieqi_dt - birth_dt).total_seconds()) / 3600
    min_gap_hours = min(gap_hours_prev, gap_hours_next)

    if min_gap_hours < 24:
        jieqi_risk = "高风险"
        jieqi_risk_desc = f"距最近节气仅{min_gap_hours:.1f}小时，如出生时间有±1小时误差月柱可能变化"
    elif min_gap_hours < 72:
        jieqi_risk = "中度风险"
        jieqi_risk_desc = f"距最近节气约{min_gap_hours:.1f}小时，如出生时间有±3天误差月柱可能变化"
    else:
        jieqi_risk = "低风险"
        jieqi_risk_desc = f"距最近节气{min_gap_hours:.1f}小时，月柱稳定"

    jieqi_info = {
        "上一节气": prev_jieqi.getName(),
        "上一节气时间": prev_jieqi_solar.toYmdHms(),
        "下一节气": next_jieqi.getName(),
        "下一节气时间": next_jieqi_solar.toYmdHms(),
        "距上一节气小时": round(gap_hours_prev, 1),
        "距下一节气小时": round(gap_hours_next, 1),
        "贴节气风险": jieqi_risk,
        "风险说明": jieqi_risk_desc,
    }

    # --- 五行逐项计分明细 ---
    wuxing_detail = {"木": [], "火": [], "土": [], "金": [], "水": []}
    tiangan_weight = 1.0
    benqi_weight_map = {"本气": 1.0, "中气": 0.5, "余气": 0.3}

    for pos_name, pos_key in [("年干", "年柱"), ("月干", "月柱"), ("日干", "日柱"), ("时干", "时柱")]:
        gan_wx = sizhu[pos_key]["天干五行"]
        gan = sizhu[pos_key]["天干"]
        wuxing_detail[gan_wx].append({
            "来源": f"{gan}({pos_name}·透干)",
            "权重": tiangan_weight,
        })

    for pos_name, pos_key in [("年支", "年柱"), ("月支", "月柱"), ("日支", "日柱"), ("时支", "时柱")]:
        is_yueling = (pos_key == "月柱")
        for cg in sizhu[pos_key]["藏干"]:
            base_weight = benqi_weight_map.get(cg["气类"], 0.3)
            weight = base_weight * (1.5 if is_yueling and cg["气类"] == "本气" else 1.0)
            wuxing_detail[cg["五行"]].append({
                "来源": f"{cg['天干']}({pos_name}·{cg['气类']}{'·月令' if is_yueling else ''})",
                "权重": round(weight, 2),
            })

    wuxing_detail_summary = {}
    for wx in ["木", "火", "土", "金", "水"]:
        items = wuxing_detail[wx]
        total = sum(item["权重"] for item in items)
        wuxing_detail_summary[wx] = {
            "明细": items,
            "合计权重": round(total, 2),
        }

    # --- 组装结果 ---
    result = {
        "命主信息": {
            "姓名": name,
            "性别": gender,
            "出生公历": f"{birth_year}年{birth_month}月{birth_day}日 {birth_hour:02d}:{birth_minute:02d}",
            "出生农历": f"{lunar.getYearInChinese()}年{lunar.getMonthInChinese()}月{lunar.getDayInChinese()} {bazi.getTimeZhi()}时",
            "出生地": birth_place,
            "生肖": lunar.getYearShengXiao(),
            "时间处理": time_info,
        },
        "四柱": sizhu,
        "日主": {
            "天干": day_master,
            "五行": WUXING_OF_TIANGAN[day_master],
            "阴阳": YINYANG_OF_TIANGAN[day_master],
        },
        "月令": yue_ling,
        "节气": jieqi_info,
        "五行统计": {
            "得分": wuxing_score,
            "百分比": wuxing_percent,
            "明细": wuxing_detail_summary,
        },
        "大运": {
            "起运虚岁": start_age,
            "大运列表": dayun_list,
        },
        "流年": liunian_list,
        "流月": liuyue_list,
    }

    return result


# ============================================================
# 命令行入口
# ============================================================

if __name__ == "__main__":
    import sys

    # 默认: 陶命 1982-10-26 17:30 女
    year, month, day, hour, minute = 1982, 10, 26, 17, 30
    sex = "女"

    if len(sys.argv) >= 6:
        year = int(sys.argv[1])
        month = int(sys.argv[2])
        day = int(sys.argv[3])
        hour = int(sys.argv[4])
        minute = int(sys.argv[5])
    if len(sys.argv) >= 7:
        sex = sys.argv[6]

    result = paipan(year, month, day, hour, minute, sex)
    print(json.dumps(result, ensure_ascii=False, indent=2))
