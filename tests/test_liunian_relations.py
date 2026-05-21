"""
P4 测试：大运流年互作用验证

校验方法：
- 天干合/克关系正确性
- 地支六合/六冲检测
- 天克地冲信号识别
- 合时不重复列克
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.paipan import paipan
from engine.rules import full_analysis, _check_tiangan_relation


class TestTianganRelation:
    """天干关系检测"""

    def test_he_no_duplicate_ke(self):
        """天干合时不应重复列克"""
        rels = _check_tiangan_relation("辛", "丙")
        assert len(rels) == 1
        assert "天干合" in rels[0]
        assert "克" not in rels[0]

    def test_he_jiazi(self):
        rels = _check_tiangan_relation("甲", "己")
        assert any("天干合(土)" in r for r in rels)
        assert not any("克" in r for r in rels)

    def test_ke_only(self):
        rels = _check_tiangan_relation("甲", "庚")
        assert any("克" in r for r in rels)
        assert not any("合" in r for r in rels)

    def test_no_relation(self):
        rels = _check_tiangan_relation("甲", "丙")
        assert rels == []


class TestDayunLiunianInteraction:
    """大运流年互作用验证 — Vincy案例"""

    @pytest.fixture
    def vincy_liunian(self):
        data = paipan(1998, 8, 9, 13, 50, "女")
        result = full_analysis(data)
        return result["流年"]

    def test_2028_liuhe(self, vincy_liunian):
        """2028戊申年，大运丁巳，申巳六合"""
        ly2028 = next(ly for ly in vincy_liunian if ly["公历年"] == 2028)
        rels = ly2028["大运流年互作用"]
        assert any("六合" in r for r in rels)

    def test_2030_tiankedichong(self, vincy_liunian):
        """2030庚戌年，大运丙辰，庚克丙+戌冲辰=天克地冲"""
        ly2030 = next(ly for ly in vincy_liunian if ly["公历年"] == 2030)
        rels = ly2030["大运流年互作用"]
        assert any("天克地冲" in r for r in rels)
        assert any("六冲" in r for r in rels)

    def test_2031_tianganhe(self, vincy_liunian):
        """2031辛亥年，大运丙辰，辛丙合水"""
        ly2031 = next(ly for ly in vincy_liunian if ly["公历年"] == 2031)
        rels = ly2031["大运流年互作用"]
        assert any("天干合" in r for r in rels)
        assert not any("克" in r for r in rels)

    def test_no_interaction_years(self, vincy_liunian):
        """2026/2027无大运流年互作用"""
        ly2026 = next(ly for ly in vincy_liunian if ly["公历年"] == 2026)
        assert ly2026["大运流年互作用"] == []


class TestDayunLiunianField:
    """大运流年互作用字段完整性"""

    @pytest.mark.parametrize("birth,gender", [
        ((1998, 8, 9, 13, 50), "女"),
        ((1993, 1, 21, 4, 0), "男"),
        ((1984, 10, 16, 0, 0), "男"),
    ])
    def test_field_present(self, birth, gender):
        data = paipan(*birth, gender)
        result = full_analysis(data)
        for ly in result["流年"]:
            assert "大运流年互作用" in ly
            assert isinstance(ly["大运流年互作用"], list)
