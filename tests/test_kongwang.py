"""
P0 测试：空亡 / 胎元 / 命宫 精确验证

校验方法：
- 空亡：六甲旬 + GOLDEN_CASES 对照排盘软件
- 胎元：公式逻辑验证（月干进一，月支进三）
- 命宫：公式逻辑 + 经典案例交叉验证
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.paipan import paipan, calc_kongwang, calc_taiyuan, calc_minggong


class TestKongwang:
    """空亡计算精确验证"""

    @pytest.mark.parametrize("day_gan,day_zhi,expected", [
        ("甲", "子", ["戌", "亥"]),  # 甲子旬
        ("乙", "丑", ["戌", "亥"]),  # 甲子旬
        ("癸", "酉", ["戌", "亥"]),  # 甲子旬末
        ("甲", "戌", ["申", "酉"]),  # 甲戌旬
        ("丙", "子", ["申", "酉"]),  # 甲戌旬
        ("甲", "申", ["午", "未"]),  # 甲申旬
        ("戊", "子", ["午", "未"]),  # 甲申旬（Vincy日柱）
        ("甲", "午", ["辰", "巳"]),  # 甲午旬
        ("甲", "辰", ["寅", "卯"]),  # 甲辰旬
        ("甲", "寅", ["子", "丑"]),  # 甲寅旬
        ("癸", "丑", ["寅", "卯"]),  # 甲辰旬末（甲辰~癸丑，空寅卯）
    ])
    def test_kongwang_accuracy(self, day_gan, day_zhi, expected):
        result = calc_kongwang(day_gan, day_zhi)
        assert result == expected, f"{day_gan}{day_zhi}日空亡应为{expected}，实得{result}"

    def test_vincy_kongwang(self):
        data = paipan(1998, 8, 9, 13, 50, "女")
        assert data["空亡"] == ["午", "未"]

    def test_caizhapo_kongwang(self):
        data = paipan(1993, 1, 21, 4, 0, "男")
        # 壬寅日 → 甲子旬（甲子乙丑...壬申癸酉），空亡戌亥
        # Wait: 壬寅 → gan_idx=8, zhi_idx=2, start=(2-8)%12=6 → 空亡 DIZHI[16%12]=辰, DIZHI[17%12]=巳
        # 甲午旬: 甲午乙未丙申丁酉戊戌己亥庚子辛丑壬寅癸卯, 空辰巳
        assert data["空亡"] == ["辰", "巳"]

    def test_kongwang_in_paipan_output(self):
        data = paipan(1998, 8, 9, 13, 50, "女")
        assert "空亡" in data
        assert isinstance(data["空亡"], list)
        assert len(data["空亡"]) == 2


class TestTaiyuan:
    """胎元计算验证"""

    @pytest.mark.parametrize("month_gan,month_zhi,expected", [
        ("庚", "申", "辛亥"),  # Vincy月柱
        ("癸", "丑", "甲辰"),  # 蔡渣坡月柱
        ("甲", "戌", "乙丑"),  # 经典案例
        ("丁", "巳", "戊申"),
        ("壬", "子", "癸卯"),
        ("己", "未", "庚戌"),
        ("癸", "亥", "甲寅"),  # 干归甲，支进三
    ])
    def test_taiyuan_accuracy(self, month_gan, month_zhi, expected):
        result = calc_taiyuan(month_gan, month_zhi)
        assert result == expected, f"{month_gan}{month_zhi}月胎元应为{expected}，实得{result}"

    def test_vincy_taiyuan(self):
        data = paipan(1998, 8, 9, 13, 50, "女")
        assert data["胎元"] == "辛亥"

    def test_caizhapo_taiyuan(self):
        data = paipan(1993, 1, 21, 4, 0, "男")
        assert data["胎元"] == "甲辰"

    def test_taiyuan_in_paipan_output(self):
        data = paipan(1998, 8, 9, 13, 50, "女")
        assert "胎元" in data
        assert isinstance(data["胎元"], str)
        assert len(data["胎元"]) == 2


class TestMinggong:
    """命宫计算验证"""

    @pytest.mark.parametrize("year_gan,month_zhi,hour_zhi,expected_zhi", [
        ("甲", "寅", "子", "丑"),   # 14-1-1=12 → 丑
        ("甲", "寅", "寅", "亥"),   # 14-1-3=10 → 亥
        ("甲", "卯", "子", "子"),   # 14-2-1=11 → 子
        ("甲", "午", "午", "卯"),   # 14-5-7=2 → 卯
    ])
    def test_minggong_dizhi(self, year_gan, month_zhi, hour_zhi, expected_zhi):
        result = calc_minggong(year_gan, month_zhi, hour_zhi)
        assert result[1] == expected_zhi, \
            f"{year_gan}年{month_zhi}月{hour_zhi}时命宫地支应为{expected_zhi}，实得{result[1]}"

    def test_vincy_minggong(self):
        data = paipan(1998, 8, 9, 13, 50, "女")
        assert "命宫" in data
        assert isinstance(data["命宫"], str)
        assert len(data["命宫"]) == 2
        # Vincy: 戊年 申月 未时 → 命宫地支=子
        assert data["命宫"][1] == "子"

    def test_minggong_ganshi_consistency(self):
        """验证命宫天干与地支的阴阳一致性"""
        YINYANG_GAN = {"甲": "阳", "乙": "阴", "丙": "阳", "丁": "阴", "戊": "阳",
                       "己": "阴", "庚": "阳", "辛": "阴", "壬": "阳", "癸": "阴"}
        YINYANG_ZHI = {"子": "阳", "丑": "阴", "寅": "阳", "卯": "阴", "辰": "阳", "巳": "阴",
                       "午": "阳", "未": "阴", "申": "阳", "酉": "阴", "戌": "阳", "亥": "阴"}
        for year_gan in ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]:
            for month_zhi in ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"]:
                for hour_zhi in ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]:
                    result = calc_minggong(year_gan, month_zhi, hour_zhi)
                    assert YINYANG_GAN[result[0]] == YINYANG_ZHI[result[1]], \
                        f"{year_gan}年{month_zhi}月{hour_zhi}时: 命宫{result}干支阴阳不匹配"

    def test_minggong_in_paipan_output(self):
        data = paipan(1984, 10, 16, 0, 0, "男")
        assert "命宫" in data
        assert isinstance(data["命宫"], str)
        assert len(data["命宫"]) == 2


class TestP0Integration:
    """P0 综合集成测试"""

    @pytest.mark.parametrize("birth,gender", [
        ((1998, 8, 9, 13, 50), "女"),    # Vincy
        ((1993, 1, 21, 4, 0), "男"),     # 蔡渣坡
        ((1984, 10, 16, 0, 0), "男"),    # 金杭乐
        ((1906, 7, 1, 12, 0), "男"),     # 炎上格
        ((1925, 4, 1, 22, 0), "男"),     # 曲直格
    ])
    def test_paipan_has_all_p0_fields(self, birth, gender):
        data = paipan(*birth, gender)
        assert "空亡" in data
        assert "胎元" in data
        assert "命宫" in data
        assert len(data["空亡"]) == 2
        assert len(data["胎元"]) == 2
        assert len(data["命宫"]) == 2
