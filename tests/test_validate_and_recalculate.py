"""validate_and_recalculate 함수 테스트"""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from modules.ai_engine import validate_and_recalculate
from config.settings import SIGNAL_THRESHOLDS


# === 그룹 1: 현재 동작 baseline ===

def test_baseline_normal_scores():
    """정상 점수: total 재계산 확인"""
    item = {
        "signal": "매수",
        "scores": {
            "technical": 7.0,
            "supply_demand": 7.5,
            "valuation": 6.0,
            "material": 6.5,
        },
    }
    result = validate_and_recalculate(item)
    assert result["scores"]["total"] == 6.9
    assert result["confidence"] == 0.69


def test_baseline_clamp_over_10():
    """10 초과 점수는 10으로 클램프"""
    item = {
        "signal": "매수",
        "scores": {
            "technical": 12.0,
            "supply_demand": 7.0,
            "valuation": 5.0,
            "material": 5.0,
        },
    }
    result = validate_and_recalculate(item)
    assert result["scores"]["technical"] == 10.0


def test_baseline_missing_scores_returns_unchanged():
    """scores 자체가 없으면 그대로 반환"""
    item = {"signal": "중립", "reason": "test"}
    result = validate_and_recalculate(item)
    assert result == item


def test_baseline_none_score_gets_default():
    """수정 후: None 점수 → 가중평균에서 제외"""
    item = {
        "signal": "매수",
        "scores": {
            "technical": 8.0,
            "supply_demand": 8.0,
            "valuation": None,
            "material": 8.0,
        },
    }
    result = validate_and_recalculate(item)
    assert result["scores"]["valuation"] is None
    assert result["scores"]["total"] == 8.0


def test_baseline_signal_not_reclassified():
    """수정 후: total 기준으로 signal 재분류됨"""
    item = {
        "signal": "매수",
        "scores": {
            "technical": 9.0,
            "supply_demand": 9.0,
            "valuation": 9.0,
            "material": 9.0,
        },
    }
    result = validate_and_recalculate(item)
    assert result["scores"]["total"] == 9.0
    assert result["signal"] == "적극매수"


# === 그룹 2: 개선 후 기대 동작 (현재 FAIL) ===

def test_improved_none_excluded_from_weighted_avg():
    """개선: None 점수 → 가중평균에서 제외"""
    item = {
        "signal": "매수",
        "scores": {
            "technical": 8.0,
            "supply_demand": 8.0,
            "valuation": None,
            "material": 8.0,
        },
    }
    result = validate_and_recalculate(item)
    assert result["scores"]["valuation"] is None
    assert result["scores"]["total"] == 8.0


def test_improved_signal_reclassified():
    """개선: total 재계산 후 signal 재분류"""
    item = {
        "signal": "매수",
        "scores": {
            "technical": 9.0,
            "supply_demand": 9.0,
            "valuation": 9.0,
            "material": 9.0,
        },
    }
    result = validate_and_recalculate(item)
    assert result["scores"]["total"] == 9.0
    assert result["signal"] == "적극매수"


def test_improved_signal_reclassified_downgrade():
    """개선: signal 과대평가 → 재분류로 하향"""
    item = {
        "signal": "적극매수",
        "scores": {
            "technical": 7.0,
            "supply_demand": 7.0,
            "valuation": 7.0,
            "material": 7.0,
        },
    }
    result = validate_and_recalculate(item)
    assert result["scores"]["total"] == 7.0
    assert result["signal"] == "매수"


def test_improved_all_none_returns_neutral():
    """개선: 모든 점수 None → total 5.0, signal 중립"""
    item = {
        "signal": "매수",
        "scores": {
            "technical": None,
            "supply_demand": None,
            "valuation": None,
            "material": None,
        },
    }
    result = validate_and_recalculate(item)
    assert result["scores"]["total"] == 5.0
    assert result["signal"] == "중립"


def test_improved_string_score_treated_as_none():
    """개선: 문자열 점수도 None과 동일 처리"""
    item = {
        "signal": "매수",
        "scores": {
            "technical": 8.0,
            "supply_demand": 8.0,
            "valuation": "N/A",
            "material": 8.0,
        },
    }
    result = validate_and_recalculate(item)
    assert result["scores"]["valuation"] is None
    assert result["scores"]["total"] == 8.0
