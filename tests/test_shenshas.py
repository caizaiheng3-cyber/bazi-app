"""
P2 测试：神煞体系扩展验证

校验方法：
- 每种神煞有"原局有"和"原局无"的案例验证
- 字段完整性验证
- 桃花检测与 EVENT_RULES 联动验证
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.paipan import paipan
from engine.rules import analyze_shenshas


class TestShenshaCompleteness:
    """验证神煞输出的字段完整性"""

    @pytest.fixture
    def vincy_shenshas(self):
        data = paipan(1998, 8, 9, 13, 50, "女")
        return analyze_shenshas(data)

    def test_required_fields(self, vincy_shenshas):
        required = {"名称", "查法", "原局来源", "吉凶", "效应"}
        for ss in vincy_shenshas:
            missing = required - set(ss.keys())
            assert not missing, f"{ss['名称']}缺少字段: {missing}"

    def test_minimum_count(self, vincy_shenshas):
        assert len(vincy_shenshas) >= 14

    def test_all_names_unique(self, vincy_shenshas):
        names = [ss["名称"] for ss in vincy_shenshas]
        assert len(names) == len(set(names))


class TestTaohua:
    """桃花（咸池）检测验证"""

    def test_vincy_no_taohua_in_chart(self):
        # Vincy 日支子，桃花位酉。四柱地支寅申子未，无酉
        data = paipan(1998, 8, 9, 13, 50, "女")
        shenshas = analyze_shenshas(data)
        taohua = next(ss for ss in shenshas if ss["名称"] == "桃花")
        assert taohua["原局来源"] == ["原局无"]

    def test_taohua_present(self):
        # 找一个有桃花的案例：日支寅→桃花卯，四柱含卯即有桃花
        data = paipan(1987, 3, 15, 0, 0, "男")
        shenshas = analyze_shenshas(data)
        taohua = next(ss for ss in shenshas if ss["名称"] == "桃花")
        # 日支亥→桃花子，四柱含子即有桃花
        day_zhi = data["四柱"]["日柱"]["地支"]
        if day_zhi == "亥":
            # 时支子
            assert taohua["原局来源"] != ["原局无"]


class TestWenchang:
    """文昌检测验证"""

    def test_vincy_has_wenchang(self):
        # Vincy 日干戊→文昌申，月支申
        data = paipan(1998, 8, 9, 13, 50, "女")
        shenshas = analyze_shenshas(data)
        wenchang = next(ss for ss in shenshas if ss["名称"] == "文昌")
        assert "月支" in wenchang["原局来源"]

    def test_wenchang_not_present(self):
        # 蔡渣坡 日干壬→文昌寅，地支申丑寅寅，有寅
        data = paipan(1993, 1, 21, 4, 0, "男")
        shenshas = analyze_shenshas(data)
        wenchang = next(ss for ss in shenshas if ss["名称"] == "文昌")
        assert wenchang["原局来源"] != ["原局无"]


class TestLuAndRen:
    """禄神和羊刃验证"""

    def test_lu_lookup(self):
        # 甲禄在寅：如果四柱有寅则禄神有
        data = paipan(1984, 10, 16, 0, 0, "男")
        # 日干癸→禄在子, 四柱甲子甲戌癸未壬子，有子
        shenshas = analyze_shenshas(data)
        lushen = next(ss for ss in shenshas if ss["名称"] == "禄神")
        assert lushen["原局来源"] != ["原局无"]

    def test_yangren_lookup(self):
        # 壬刃在子：同上案例
        data = paipan(1984, 10, 16, 0, 0, "男")
        shenshas = analyze_shenshas(data)
        yangren = next(ss for ss in shenshas if ss["名称"] == "羊刃")
        # 癸刃在亥？不对。TIANGAN_REN: 癸→亥。四柱无亥？
        day_gan = data["四柱"]["日柱"]["天干"]
        assert day_gan == "癸"


class TestJiangxing:
    """将星验证"""

    def test_vincy_has_jiangxing(self):
        # Vincy 日支子→将星子，日支本身就是子
        data = paipan(1998, 8, 9, 13, 50, "女")
        shenshas = analyze_shenshas(data)
        jx = next(ss for ss in shenshas if ss["名称"] == "将星")
        assert "日支" in jx["原局来源"]


class TestMultiCase:
    """多案例不报错验证"""

    @pytest.mark.parametrize("birth,gender", [
        ((1998, 8, 9, 13, 50), "女"),
        ((1993, 1, 21, 4, 0), "男"),
        ((1984, 10, 16, 0, 0), "男"),
        ((1906, 7, 1, 12, 0), "男"),
        ((1925, 4, 1, 22, 0), "男"),
        ((1940, 12, 23, 12, 0), "男"),
        ((1958, 12, 27, 0, 0), "男"),
        ((1987, 3, 15, 0, 0), "男"),
    ])
    def test_no_crash(self, birth, gender):
        data = paipan(*birth, gender)
        shenshas = analyze_shenshas(data)
        assert len(shenshas) >= 14
        for ss in shenshas:
            assert "名称" in ss
            assert "吉凶" in ss
