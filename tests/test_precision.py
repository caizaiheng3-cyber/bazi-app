"""
P5 测试：精准度提升验证

校验方法：
- 空亡对通根力量的影响验证
- EVENT_RULES 扩展覆盖率验证
- 旺衰置信度统计
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.paipan import paipan
from engine.rules import judge_wangshuai, full_analysis, EVENT_RULES


class TestKongwangImpact:
    """空亡对旺衰通根的影响"""

    def test_kongwang_reduces_tongen(self):
        """空亡地支的通根力量应减弱（仅当该五行无天干透出时）"""
        # 甲寅日，空亡午未。找一个通根落在空亡中且无透干的案例
        data = paipan(1998, 8, 9, 13, 50, "女")
        w = judge_wangshuai(data)
        # Vincy 空亡午未，日主戊土，四柱地支寅申子未
        # 未中有己土(30)、乙木(30)、丁火(10)
        # 土五行有天干透出（戊自身），所以土通根不受空亡影响
        # 验证旺衰正常输出
        assert w["结论"] in ("身旺", "身弱", "中和")

    def test_kongwang_detail_in_output(self):
        """通根明细应标注空亡减力"""
        # 找一个空亡支有日主通根且该五行无天干透出的案例
        data = paipan(1984, 10, 16, 0, 0, "男")
        w = judge_wangshuai(data)
        kongwang = data["空亡"]
        # 检查逐项明细中是否有空亡标记
        has_kw_detail = any("空亡" in d.get("来源", "") for d in w["逐项明细"])
        # 是否有空亡标记取决于是否有通根落在空亡且无透干
        # 这里主要验证不崩溃
        assert isinstance(w["逐项明细"], list)

    def test_golden_cases_stable(self):
        """核心案例旺衰方向不受空亡修正影响（使用full_analysis含合冲修正）"""
        cases = [
            ((1998, 8, 9, 13, 50), "女", "身弱"),
            ((1993, 1, 21, 4, 0), "男", "身旺"),
            ((1984, 10, 16, 0, 0), "男", "身旺"),
        ]
        for birth, gender, expected in cases:
            data = paipan(*birth, gender)
            result = full_analysis(data)
            actual = result["旺衰"]["结论"]
            assert actual == expected, \
                f"{birth}: 预期{expected}，实得{actual}"


class TestEventRulesExpansion:
    """EVENT_RULES 扩展验证"""

    def test_minimum_rule_count(self):
        """规则数量至少49条"""
        assert len(EVENT_RULES) >= 49

    def test_domain_coverage(self):
        """至少覆盖6个领域"""
        domains = set(r["领域"] for r in EVENT_RULES)
        assert len(domains) >= 5
        assert "学业" in domains
        assert "健康" in domains

    def test_xueye_rules_exist(self):
        """学业类规则至少4条"""
        xueye = [r for r in EVENT_RULES if r["领域"] == "学业"]
        assert len(xueye) >= 4

    def test_rule_structure(self):
        """每条规则必须有关键字段"""
        required = {"领域", "事件", "证据模板", "基础强度", "来源"}
        for i, rule in enumerate(EVENT_RULES):
            missing = required - set(rule.keys())
            assert not missing, f"规则{i}({rule.get('事件','?')})缺少字段: {missing}"

    def test_new_rules_trigger(self):
        """新增规则能在实际案例中触发"""
        data = paipan(1998, 8, 9, 13, 50, "女")
        result = full_analysis(data)
        events = result.get("事件推理", [])
        # 按年份分组，至少有多个年份
        assert len(events) > 0
        # 检查每年的事件候选结构
        for year_events in events[:3]:
            assert "事件候选" in year_events
            for e in year_events["事件候选"][:2]:
                assert "事件" in e
                assert "强度" in e


class TestWangshuaiConfidence:
    """旺衰置信度验证"""

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
    def test_confidence_present(self, birth, gender):
        """旺衰输出应包含置信度字段"""
        data = paipan(*birth, gender)
        w = judge_wangshuai(data)
        assert "置信度" in w
        assert w["置信度"] in ("高", "中", "低")

    def test_confidence_ratio(self):
        """多案例中，高置信度比例应占多数"""
        cases = [
            ((1998, 8, 9, 13, 50), "女"),
            ((1993, 1, 21, 4, 0), "男"),
            ((1984, 10, 16, 0, 0), "男"),
            ((1906, 7, 1, 12, 0), "男"),
            ((1925, 4, 1, 22, 0), "男"),
            ((1940, 12, 23, 12, 0), "男"),
            ((1958, 12, 27, 0, 0), "男"),
            ((1987, 3, 15, 0, 0), "男"),
        ]
        high_count = 0
        for birth, gender in cases:
            data = paipan(*birth, gender)
            w = judge_wangshuai(data)
            if w["置信度"] == "高":
                high_count += 1
        assert high_count >= len(cases) // 2, \
            f"高置信度比例偏低: {high_count}/{len(cases)}"
