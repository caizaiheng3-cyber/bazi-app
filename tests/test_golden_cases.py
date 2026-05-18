"""
黄金命例库 - 引擎核心回归测试

覆盖场景：
1. 四柱排盘正确性（含子时换日、节气边界）
2. 旺衰判定方向（身旺/身弱/中和）
3. 格局判定
4. full_analysis 端到端不报错

每个命例标注：
- 来源（命理师/经典书目/已知结论）
- 预期四柱
- 预期旺衰方向
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.paipan import paipan
from engine.rules import judge_wangshuai, judge_geju, judge_yongshen, full_analysis


# ============================================================
# 黄金命例数据
# ============================================================

GOLDEN_CASES = [
    # --- 旺衰验证案例（有命理师/经典结论） ---
    {
        "id": "vincy",
        "name": "Vincy",
        "birth": (1998, 8, 9, 13, 50),
        "gender": "女",
        "expected_bazi": ("戊寅", "庚申", "戊子", "己未"),
        "expected_wangshuai": "身弱",
        "source": "命理师判定偏弱",
    },
    {
        "id": "caizhapo",
        "name": "蔡渣坡",
        "birth": (1993, 1, 21, 4, 0),
        "gender": "男",
        "expected_bazi": ("壬申", "癸丑", "壬寅", "壬寅"),
        "expected_wangshuai": "身旺",
        "source": "三比劫帮身，常理偏旺",
    },
    {
        "id": "jinhangle",
        "name": "金杭乐",
        "birth": (1984, 10, 16, 0, 0),
        "gender": "男",
        "expected_bazi": ("甲子", "甲戌", "癸未", "壬子"),
        "expected_wangshuai": "身旺",
        "source": "壬癸水透干+子水强根",
    },
    # --- 经典古籍命例（干支反推公历，有权威结论） ---
    # 来源：滴天髓阐微（任铁樵注解）/ 子平真诠 / 穷通宝鉴 / 三命通会
    # 公历日期由 Solar.fromBaZi() 反推，四柱已逐条验证通过
    {
        "id": "classic_yanshang",
        "name": "滴天髓·炎上格",
        "birth": (1906, 7, 1, 12, 0),
        "gender": "男",
        "expected_bazi": ("丙午", "甲午", "丙午", "甲午"),
        "expected_wangshuai": "身旺",
        "source": "滴天髓阐微·从象章·四柱皆刃，炎上格从强论",
    },
    {
        "id": "classic_quzhi",
        "name": "滴天髓·曲直格",
        "birth": (1925, 4, 1, 22, 0),
        "gender": "男",
        "expected_bazi": ("乙丑", "己卯", "乙卯", "丁亥"),
        "expected_wangshuai": "身旺",
        "source": "滴天髓阐微·体用章·曲直格，木气专旺",
    },
    {
        "id": "classic_jinshui_shangguan",
        "name": "滴天髓·金水伤官",
        "birth": (1940, 12, 23, 12, 0),
        "gender": "男",
        "expected_bazi": ("庚辰", "戊子", "庚子", "壬午"),
        "expected_wangshuai": "身弱",
        "source": "滴天髓阐微·源流章·金水伤官喜见官（子月水旺泄金，打分法偏弱）",
    },
    {
        "id": "classic_sha_zhong",
        "name": "滴天髓·杀重身轻",
        "birth": (1958, 12, 27, 0, 0),
        "gender": "男",
        "expected_bazi": ("戊戌", "甲子", "戊寅", "壬子"),
        "expected_wangshuai": "身弱",
        "source": "滴天髓阐微·通变章·杀重身轻，身弱用印",
    },
    {
        "id": "classic_zhengguan",
        "name": "滴天髓·正官格",
        "birth": (1954, 1, 11, 4, 0),
        "gender": "男",
        "expected_bazi": ("癸巳", "乙丑", "丁卯", "壬寅"),
        "expected_wangshuai": "身弱",
        "source": "滴天髓阐微·官杀章·正官格成格，官印相生",
    },
    {
        "id": "classic_runxia",
        "name": "滴天髓·润下格",
        "birth": (1953, 1, 1, 4, 0),
        "gender": "男",
        "expected_bazi": ("壬辰", "壬子", "壬子", "壬寅"),
        "expected_wangshuai": "身旺",
        "source": "滴天髓阐微·形象章·润下格，水气专旺",
    },
    {
        "id": "classic_shishen",
        "name": "子平真诠·食神格",
        "birth": (1905, 1, 26, 0, 0),
        "gender": "男",
        "expected_bazi": ("甲辰", "丁丑", "乙丑", "丙子"),
        "expected_wangshuai": "身弱",
        "source": "子平真诠·论食神·食神格，食神生财",
    },
    {
        "id": "classic_tiaohuo",
        "name": "穷通宝鉴·甲木冬生",
        "birth": (1924, 12, 11, 0, 0),
        "gender": "男",
        "expected_bazi": ("甲子", "丙子", "甲子", "甲子"),
        "expected_wangshuai": "身旺",
        "source": "穷通宝鉴·甲木十一月·调候急需丙火暖局",
    },
    {
        "id": "classic_jianlu",
        "name": "三命通会·建禄格",
        "birth": (2022, 3, 2, 0, 0),
        "gender": "男",
        "expected_bazi": ("壬寅", "壬寅", "甲寅", "甲子"),
        "expected_wangshuai": "身旺",
        "source": "三命通会·建禄格·比劫当令",
    },
    {
        "id": "classic_congcai",
        "name": "滴天髓·从财格",
        "birth": (1928, 3, 4, 4, 0),
        "gender": "男",
        "expected_bazi": ("戊辰", "甲寅", "癸卯", "甲寅"),
        "expected_wangshuai": "身弱",
        "source": "滴天髓·从象章·从财格，日主无根从财",
    },
    # --- 女命案例（女性用户占多数，重点覆盖） ---
    {
        "id": "female_weak_caiguan",
        "name": "女命·身弱财官旺",
        "birth": (1920, 1, 8, 0, 0),
        "gender": "女",
        "expected_bazi": ("己未", "丁丑", "乙丑", "丙子"),
        "expected_wangshuai": "身弱",
        "source": "乙木冬生丑月，财官旺身弱，典型女命身弱格局",
    },
    {
        "id": "female_shangguan_jianguan",
        "name": "女命·伤官见官",
        "birth": (1974, 12, 16, 4, 0),
        "gender": "女",
        "expected_bazi": ("甲寅", "丙子", "辛卯", "庚寅"),
        "expected_wangshuai": "身弱",
        "source": "辛金日主见丙火正官+甲木伤官，伤官见官女命大忌",
    },
    {
        "id": "female_shishen_zhisha",
        "name": "女命·食神制杀",
        "birth": (1990, 12, 25, 6, 0),
        "gender": "女",
        "expected_bazi": ("庚午", "戊子", "甲子", "丁卯"),
        "expected_wangshuai": "身旺",
        "source": "甲木日主身旺，庚金七杀被丁火食神制，女命吉格",
    },
    {
        "id": "female_conger",
        "name": "女命·从儿格",
        "birth": (1905, 1, 14, 10, 0),
        "gender": "女",
        "expected_bazi": ("甲辰", "丁丑", "癸丑", "丁巳"),
        "expected_wangshuai": "身弱",
        "source": "癸水日主食伤火旺，从儿格，子女缘厚",
    },
    {
        "id": "female_strong_noguan",
        "name": "女命·身旺无官",
        "birth": (1974, 3, 4, 0, 0),
        "gender": "女",
        "expected_bazi": ("甲寅", "丙寅", "甲辰", "甲子"),
        "expected_wangshuai": "身旺",
        "source": "甲木三透+寅月当令，身旺无官星，婚姻迟或独身标志",
    },
    {
        "id": "female_caiwang_shengguan",
        "name": "女命·财旺生官",
        "birth": (1954, 3, 15, 2, 0),
        "gender": "女",
        "expected_bazi": ("甲午", "丁卯", "庚午", "丁丑"),
        "expected_wangshuai": "身弱",
        "source": "庚金日主木火旺盛，财旺生官旺夫格局",
    },
    {
        "id": "female_zhengguan",
        "name": "女命·正官格",
        "birth": (1985, 1, 7, 10, 0),
        "gender": "女",
        "expected_bazi": ("甲子", "丁丑", "丙午", "癸巳"),
        "expected_wangshuai": "身旺",
        "source": "丙火日主见癸水正官，官印相生女命佳格",
    },
    {
        "id": "female_guansha_hunza",
        "name": "女命·官杀混杂",
        "birth": (1975, 1, 12, 4, 0),
        "gender": "女",
        "expected_bazi": ("甲寅", "丁丑", "戊午", "甲寅"),
        "expected_wangshuai": "身旺",
        "source": "戊土日主甲木正官+寅中甲木，官杀混杂感情复杂",
    },
    {
        "id": "female_yinwang",
        "name": "女命·印旺",
        "birth": (1981, 2, 3, 4, 0),
        "gender": "女",
        "expected_bazi": ("庚申", "己丑", "壬子", "壬寅"),
        "expected_wangshuai": "身旺",
        "source": "壬水日主金旺生水印旺，印旺克食伤子女缘薄",
    },
    {
        "id": "female_bijie_zhengfu",
        "name": "女命·比劫争夫",
        "birth": (1972, 12, 17, 4, 0),
        "gender": "女",
        "expected_bazi": ("壬子", "壬子", "壬午", "壬寅"),
        "expected_wangshuai": "身旺",
        "source": "四壬透干+两子水比劫旺，争夺官星婚姻波折",
    },
    {
        "id": "female_shishang_xiexiu",
        "name": "女命·食伤泄秀",
        "birth": (1988, 2, 21, 0, 0),
        "gender": "女",
        "expected_bazi": ("戊辰", "甲寅", "丙午", "戊子"),
        "expected_wangshuai": "身旺",
        "source": "丙火日主戊土食神泄秀，聪慧型女命",
    },
    {
        "id": "female_yangren",
        "name": "女命·阳刃格",
        "birth": (1966, 2, 27, 4, 0),
        "gender": "女",
        "expected_bazi": ("丙午", "庚寅", "丁巳", "壬寅"),
        "expected_wangshuai": "身旺",
        "source": "丁火日主坐巳阳刃格，性格刚烈婚姻波折",
    },
    # --- 女命案例·第二批（更多命理场景覆盖） ---
    {
        "id": "female_congfu",
        "name": "女命·从夫格",
        "birth": (1954, 3, 16, 18, 0),
        "gender": "女",
        "expected_bazi": ("甲午", "丁卯", "辛未", "丁酉"),
        "expected_wangshuai": "身弱",
        "source": "辛金日主木火旺盛，从夫格嫁贵夫经典标志",
    },
    {
        "id": "female_shangguan_peiyin",
        "name": "女命·伤官佩印",
        "birth": (2021, 12, 24, 2, 0),
        "gender": "女",
        "expected_bazi": ("辛丑", "庚子", "丙午", "己丑"),
        "expected_wangshuai": "身弱",
        "source": "丙火日主冬生子月，伤官佩印聪明但需约束型",
    },
    {
        "id": "female_bijie_bangshen",
        "name": "女命·比劫帮身",
        "birth": (1992, 12, 2, 2, 0),
        "gender": "女",
        "expected_bazi": ("壬申", "辛亥", "壬子", "辛丑"),
        "expected_wangshuai": "身旺",
        "source": "壬水日主印比旺盛，比劫帮身制财职业女性型",
    },
    {
        "id": "female_zhengcai_weak",
        "name": "女命·正财身弱",
        "birth": (1923, 12, 11, 0, 0),
        "gender": "女",
        "expected_bazi": ("癸亥", "甲子", "戊午", "壬子"),
        "expected_wangshuai": "身弱",
        "source": "戊土日主水旺身弱，贤妻良母型但操劳",
    },
    {
        "id": "female_zhengyin",
        "name": "女命·正印格",
        "birth": (2012, 12, 30, 22, 0),
        "gender": "女",
        "expected_bazi": ("壬辰", "壬子", "乙丑", "丁亥"),
        "expected_wangshuai": "身弱",
        "source": "乙木日主冬生水旺，正印格有靠山有福气型",
    },
    # --- 女命案例·第三批（现代女性最关心的场景） ---
    {
        "id": "female_zhengguan_zhengyin",
        "name": "女命·正官正印",
        "birth": (1988, 3, 6, 22, 0),
        "gender": "女",
        "expected_bazi": ("戊辰", "乙卯", "庚申", "丁亥"),
        "expected_wangshuai": "身弱",
        "source": "庚金日主乙木正官+印星，传统好命贤妻良母+有靠山",
    },
    {
        "id": "female_qisha_peiyin",
        "name": "女命·七杀配印",
        "birth": (2014, 12, 25, 2, 0),
        "gender": "女",
        "expected_bazi": ("甲午", "丙子", "庚午", "丁丑"),
        "expected_wangshuai": "身弱",
        "source": "庚金日主火旺七杀攻身有印化杀，事业型女强人",
    },
    {
        "id": "female_fuxing_rumu",
        "name": "女命·夫星入墓",
        "birth": (1976, 2, 19, 4, 0),
        "gender": "女",
        "expected_bazi": ("丙辰", "庚寅", "辛丑", "庚寅"),
        "expected_wangshuai": "身弱",
        "source": "辛金日主丙火正官入辰墓，婚姻有阻",
    },
    {
        "id": "female_shishen_shengcai",
        "name": "女命·食神生财",
        "birth": (1924, 3, 16, 8, 0),
        "gender": "女",
        "expected_bazi": ("甲子", "丁卯", "甲午", "戊辰"),
        "expected_wangshuai": "身旺",
        "source": "甲木身旺食神生财，善于创造财富经商有道",
    },
    {
        "id": "female_guanyin_shenwang",
        "name": "女命·官印相生身旺",
        "birth": (1904, 12, 14, 4, 0),
        "gender": "女",
        "expected_bazi": ("甲辰", "丙子", "壬午", "壬寅"),
        "expected_wangshuai": "身旺",
        "source": "壬水日主身旺官印相生，体制内有发展",
    },
    {
        "id": "female_caiku",
        "name": "女命·财库",
        "birth": (1988, 12, 21, 2, 0),
        "gender": "女",
        "expected_bazi": ("戊辰", "甲子", "庚戌", "丁丑"),
        "expected_wangshuai": "身弱",
        "source": "庚金日主辰戌丑三库齐备，财库大开",
    },
    {
        "id": "female_piancai_wang",
        "name": "女命·偏财旺",
        "birth": (1954, 3, 13, 4, 0),
        "gender": "女",
        "expected_bazi": ("甲午", "丁卯", "戊辰", "甲寅"),
        "expected_wangshuai": "身弱",
        "source": "戊土日主木旺偏财多，善投资理财",
    },
    {
        "id": "female_shishang_shizhu",
        "name": "女命·时柱食伤旺",
        "birth": (1972, 12, 29, 6, 0),
        "gender": "女",
        "expected_bazi": ("壬子", "壬子", "甲午", "丁卯"),
        "expected_wangshuai": "身旺",
        "source": "甲木身旺时柱丁卯食伤旺，子女有出息",
    },
    {
        "id": "female_jinshui_tihan",
        "name": "女命·金水旺体寒",
        "birth": (1920, 12, 9, 4, 0),
        "gender": "女",
        "expected_bazi": ("庚申", "戊子", "辛丑", "庚寅"),
        "expected_wangshuai": "身旺",
        "source": "辛金日主金水旺盛，聪明伶俐但体寒注意妇科",
    },
    {
        "id": "female_muhuo_tongming",
        "name": "女命·木火通明",
        "birth": (1914, 2, 10, 4, 0),
        "gender": "女",
        "expected_bazi": ("甲寅", "丙寅", "丁卯", "壬寅"),
        "expected_wangshuai": "身旺",
        "source": "丁火日主木火通明，文采好颜值高个性开朗",
    },
    {
        "id": "female_zaonian_wannian",
        "name": "女命·早年晚年俱佳",
        "birth": (1954, 12, 28, 10, 0),
        "gender": "女",
        "expected_bazi": ("甲午", "丙子", "戊午", "丁巳"),
        "expected_wangshuai": "身弱",
        "source": "年柱偏财+时柱食伤，早年家境好晚年子女孝顺",
    },
    # --- 节气边界补充 ---
    {
        "id": "jingzhe_boundary",
        "name": "惊蛰边界·已过",
        "birth": (2024, 3, 31, 0, 0),
        "gender": "男",
        "expected_bazi": ("甲辰", "丁卯", "甲午", "甲子"),
        "expected_wangshuai": "身旺",
        "source": "惊蛰后属卯月，验证月柱正确切换",
    },
    {
        "id": "mangzhong_boundary",
        "name": "芒种边界·已过",
        "birth": (1954, 6, 7, 0, 0),
        "gender": "男",
        "expected_bazi": ("甲午", "庚午", "甲午", "甲子"),
        "expected_wangshuai": "身弱",
        "source": "芒种后属午月，验证月柱正确切换",
    },
    # --- 缺口格局补充 ---
    {
        "id": "classic_jiase",
        "name": "稼穑格·土专旺",
        "birth": (1988, 6, 12, 12, 0),
        "gender": "男",
        "expected_bazi": ("戊辰", "戊午", "戊戌", "戊午"),
        "expected_wangshuai": "身旺",
        "source": "四戊透干辰戌午土局，稼穑格土气专旺",
    },
    {
        "id": "classic_huaqi",
        "name": "化气格·甲己化土",
        "birth": (2014, 6, 2, 10, 0),
        "gender": "男",
        "expected_bazi": ("甲午", "己巳", "甲辰", "己巳"),
        "expected_wangshuai": "身弱",
        "source": "甲己合化土巳午火生土，化气格",
    },
    {
        "id": "classic_congguan",
        "name": "从官格·官杀重",
        "birth": (1942, 7, 11, 22, 0),
        "gender": "男",
        "expected_bazi": ("壬午", "丁未", "乙丑", "丁亥"),
        "expected_wangshuai": "身弱",
        "source": "乙木日主火土旺盛官杀重，从官格",
    },
    {
        "id": "classic_congsha",
        "name": "从杀格·火克金",
        "birth": (2014, 2, 28, 0, 0),
        "gender": "男",
        "expected_bazi": ("甲午", "丙寅", "庚午", "丙子"),
        "expected_wangshuai": "身弱",
        "source": "庚金日主寅午火局杀旺，从杀格",
    },
    # --- 子时换日验证 ---
    {
        "id": "zishi_huanri",
        "name": "子时换日测试",
        "birth": (1990, 6, 15, 23, 30),
        "gender": "男",
        "expected_bazi": ("庚午", "壬午", "壬子", "庚子"),
        "expected_wangshuai": None,  # 不验证旺衰
        "source": "子时换日：23:30应按次日日柱",
    },
    {
        "id": "haishi_no_change",
        "name": "亥时不换日测试",
        "birth": (1990, 6, 15, 22, 30),
        "gender": "男",
        "expected_bazi": ("庚午", "壬午", "辛亥", "己亥"),
        "expected_wangshuai": None,
        "source": "亥时22:30不应换日",
    },
    # --- 典型身旺案例 ---
    {
        "id": "strong_water",
        "name": "水旺测试",
        "birth": (1972, 12, 7, 0, 0),
        "gender": "男",
        "expected_bazi": None,  # 不验证四柱（只验旺衰方向）
        "expected_wangshuai": None,
        "source": "待补充",
    },
    # --- 典型身弱案例 ---
    {
        "id": "weak_metal",
        "name": "金弱测试",
        "birth": (1990, 6, 15, 12, 0),
        "gender": "男",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "待补充",
    },
    # --- 节气边界：立春换年柱 ---
    {
        "id": "lichun_before",
        "name": "立春前一天(仍属上一年)",
        "birth": (1990, 2, 3, 12, 0),
        "gender": "男",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "expected_year_gan": "己",  # 1989年己巳年
        "source": "1990立春约2月4日，2月3日仍属己巳年",
    },
    {
        "id": "lichun_after",
        "name": "立春后(属新年)",
        "birth": (1990, 2, 5, 12, 0),
        "gender": "男",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "expected_year_gan": "庚",  # 1990年庚午年
        "source": "1990立春后属庚午年",
    },
    # --- 端到端稳定性案例（只验证不报错） ---
    {
        "id": "stability_1",
        "name": "稳定性1",
        "birth": (1985, 3, 20, 6, 0),
        "gender": "女",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错",
    },
    {
        "id": "stability_2",
        "name": "稳定性2",
        "birth": (2000, 1, 1, 8, 0),
        "gender": "男",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错",
    },
    {
        "id": "stability_3",
        "name": "稳定性3",
        "birth": (1975, 7, 15, 18, 30),
        "gender": "女",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错",
    },
    {
        "id": "stability_4",
        "name": "稳定性4",
        "birth": (1960, 11, 28, 3, 0),
        "gender": "男",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错",
    },
    {
        "id": "stability_5",
        "name": "稳定性5",
        "birth": (2010, 5, 5, 15, 0),
        "gender": "女",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错",
    },
    {
        "id": "stability_6",
        "name": "稳定性6",
        "birth": (1945, 8, 15, 9, 0),
        "gender": "男",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错",
    },
    {
        "id": "stability_7",
        "name": "稳定性7",
        "birth": (2023, 12, 22, 0, 0),
        "gender": "女",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错·冬至子时",
    },
    {
        "id": "stability_8",
        "name": "稳定性8",
        "birth": (1988, 9, 8, 23, 59),
        "gender": "男",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错·23:59子时边界",
    },
    {
        "id": "stability_9",
        "name": "稳定性9",
        "birth": (1995, 4, 5, 5, 30),
        "gender": "女",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错·清明节气边界",
    },
    {
        "id": "stability_10",
        "name": "稳定性10",
        "birth": (2005, 6, 21, 11, 0),
        "gender": "男",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错·夏至",
    },
    {
        "id": "stability_11",
        "name": "稳定性11",
        "birth": (1900, 1, 31, 12, 0),
        "gender": "男",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错·1900年边界",
    },
    {
        "id": "stability_12",
        "name": "稳定性12",
        "birth": (2050, 6, 15, 12, 0),
        "gender": "女",
        "expected_bazi": None,
        "expected_wangshuai": None,
        "source": "端到端不报错·2050年未来",
    },
]


# ============================================================
# 辅助函数
# ============================================================

def get_bazi_str(paipan_data: dict) -> tuple:
    """从排盘结果提取四柱字符串元组"""
    sizhu = paipan_data["四柱"]
    return (
        sizhu["年柱"]["天干"] + sizhu["年柱"]["地支"],
        sizhu["月柱"]["天干"] + sizhu["月柱"]["地支"],
        sizhu["日柱"]["天干"] + sizhu["日柱"]["地支"],
        sizhu["时柱"]["天干"] + sizhu["时柱"]["地支"],
    )


# ============================================================
# 测试用例
# ============================================================

class TestPaipanAccuracy:
    """排盘四柱正确性验证"""

    @pytest.mark.parametrize("case", [c for c in GOLDEN_CASES if c.get("expected_bazi")],
                             ids=[c["id"] for c in GOLDEN_CASES if c.get("expected_bazi")])
    def test_bazi_accuracy(self, case):
        """验证四柱排盘结果与预期一致"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        actual = get_bazi_str(r)
        assert actual == case["expected_bazi"], (
            f'{case["name"]}({case["id"]}): '
            f'实际{"/".join(actual)} != 预期{"/".join(case["expected_bazi"])}'
        )

    @pytest.mark.parametrize("case", [c for c in GOLDEN_CASES if c.get("expected_year_gan")],
                             ids=[c["id"] for c in GOLDEN_CASES if c.get("expected_year_gan")])
    def test_year_gan_boundary(self, case):
        """验证节气边界年干正确"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        actual_year_gan = r["四柱"]["年柱"]["天干"]
        assert actual_year_gan == case["expected_year_gan"], (
            f'{case["name"]}({case["id"]}): '
            f'年干实际={actual_year_gan} != 预期={case["expected_year_gan"]}'
        )


class TestWangshuaiDirection:
    """旺衰判定方向验证"""

    @pytest.mark.parametrize("case", [c for c in GOLDEN_CASES if c.get("expected_wangshuai")],
                             ids=[c["id"] for c in GOLDEN_CASES if c.get("expected_wangshuai")])
    def test_wangshuai_direction(self, case):
        """验证旺衰判定方向与预期一致"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        expected = case["expected_wangshuai"]
        actual = ws["结论"]
        assert actual == expected, (
            f'{case["name"]}({case["id"]}): '
            f'旺衰实际={actual}·{ws["程度"]}(日主{ws["总分"]:.1f},ratio={ws["旺衰比"]:.3f}) '
            f'!= 预期={expected} | 来源: {case["source"]}'
        )


class TestFullAnalysisStability:
    """full_analysis 端到端稳定性验证（不报错即通过）"""

    @pytest.mark.parametrize("case", GOLDEN_CASES,
                             ids=[c["id"] for c in GOLDEN_CASES])
    def test_full_analysis_no_error(self, case):
        """验证 full_analysis 对所有命例不报错"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        result = full_analysis(r, gender=case["gender"])
        # 基本结构校验
        assert "旺衰" in result
        assert "格局" in result
        assert "推演文本" in result
        assert result["旺衰"]["结论"] in ("身旺", "身弱", "中和")
        assert result["旺衰"]["总分"] > 0
        assert result["格局"]["格局"] != "未知"


class TestZishiHuanri:
    """子时换日专项验证"""

    def test_2330_next_day(self):
        """23:30应按次日日柱"""
        r1 = paipan(1990, 6, 15, 23, 30, "男", name="子时测试")
        r2 = paipan(1990, 6, 16, 0, 30, "男", name="次日子时")
        assert r1["四柱"]["日柱"]["天干"] == r2["四柱"]["日柱"]["天干"]
        assert r1["四柱"]["日柱"]["地支"] == r2["四柱"]["日柱"]["地支"]

    def test_2230_same_day(self):
        """22:30不应换日"""
        r1 = paipan(1990, 6, 15, 22, 30, "男", name="亥时测试")
        r2 = paipan(1990, 6, 15, 23, 30, "男", name="子时测试")
        assert r1["四柱"]["日柱"]["天干"] != r2["四柱"]["日柱"]["天干"]


# ============================================================
# 格局判定验证
# ============================================================

# 格局验证命例数据
# 每个案例标注：预期格局名称、预期成败、经典依据
GEJU_CASES = [
    # --- 正格·食神格 ---
    {
        "id": "geju_shishen",
        "name": "Vincy",
        "birth": (1998, 8, 9, 13, 50),
        "gender": "女",
        "expected_geju": "食神格",
        "expected_chengbai": "成格",
        "source": "日主戊土，月支申本气庚(食神)透干，无枭神夺食",
    },
    # --- 正格·正官格(成格) ---
    {
        "id": "geju_zhengguan_cheng",
        "name": "蔡渣坡",
        "birth": (1993, 1, 21, 4, 0),
        "gender": "男",
        "expected_geju": "正官格",
        "expected_chengbai": "成格",
        "source": "日主壬水，月支丑本气己(正官)，藏干均不透以本气定格，无伤官无杀混",
    },
    # --- 正格·正官格(败格) ---
    {
        "id": "geju_zhengguan_bai",
        "name": "金杭乐",
        "birth": (1984, 10, 16, 0, 0),
        "gender": "男",
        "expected_geju": "正官格",
        "expected_chengbai": "败格",
        "source": "日主癸水，月支戌本气戊(正官)定格，甲木伤官透干无印护→伤官见官败格",
    },
    # --- 正格·羊刃格 ---
    {
        "id": "geju_yangren",
        "name": "羊刃格·庚酉",
        "birth": (1973, 10, 1, 10, 0),
        "gender": "男",
        "expected_geju": "羊刃格",
        "expected_chengbai": None,  # 不强制验证成败
        "source": "日主庚金(癸丑/辛酉/庚午/辛巳)，月支酉为庚之刃位",
    },
    # --- 正格·建禄格 ---
    {
        "id": "geju_jianlu",
        "name": "建禄格·壬亥",
        "birth": (1982, 11, 15, 10, 0),
        "gender": "男",
        "expected_geju": "建禄格",
        "expected_chengbai": None,
        "source": "日主壬水，月支亥为壬之禄位",
    },
    # --- 外格·从儿格 ---
    {
        "id": "geju_conger",
        "name": "从儿格",
        "birth": (1985, 3, 15, 6, 0),
        "gender": "女",
        "expected_geju": "从儿格",
        "expected_chengbai": "成格",
        "source": "日主极弱无根无印比，食伤当旺从之",
    },
]


class TestGejuJudgment:
    """格局判定正确性验证"""

    @pytest.fixture(params=[c for c in GEJU_CASES], ids=[c["id"] for c in GEJU_CASES])
    def geju_case(self, request):
        return request.param

    def test_geju_name(self, geju_case):
        """格局名称是否正确"""
        case = geju_case
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        geju = judge_geju(r, ws)
        assert geju["格局"] == case["expected_geju"], (
            f"{case['name']}: 期望{case['expected_geju']}，实际{geju['格局']}。依据: {geju['依据']}"
        )

    def test_geju_chengbai(self, geju_case):
        """格局成败是否正确（仅验证有预期值的案例）"""
        case = geju_case
        if case["expected_chengbai"] is None:
            pytest.skip("此案例不验证成败")
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        geju = judge_geju(r, ws)
        assert geju["成败"] == case["expected_chengbai"], (
            f"{case['name']}: 期望{case['expected_chengbai']}，实际{geju['成败']}。依据: {geju['成败依据']}"
        )


class TestGejuOutputContract:
    """格局输出契约验证：确保所有命例都返回完整字段"""

    @pytest.fixture(params=[c for c in GOLDEN_CASES[:5]], ids=[c["id"] for c in GOLDEN_CASES[:5]])
    def case(self, request):
        return request.param

    def test_geju_fields_complete(self, case):
        """格局结果应包含所有必要字段"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        geju = judge_geju(r, ws)
        required_fields = ["格局", "格局类型", "定格十神", "依据", "成败", "层次"]
        for field in required_fields:
            assert field in geju, f"缺少字段: {field}"

    def test_geju_values_valid(self, case):
        """格局字段值应在合法范围内"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        geju = judge_geju(r, ws)
        assert geju["格局"] != "未知"
        assert geju["成败"] in ("成格", "败格")
        assert geju["层次"] in ("清", "浊", "破")


# ============================================================
# 用神判定验证
# ============================================================

YONGSHEN_CASES = [
    # --- 食神格·身弱·格局用神为财星 ---
    {
        "id": "ys_shishen_weak",
        "name": "Vincy",
        "birth": (1998, 8, 9, 13, 50),
        "gender": "女",
        "expected_method": "格局护格",
        "expected_first_yongshen_shishen": "正财",
        "expected_first_jishen_shishen": "偏印",
        "source": "食神格用财(子平真诠)，忌枭夺食",
    },
    # --- 正官格·身旺·格局用神为印星 ---
    {
        "id": "ys_zhengguan_strong",
        "name": "蔡渣坡",
        "birth": (1993, 1, 21, 4, 0),
        "gender": "男",
        "expected_method": "格局护格",
        "expected_first_yongshen_shishen": "正印",
        "expected_first_jishen_shishen": "伤官",
        "source": "正官格用印护官(子平真诠)，忌伤官",
    },
    # --- 正官格·败格·病药法 ---
    {
        "id": "ys_zhengguan_bai",
        "name": "金杭乐",
        "birth": (1984, 10, 16, 0, 0),
        "gender": "男",
        "expected_method": "病药（败格需去病）",
        "expected_first_yongshen_shishen": "正印",
        "expected_first_jishen_shishen": "伤官",
        "source": "正官格败格，病为伤官，药为印星(子平真诠)",
    },
    # --- 从儿格·顺势取用 ---
    {
        "id": "ys_conger",
        "name": "从儿格",
        "birth": (1985, 3, 15, 6, 0),
        "gender": "女",
        "expected_method": "从格顺势",
        "expected_first_yongshen_shishen": "食神",
        "expected_first_jishen_shishen": "正印",
        "source": "从儿格顺食伤旺神(滴天髓)，忌印星逆势",
    },
    # --- 羊刃格·格局用神为官杀制刃 ---
    {
        "id": "ys_yangren",
        "name": "羊刃格·庚酉",
        "birth": (1973, 10, 1, 10, 0),
        "gender": "男",
        "expected_method": "格局护格",
        "expected_first_yongshen_shishen": "正官",
        "expected_first_jishen_shishen": "比肩",
        "source": "羊刃格用官杀制刃(子平真诠)，忌比劫",
    },
]


class TestYongshenJudgment:
    """用神判定正确性验证"""

    @pytest.fixture(params=YONGSHEN_CASES, ids=[c["id"] for c in YONGSHEN_CASES])
    def ys_case(self, request):
        return request.param

    def test_yongshen_method(self, ys_case):
        """取用法是否正确"""
        case = ys_case
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        geju = judge_geju(r, ws)
        ys = judge_yongshen(r, ws, geju)
        assert ys["取用法"] == case["expected_method"], (
            f"{case['name']}: 期望取用法={case['expected_method']}，实际={ys['取用法']}"
        )

    def test_first_yongshen(self, ys_case):
        """第一用神十神是否正确"""
        case = ys_case
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        geju = judge_geju(r, ws)
        ys = judge_yongshen(r, ws, geju)
        first = ys["用神"][0]["十神"] if ys["用神"] else ""
        assert first == case["expected_first_yongshen_shishen"], (
            f"{case['name']}: 期望首用神={case['expected_first_yongshen_shishen']}，实际={first}"
        )

    def test_first_jishen(self, ys_case):
        """第一忌神十神是否正确"""
        case = ys_case
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        geju = judge_geju(r, ws)
        ys = judge_yongshen(r, ws, geju)
        first_ji = ys["忌神"][0]["十神"] if ys["忌神"] else ""
        assert first_ji == case["expected_first_jishen_shishen"], (
            f"{case['name']}: 期望首忌神={case['expected_first_jishen_shishen']}，实际={first_ji}"
        )


class TestYongshenOutputContract:
    """用神输出契约验证：确保所有命例都返回完整字段"""

    @pytest.fixture(params=GOLDEN_CASES[:8], ids=[c["id"] for c in GOLDEN_CASES[:8]])
    def case(self, request):
        return request.param

    def test_yongshen_fields_complete(self, case):
        """用神结果应包含所有必要字段"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        geju = judge_geju(r, ws)
        ys = judge_yongshen(r, ws, geju)
        required_fields = ["用神", "忌神", "取用法", "调候"]
        for field in required_fields:
            assert field in ys, f"缺少字段: {field}"
        assert len(ys["用神"]) >= 1, "用神列表不能为空"

    def test_yongshen_item_fields(self, case):
        """用神条目应包含五行/十神/优先级/理由"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        geju = judge_geju(r, ws)
        ys = judge_yongshen(r, ws, geju)
        for item in ys["用神"]:
            assert "五行" in item, "用神条目缺少五行"
            assert "十神" in item, "用神条目缺少十神"
            assert "优先级" in item, "用神条目缺少优先级"
            assert "理由" in item, "用神条目缺少理由"
            assert item["五行"] in ("木", "火", "土", "金", "水"), f"无效五行: {item['五行']}"

    def test_tiaohuo_present(self, case):
        """调候用神应有急需度和来源"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        ws = judge_wangshuai(r)
        geju = judge_geju(r, ws)
        ys = judge_yongshen(r, ws, geju)
        assert "急需度" in ys["调候"]
        assert ys["调候"]["急需度"] in ("高", "中", "低")
        assert "来源" in ys["调候"]


# ============================================================
# P2-1: 合冲刑害力量判断测试
# ============================================================

HECHONG_CASES = [
    {
        "name": "Vincy",
        "birth": (1998, 8, 9, 13, 50),
        "gender": "女",
        "expected_liuchong": [{"地支包含": "寅申冲", "胜方": "申"}],
        "expected_liuhe": [],
        "expected_tianganhe": [],
    },
    {
        "name": "合化测试·午未合",
        "birth": (1985, 3, 20, 14, 0),
        "gender": "女",
        "expected_liuhe": [{"地支包含": "午未合", "远近": "紧邻"}],
        "expected_liuchong": [{"地支包含": "丑未冲"}],
        "expected_tianganhe": [],
    },
]


class TestRelationshipsV2:
    """合冲刑害 v2 力量判断测试"""

    @pytest.mark.parametrize("case", HECHONG_CASES, ids=[c["name"] for c in HECHONG_CASES])
    def test_liuchong_winner(self, case):
        """六冲胜负判定"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        result = full_analysis(r, gender=case["gender"])
        rel = result["合冲刑害"]

        for expected in case["expected_liuchong"]:
            found = False
            for item in rel["六冲"]:
                if expected["地支包含"] in item["地支"]:
                    found = True
                    # 验证有力量判断字段
                    assert "远近" in item, "六冲缺少远近字段"
                    assert "力量" in item, "六冲缺少力量字段"
                    assert "胜方" in item, "六冲缺少胜方字段"
                    assert "来源" in item, "六冲缺少来源字段"
                    # 验证胜方
                    if "胜方" in expected:
                        assert item["胜方"] == expected["胜方"], \
                            f"期望胜方{expected['胜方']}，实际{item['胜方']}"
            assert found, f"未找到预期的六冲: {expected['地支包含']}"

    @pytest.mark.parametrize("case", HECHONG_CASES, ids=[c["name"] for c in HECHONG_CASES])
    def test_liuhe_fields(self, case):
        """六合力量判断字段完整性"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        result = full_analysis(r, gender=case["gender"])
        rel = result["合冲刑害"]

        for expected in case["expected_liuhe"]:
            found = False
            for item in rel["六合"]:
                if expected["地支包含"] in item["地支"]:
                    found = True
                    assert "远近" in item, "六合缺少远近字段"
                    assert "力量" in item, "六合缺少力量字段"
                    assert "是否化成" in item, "六合缺少是否化成字段"
                    assert "效应" in item, "六合缺少效应字段"
                    assert "来源" in item, "六合缺少来源字段"
                    if "远近" in expected:
                        assert item["远近"] == expected["远近"]
            if case["expected_liuhe"]:
                assert found, f"未找到预期的六合: {expected['地支包含']}"


class TestRelationshipsOutputContract:
    """合冲刑害输出契约测试（P1-3 规则契约要求）"""

    @pytest.mark.parametrize("case", GOLDEN_CASES[:5], ids=[c["name"] for c in GOLDEN_CASES[:5]])
    def test_relationships_have_metadata(self, case):
        """每条合冲结果应有来源/力量字段"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        result = full_analysis(r, gender=case["gender"])
        rel = result["合冲刑害"]

        for item in rel.get("六冲", []):
            assert "远近" in item
            assert "力量" in item
            assert "来源" in item
            assert "胜方" in item
            assert item["力量"] in ("强", "中", "弱")

        for item in rel.get("六合", []):
            assert "远近" in item
            assert "力量" in item
            assert "是否化成" in item
            assert "来源" in item

        for item in rel.get("天干合", []):
            assert "远近" in item
            assert "力量" in item
            assert "是否化成" in item
            assert "来源" in item

    @pytest.mark.parametrize("case", GOLDEN_CASES[:5], ids=[c["name"] for c in GOLDEN_CASES[:5]])
    def test_yongshen_impact_annotated(self, case):
        """合冲结果应有用神影响标注"""
        year, month, day, hour, minute = case["birth"]
        r = paipan(year, month, day, hour, minute, case["gender"], name=case["name"])
        result = full_analysis(r, gender=case["gender"])
        rel = result["合冲刑害"]

        for item in rel.get("六冲", []):
            assert "用神影响" in item, "六冲缺少用神影响标注"

        for item in rel.get("六合", []):
            assert "用神影响" in item, "六合缺少用神影响标注"

        for item in rel.get("天干合", []):
            assert "用神影响" in item, "天干合缺少用神影响标注"


# ============================================================
# P2-2: 真太阳时/农历/城市时区测试
# ============================================================

from engine.paipan import calculate_true_solar_time, lunar_to_solar, CITY_LONGITUDE


class TestTrueSolarTime:
    """真太阳时计算测试"""

    def test_equation_of_time_range(self):
        """均时差应在 -17~+17 分钟范围内（全年）"""
        from engine.paipan import calculate_equation_of_time
        for month in range(1, 13):
            eot = calculate_equation_of_time(2024, month, 15)
            assert -17 < eot < 17, f"{month}月均时差{eot}超出合理范围"

    def test_urumqi_large_correction(self):
        """乌鲁木齐（经度87.6°）应有约-130分钟的经度修正"""
        result = calculate_true_solar_time(1990, 6, 15, 12, 0, 87.6)
        correction = result[5]
        assert correction < -120, f"乌鲁木齐修正量{correction}应<-120分"
        # 12:00 修正后应变为约 09:50
        assert result[3] < 11, f"乌鲁木齐12点修正后应<11点，实际{result[3]}点"

    def test_shanghai_small_correction(self):
        """上海（经度121.5°）修正量应很小"""
        result = calculate_true_solar_time(2024, 6, 21, 12, 0, 121.5)
        correction = result[5]
        assert abs(correction) < 10, f"上海修正量{correction}应<10分"


class TestLunarToSolar:
    """农历转公历测试"""

    def test_vincy_lunar(self):
        """Vincy: 农历1998年6月18日 → 公历1998-08-09"""
        result = lunar_to_solar(1998, 6, 18)
        assert result == (1998, 8, 9)

    def test_spring_festival_2024(self):
        """2024年春节: 农历2024年1月1日 → 公历2024-02-10"""
        result = lunar_to_solar(2024, 1, 1)
        assert result == (2024, 2, 10)


class TestPaipanCalendarModes:
    """paipan 多历法模式测试"""

    def test_lunar_mode_same_as_solar(self):
        """农历模式应与等效公历模式产生相同四柱"""
        # Vincy: 公历1998-08-09 = 农历1998年6月18日
        r_solar = paipan(1998, 8, 9, 13, 50, "女", name="Vincy公历")
        r_lunar = paipan(1998, 6, 18, 13, 50, "女", name="Vincy农历",
                         calendar_type="农历")
        assert r_solar["四柱"]["年柱"]["天干"] == r_lunar["四柱"]["年柱"]["天干"]
        assert r_solar["四柱"]["月柱"]["地支"] == r_lunar["四柱"]["月柱"]["地支"]
        assert r_solar["四柱"]["日柱"]["天干"] == r_lunar["四柱"]["日柱"]["天干"]
        assert r_solar["四柱"]["时柱"]["地支"] == r_lunar["四柱"]["时柱"]["地支"]

    def test_true_solar_time_mode(self):
        """真太阳时模式应返回时间校正信息"""
        r = paipan(1998, 8, 9, 13, 50, "女", birth_place="杭州",
                   name="Vincy真太阳时", use_true_solar_time=True)
        time_info = r["命主信息"]["时间处理"]
        assert "真太阳时校正" in time_info
        assert "校正后时间" in time_info
        assert "经度" in time_info

    def test_true_solar_time_changes_shichen(self):
        """乌鲁木齐真太阳时应改变时辰（12:00午时→约10:00巳时）"""
        r_no_correction = paipan(1990, 6, 15, 12, 0, "男", name="无校正")
        r_with_correction = paipan(1990, 6, 15, 12, 0, "男",
                                    birth_place="乌鲁木齐", name="有校正",
                                    use_true_solar_time=True)
        # 无校正：12点=午时
        assert r_no_correction["四柱"]["时柱"]["地支"] == "午"
        # 有校正：约10点=巳时
        assert r_with_correction["四柱"]["时柱"]["地支"] == "巳"

    def test_backward_compatible(self):
        """默认模式（不启用真太阳时）应与旧接口完全兼容"""
        r_old = paipan(1998, 8, 9, 13, 50, "女", name="Vincy")
        r_new = paipan(1998, 8, 9, 13, 50, "女", name="Vincy",
                       calendar_type="公历", use_true_solar_time=False)
        assert r_old["四柱"] == r_new["四柱"]


# ============================================================
# 事件推理引擎测试（P3）
# ============================================================

class TestEventEngine:
    """事件推理引擎核心功能验证"""

    def _get_events(self, birth, gender):
        from engine.rules import (judge_wangshuai, judge_geju, judge_yongshen,
                                   analyze_relationships, analyze_events)
        data = paipan(*birth, gender)
        ws = judge_wangshuai(data)
        gj = judge_geju(data, ws)
        ys = judge_yongshen(data, ws, gj)
        rels = analyze_relationships(data)
        return analyze_events(data, ws, ys, gj, rels, gender, 6)

    def test_events_returns_list(self):
        """analyze_events 应返回非空列表"""
        events = self._get_events((1998, 8, 9, 13, 50), "女")
        assert isinstance(events, list)
        assert len(events) > 0

    def test_each_year_has_required_fields(self):
        """每年数据应包含必需字段"""
        events = self._get_events((1998, 8, 9, 13, 50), "女")
        required_fields = ["公历年", "干支", "天干十神", "虚岁", "所在大运", "事件候选", "事件数"]
        for year_data in events:
            for field in required_fields:
                assert field in year_data, f"缺少字段: {field}"

    def test_event_item_has_required_fields(self):
        """每个事件候选应包含完整证据链字段"""
        events = self._get_events((1998, 8, 9, 13, 50), "女")
        event_fields = ["领域", "事件", "吉凶", "强度", "证据", "证据链", "触发源", "大运", "规则来源"]
        for year_data in events:
            for evt in year_data["事件候选"]:
                for field in event_fields:
                    assert field in evt, f"{year_data['公历年']}年事件缺少字段: {field}"

    def test_strength_in_valid_range(self):
        """事件强度应在 10-100 之间"""
        events = self._get_events((1998, 8, 9, 13, 50), "女")
        for year_data in events:
            for evt in year_data["事件候选"]:
                assert 10 <= evt["强度"] <= 100, (
                    f"{year_data['公历年']}年 {evt['事件']} 强度{evt['强度']}超出范围"
                )

    def test_jixiong_valid_values(self):
        """吉凶应为合法值"""
        valid_values = {"吉", "凶", "中", "中偏吉"}
        events = self._get_events((1998, 8, 9, 13, 50), "女")
        for year_data in events:
            for evt in year_data["事件候选"]:
                assert evt["吉凶"] in valid_values, (
                    f"{year_data['公历年']}年 {evt['事件']} 吉凶值'{evt['吉凶']}'不合法"
                )

    def test_events_sorted_by_strength(self):
        """每年的事件候选应按强度降序排列"""
        events = self._get_events((1998, 8, 9, 13, 50), "女")
        for year_data in events:
            strengths = [evt["强度"] for evt in year_data["事件候选"]]
            assert strengths == sorted(strengths, reverse=True), (
                f"{year_data['公历年']}年事件未按强度降序排列"
            )

    def test_rule_source_not_empty(self):
        """每条事件的规则来源不应为空"""
        events = self._get_events((1998, 8, 9, 13, 50), "女")
        for year_data in events:
            for evt in year_data["事件候选"]:
                assert evt["规则来源"], f"{year_data['公历年']}年 {evt['事件']} 规则来源为空"

    def test_vincy_2026_has_events(self):
        """Vincy 2026年（丙午偏印）应触发事件"""
        events = self._get_events((1998, 8, 9, 13, 50), "女")
        year_2026 = [y for y in events if y["公历年"] == 2026]
        assert len(year_2026) == 1
        assert year_2026[0]["事件数"] > 0, "Vincy 2026年应有事件触发"

    def test_vincy_2026_has_health_warning(self):
        """Vincy 2026年午冲子（日支）应触发健康/夫妻宫信号"""
        events = self._get_events((1998, 8, 9, 13, 50), "女")
        year_2026 = [y for y in events if y["公历年"] == 2026][0]
        event_names = [evt["事件"] for evt in year_2026["事件候选"]]
        # 午冲子应触发健康注意或夫妻宫动荡
        has_health_or_marriage = any(
            "健康" in name or "夫妻宫" in name for name in event_names
        )
        assert has_health_or_marriage, f"2026年应触发健康/夫妻宫信号，实际事件: {event_names}"

    def test_male_case_events(self):
        """男命案例也应能正常生成事件"""
        events = self._get_events((1993, 1, 21, 4, 0), "男")
        assert isinstance(events, list)
        assert len(events) > 0
        total_events = sum(y["事件数"] for y in events)
        assert total_events > 0, "蔡渣坡近6年应有事件触发"

    def test_full_analysis_includes_events(self):
        """full_analysis 返回值应包含事件推理"""
        from engine.rules import full_analysis
        data = paipan(1998, 8, 9, 13, 50, "女")
        result = full_analysis(data, gender="女")
        assert "事件推理" in result, "full_analysis 应包含事件推理"
        assert isinstance(result["事件推理"], list)
        assert "events_detail" in result["推演文本"], "推演文本应包含events_detail"


class TestEventEngineMultiCase:
    """事件推理引擎·多命例回测"""

    @pytest.mark.parametrize("case", [c for c in GOLDEN_CASES if c.get("expected_bazi")],
                             ids=[c["id"] for c in GOLDEN_CASES if c.get("expected_bazi")])
    def test_events_no_error(self, case):
        """所有有四柱验证的命例，事件推理不报错"""
        from engine.rules import (judge_wangshuai, judge_geju, judge_yongshen,
                                   analyze_relationships, analyze_events)
        data = paipan(*case["birth"], case["gender"])
        ws = judge_wangshuai(data)
        gj = judge_geju(data, ws)
        ys = judge_yongshen(data, ws, gj)
        rels = analyze_relationships(data)
        events = analyze_events(data, ws, ys, gj, rels, case["gender"], 3)
        assert isinstance(events, list), f"{case['id']} 事件推理应返回列表"
        for year_data in events:
            assert "事件候选" in year_data
            for evt in year_data["事件候选"]:
                assert "证据" in evt
                assert "强度" in evt


# ============================================================
# 六亲推理测试（P5）
# ============================================================

class TestLiuqinEvents:
    """六亲动态推理验证"""

    def _get_events(self, birth, gender):
        from engine.rules import (judge_wangshuai, judge_geju, judge_yongshen,
                                   analyze_relationships, analyze_events)
        data = paipan(*birth, gender)
        ws = judge_wangshuai(data)
        gj = judge_geju(data, ws)
        ys = judge_yongshen(data, ws, gj)
        rels = analyze_relationships(data)
        return analyze_events(data, ws, ys, gj, rels, gender, 6)

    def _get_liuqin_events(self, birth, gender):
        events = self._get_events(birth, gender)
        liuqin_events = []
        for y in events:
            liuqin_events.extend([e for e in y["事件候选"] if e["领域"] == "六亲"])
        return liuqin_events

    def test_liuqin_events_have_valid_fields(self):
        """六亲事件应包含完整字段"""
        events = self._get_liuqin_events((1993, 1, 21, 4, 0), "男")
        for evt in events:
            assert evt["领域"] == "六亲"
            assert "证据" in evt
            assert "强度" in evt
            assert 10 <= evt["强度"] <= 100

    def test_male_has_wife_star_event(self):
        """蔡渣坡2027丁未年，正财（妻星）透出应触发六亲事件"""
        events = self._get_events((1993, 1, 21, 4, 0), "男")
        year_2027 = [y for y in events if y["公历年"] == 2027]
        assert len(year_2027) == 1
        liuqin_evts = [e for e in year_2027[0]["事件候选"] if e["领域"] == "六亲"]
        wife_events = [e for e in liuqin_evts if "妻星" in e["事件"]]
        assert len(wife_events) > 0, "蔡渣坡2027年应触发妻星事件"

    def test_female_has_child_star_event(self):
        """Vincy女命，食神/伤官年应触发子女运事件"""
        events = self._get_events((1998, 8, 9, 13, 50), "女")
        child_events = []
        for y in events:
            child_events.extend([e for e in y["事件候选"]
                                 if "子女" in e["事件"] and e["领域"] == "六亲"])
        assert len(child_events) > 0, "Vincy近6年应有子女运事件"

    def test_gender_filter_works(self):
        """男命不应触发女命专属事件，反之亦然"""
        male_events = self._get_liuqin_events((1993, 1, 21, 4, 0), "男")
        for evt in male_events:
            assert "女命" not in evt["事件"], f"男命不应触发女命事件: {evt['事件']}"

        female_events = self._get_liuqin_events((1998, 8, 9, 13, 50), "女")
        for evt in female_events:
            assert "男命" not in evt["事件"], f"女命不应触发男命事件: {evt['事件']}"

    @pytest.mark.parametrize("case", [c for c in GOLDEN_CASES if c.get("expected_bazi")],
                             ids=[c["id"] for c in GOLDEN_CASES if c.get("expected_bazi")])
    def test_liuqin_no_crash(self, case):
        """所有命例的六亲推理不报错"""
        events = self._get_events(case["birth"], case["gender"])
        for y in events:
            for evt in y["事件候选"]:
                if evt["领域"] == "六亲":
                    assert "证据" in evt
                    assert "强度" in evt


# ============================================================
# 大运交脱验证测试（P6）
# ============================================================

class TestDayunContinuity:
    """大运排列连续性与交脱年份准确性"""

    def _get_dayun(self, birth, gender):
        data = paipan(*birth, gender)
        return data["大运"]["大运列表"]

    @pytest.mark.parametrize("case", [
        ("Vincy", (1998, 8, 9, 13, 50), "女"),
        ("蔡渣坡", (1993, 1, 21, 4, 0), "男"),
        ("金杭乐", (2024, 12, 3, 22, 30), "男"),
    ], ids=["Vincy", "蔡渣坡", "金杭乐"])
    def test_dayun_continuity(self, case):
        """大运虚岁和公历年应连续无间隔"""
        _, birth, gender = case
        dayun = self._get_dayun(birth, gender)
        assert len(dayun) >= 5, "至少应有5步大运"
        for i in range(1, len(dayun)):
            assert dayun[i]["起始虚岁"] == dayun[i - 1]["结束虚岁"] + 1, (
                f"第{i}步虚岁不连续: {dayun[i-1]['结束虚岁']} → {dayun[i]['起始虚岁']}"
            )
            assert dayun[i]["起始公历年"] == dayun[i - 1]["结束公历年"] + 1, (
                f"第{i}步公历年不连续: {dayun[i-1]['结束公历年']} → {dayun[i]['起始公历年']}"
            )

    @pytest.mark.parametrize("case", [
        ("Vincy", (1998, 8, 9, 13, 50), "女"),
        ("蔡渣坡", (1993, 1, 21, 4, 0), "男"),
    ], ids=["Vincy", "蔡渣坡"])
    def test_dayun_each_step_10_years(self, case):
        """每步大运应为10年"""
        _, birth, gender = case
        dayun = self._get_dayun(birth, gender)
        for dy in dayun:
            span = dy["结束虚岁"] - dy["起始虚岁"] + 1
            assert span == 10, (
                f"{dy['干支']}运跨度{span}年（应为10年）"
            )

    def test_dayun_has_required_fields(self):
        """大运数据应包含所有必需字段"""
        dayun = self._get_dayun((1998, 8, 9, 13, 50), "女")
        required = ["干支", "天干", "地支", "天干十神", "地支五行",
                     "起始虚岁", "结束虚岁", "起始公历年", "结束公历年"]
        for dy in dayun:
            for field in required:
                assert field in dy, f"大运缺少字段: {field}"

    def test_vincy_dayun_sequence(self):
        """Vincy大运干支序列应正确（女命阴年逆排）"""
        dayun = self._get_dayun((1998, 8, 9, 13, 50), "女")
        expected_ganzi = ["己未", "戊午", "丁巳", "丙辰", "乙卯",
                          "甲寅", "癸丑", "壬子", "辛亥"]
        actual_ganzi = [dy["干支"] for dy in dayun]
        assert actual_ganzi == expected_ganzi, (
            f"Vincy大运序列不匹配:\n期望: {expected_ganzi}\n实际: {actual_ganzi}"
        )

    def test_caizhapo_dayun_sequence(self):
        """蔡渣坡大运干支序列应正确（男命阴年顺排）"""
        dayun = self._get_dayun((1993, 1, 21, 4, 0), "男")
        expected_ganzi = ["甲寅", "乙卯", "丙辰", "丁巳", "戊午",
                          "己未", "庚申", "辛酉", "壬戌"]
        actual_ganzi = [dy["干支"] for dy in dayun]
        assert actual_ganzi == expected_ganzi, (
            f"蔡渣坡大运序列不匹配:\n期望: {expected_ganzi}\n实际: {actual_ganzi}"
        )

    def test_dayun_text_generated(self):
        """大运推演文本应正常生成"""
        from engine.rules import full_analysis
        data = paipan(1998, 8, 9, 13, 50, "女")
        result = full_analysis(data, gender="女")
        dayun_text = result["推演文本"]["dayun_zonglun"]
        assert len(dayun_text) > 100, "大运推演文本过短"
        assert "大运分段总论" in dayun_text, "大运推演文本应包含总论标题"

    @pytest.mark.parametrize("case", [c for c in GOLDEN_CASES if c.get("expected_bazi")],
                             ids=[c["id"] for c in GOLDEN_CASES if c.get("expected_bazi")])
    def test_dayun_no_crash(self, case):
        """所有命例的大运排列不报错"""
        data = paipan(*case["birth"], case["gender"])
        dayun = data["大运"]["大运列表"]
        assert isinstance(dayun, list)
        assert len(dayun) >= 3, f"{case['id']} 大运步数过少"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
