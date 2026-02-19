"""종목 선정 기준 평가 모듈 (8-Criteria + Short Selling Alert)

KIS API로 수집된 kis_latest.json 데이터를 기반으로
모든 종목을 8개 독립 기준으로 평가한다.

기준 (all_met 포함):
  1. 전고점 돌파 (빨강)
  2. 끼 보유 (주황)
  3. 심리적 저항선 돌파 (노랑)
  4. 이동평균선 정배열 (청록)
  5. 외국인/기관 수급 (파랑)
  6. 프로그램 매매 (보라)
  7. 거래대금 TOP30 (자홍)
  8. 시가총액 적정 범위 (라임)

경고 (all_met 제외):
  - 공매도 비중 경고 (5% 이상: 경고, 10% 이상: 극단)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional


# 심리적 저항선: 호가 단위 경계 (한국 주식 호가 단위 기준)
TICK_BOUNDARIES = [
    1000, 2000, 3000, 4000, 5000,
    10000, 20000, 30000, 40000, 50000,
    100000, 200000, 300000, 400000, 500000,
    1000000,
]

# 라운드 넘버 (심리적 매물대)
ROUND_LEVELS = [
    1000, 2000, 3000, 5000,
    10000, 20000, 30000, 50000,
    100000, 150000, 200000, 250000, 300000, 400000, 500000,
    600000, 700000, 800000, 900000, 1000000,
]


class CriteriaEvaluator:
    def __init__(self, kis_raw_data: dict, short_selling_data: dict | None = None):
        self.stock_details = kis_raw_data.get("stock_details", {})
        self.rankings = kis_raw_data.get("rankings", {})
        self._top30_codes = self._build_top30_set()
        self._short_selling = short_selling_data or {}

    def _build_top30_set(self) -> set:
        """거래대금 TOP30 종목코드 집합 구성 (KOSPI+KOSDAQ 합산)"""
        all_stocks = (
            self.rankings.get("kospi", []) +
            self.rankings.get("kosdaq", [])
        )
        sorted_by_value = sorted(
            all_stocks,
            key=lambda s: s.get("trading_value", 0),
            reverse=True,
        )
        return {s["code"] for s in sorted_by_value[:30]}

    def check_high_breakout(
        self,
        current_price: float,
        daily_prices: list[dict],
        w52_high: float,
    ) -> dict:
        """1. 전고점 돌파: 6개월(120영업일) 고가 또는 52주 신고가 돌파

        ohlcv[0]은 당일 데이터이므로 당일 장중 고가가 포함되면
        종가 < 고가인 경우 전고점을 돌파했는데도 미돌파로 판정되는 오류가 발생한다.
        따라서 ohlcv[1:]부터 (전일 이전) 고가만 비교 대상으로 한다.
        """
        if not current_price or current_price <= 0:
            return {"met": False, "reason": "현재가 데이터 없음"}

        # 52주 신고가 먼저 확인
        if w52_high and w52_high > 0 and current_price >= w52_high:
            return {
                "met": True,
                "is_52w_high": True,
                "reason": f"52주 신고가 돌파 (현재가 {current_price:,.0f} >= 52주고가 {w52_high:,.0f})",
            }

        # 6개월 고가: 당일(ohlcv[0]) 제외, ohlcv[1:]부터 120일
        past_highs = [d.get("high", 0) for d in daily_prices[1:121] if d.get("high")]
        six_mo_high = max(past_highs) if past_highs else 0

        if six_mo_high > 0 and current_price >= six_mo_high:
            return {
                "met": True,
                "is_52w_high": False,
                "reason": f"6개월 고점 돌파 (현재가 {current_price:,.0f} >= 6개월고가 {six_mo_high:,.0f})",
            }

        return {
            "met": False,
            "is_52w_high": False,
            "reason": f"미돌파 (현재가 {current_price:,.0f}, 6개월고가 {six_mo_high:,.0f}, 52주고가 {w52_high:,.0f})",
        }

    def check_momentum_history(self, daily_prices: list[dict]) -> dict:
        """2. 끼 보유: 과거 상한가(>=29%) 또는 급등(>=15%) 이력

        ohlcv의 change_rate 필드가 0으로 내려오는 경우가 대부분이므로,
        전일종가 대비 등락률을 직접 계산한다.
        ohlcv는 최신순 정렬이므로 [i+1]이 전일 데이터.
        """
        had_limit_up = False
        had_15pct_rise = False

        for i in range(len(daily_prices)):
            d = daily_prices[i]
            cr = d.get("change_rate", 0) or 0

            # change_rate가 0이면 전일종가 대비 등락률 직접 계산
            if cr == 0 and i + 1 < len(daily_prices):
                prev_close = daily_prices[i + 1].get("close", 0)
                cur_close = d.get("close", 0)
                if prev_close and prev_close > 0 and cur_close:
                    cr = ((cur_close - prev_close) / prev_close) * 100

            if cr >= 29:
                had_limit_up = True
            if cr >= 15:
                had_15pct_rise = True

        met = had_limit_up or had_15pct_rise
        reasons = []
        if had_limit_up:
            reasons.append("상한가 이력 있음(>=29%)")
        if had_15pct_rise:
            reasons.append("급등 이력 있음(>=15%)")

        return {
            "met": met,
            "had_limit_up": had_limit_up,
            "had_15pct_rise": had_15pct_rise,
            "reason": ", ".join(reasons) if reasons else "급등 이력 없음",
        }

    def check_resistance_breakout(
        self,
        current_price: float,
        prev_close: float,
    ) -> dict:
        """3. 심리적 저항선 돌파: 전일종가 < 경계 <= 현재가"""
        if not current_price or not prev_close or current_price <= prev_close:
            return {"met": False, "reason": "하락 또는 데이터 없음"}

        broken = []
        all_levels = sorted(set(TICK_BOUNDARIES + ROUND_LEVELS))
        for boundary in all_levels:
            if prev_close < boundary <= current_price:
                broken.append(boundary)

        if broken:
            levels_str = ", ".join(f"{b:,.0f}" for b in broken[:3])
            return {
                "met": True,
                "reason": f"저항선 돌파: {levels_str} (전일 {prev_close:,.0f} → 현재 {current_price:,.0f})",
            }

        return {
            "met": False,
            "reason": f"돌파 없음 (전일 {prev_close:,.0f} → 현재 {current_price:,.0f})",
        }

    def check_ma_alignment(
        self,
        current_price: float,
        daily_prices: list[dict],
    ) -> dict:
        """4. 이동평균선 정배열 (적응형)

        이상적: 현재가 > MA5 > MA10 > MA20 > MA60 > MA120
        데이터가 부족하면 계산 가능한 MA까지만 검사한다.
        최소 MA20(20일 데이터)은 있어야 의미 있는 판정이 가능.
        """
        if not current_price or current_price <= 0:
            return {"met": False, "reason": "현재가 데이터 없음"}

        # ohlcv는 최신순 → 역순으로 close 추출
        closes = []
        for d in reversed(daily_prices):
            c = d.get("close")
            if c and c > 0:
                closes.append(c)

        if len(closes) < 20:
            return {
                "met": False,
                "reason": f"데이터 부족 (최소 20일 필요, 현재 {len(closes)}일)",
                "ma_values": {},
            }

        def sma(data: list, period: int) -> float | None:
            if len(data) < period:
                return None
            return sum(data[-period:]) / period

        all_periods = [5, 10, 20, 60, 120]
        ma_values: dict[str, float | None] = {}
        for p in all_periods:
            ma_values[f"MA{p}"] = sma(closes, p)

        # 계산 가능한 MA만 추출 (순서 유지)
        available_periods = [p for p in all_periods if ma_values[f"MA{p}"] is not None]
        ma_display = {f"MA{p}": round(ma_values[f"MA{p}"], 1) for p in available_periods}

        # 정배열 검사: 현재가 > MA5 > MA10 > ... (계산 가능한 것까지)
        vals = [current_price] + [ma_values[f"MA{p}"] for p in available_periods]
        is_aligned = all(vals[i] > vals[i + 1] for i in range(len(vals) - 1))

        checked_label = ">".join(f"MA{p}" for p in available_periods)
        missing_periods = [p for p in all_periods if ma_values[f"MA{p}"] is None]
        partial_note = f" (MA{','.join(str(p) for p in missing_periods)} 데이터 부족으로 제외)" if missing_periods else ""

        if is_aligned:
            return {
                "met": True,
                "reason": f"정배열 확인 (현재가>{checked_label}){partial_note}",
                "ma_values": ma_display,
            }

        return {
            "met": False,
            "reason": f"정배열 아님{partial_note}",
            "ma_values": ma_display,
        }

    def check_supply_demand(
        self,
        foreign_net: float,
        institution_net: float,
    ) -> dict:
        """5. 외국인/기관 동시 순매수"""
        foreign_net = foreign_net or 0
        institution_net = institution_net or 0
        foreign_buy = foreign_net > 0
        institution_buy = institution_net > 0
        met = foreign_buy and institution_buy

        parts = []
        parts.append(f"외국인 {'순매수' if foreign_buy else '순매도'}({foreign_net:+,.0f})")
        parts.append(f"기관 {'순매수' if institution_buy else '순매도'}({institution_net:+,.0f})")

        return {
            "met": met,
            "reason": ", ".join(parts),
        }

    def check_program_trading(self, program_net_buy_qty: float) -> dict:
        """6. 프로그램 순매수"""
        program_net_buy_qty = program_net_buy_qty or 0
        met = program_net_buy_qty > 0
        return {
            "met": met,
            "reason": f"프로그램 순매수량: {program_net_buy_qty:+,.0f}",
        }

    def check_top30_trading_value(self, stock_code: str) -> dict:
        """7. 거래대금 TOP30"""
        met = stock_code in self._top30_codes
        return {
            "met": met,
            "reason": "거래대금 TOP30" if met else "TOP30 아님",
        }

    def check_market_cap(self, market_cap: float) -> dict:
        """8. 시가총액 적정 범위: 3,000억 ~ 10조 (억원 단위)"""
        market_cap = market_cap or 0
        if market_cap <= 0:
            return {"met": False, "reason": "시가총액 데이터 없음"}
        MIN_CAP = 3000     # 3,000억원
        MAX_CAP = 100000   # 10조원
        met = MIN_CAP <= market_cap <= MAX_CAP
        if market_cap < MIN_CAP:
            reason = f"시가총액 {market_cap:,.0f}억원 (기준 미달: 3,000억 미만)"
        elif market_cap > MAX_CAP:
            reason = f"시가총액 {market_cap:,.0f}억원 (기준 초과: 10조 초과)"
        else:
            reason = f"시가총액 {market_cap:,.0f}억원 (적정 범위: 3,000억~10조)"
        return {"met": met, "reason": reason}

    def check_short_selling(self, short_ratio: float) -> dict:
        """공매도 비중 경고 (부정적 지표, all_met에서 제외)

        기준값: 5% (전체 거래량 대비 공매도 비중)
          정상: 1~3% (한국 시장 평균)
          경고: 5% 이상 (평균의 약 2배, 공매도 세력 집중)
          극단: 10% 이상 (숏스퀴즈 위험)
        """
        short_ratio = short_ratio or 0
        if short_ratio <= 0:
            return {"met": False, "reason": "공매도 데이터 없음"}
        WARNING = 5.0
        EXTREME = 10.0
        met = short_ratio >= WARNING
        if short_ratio >= EXTREME:
            reason = f"공매도 {short_ratio:.1f}% (극단: 숏스퀴즈 위험)"
        elif short_ratio >= WARNING:
            reason = f"공매도 {short_ratio:.1f}% (경고: 세력 집중)"
        else:
            reason = f"공매도 {short_ratio:.1f}% (정상)"
        return {"met": met, "reason": reason}

    def evaluate_stock(self, code: str) -> dict:
        """단일 종목 7개 기준 평가"""
        details = self.stock_details.get(code, {})
        cp_data = details.get("current_price", {})
        daily_chart = details.get("daily_chart", {})
        ohlcv = daily_chart.get("ohlcv", [])

        current_price = cp_data.get("current_price") or 0
        w52_high = cp_data.get("high_52week") or 0
        prev_close = cp_data.get("prev_close") or 0

        # 외국인/기관 수급 (추정치 우선)
        estimate = details.get("investor_trend_estimate") or {}
        if estimate.get("is_estimated"):
            est_data = estimate.get("estimated_data") or {}
            foreign_net = est_data.get("foreign_net") or 0
            institution_net = est_data.get("institution_net") or 0
        else:
            trend = (details.get("investor_trend") or {}).get("daily_investor_trend") or []
            today = trend[0] if trend else {}
            foreign_net = today.get("foreign_net") or 0
            institution_net = today.get("organ_net") or 0

        # 시가총액 (억원)
        market_cap = cp_data.get("market_cap") or 0

        # 프로그램 매매 순매수량 (일별 데이터 우선, 없으면 체결 데이터 fallback)
        prog_daily = details.get("program_trading_daily") or {}
        prog_daily_list = prog_daily.get("program_trading_daily") or []
        if prog_daily_list:
            # 일별 데이터: 최신일(첫 번째) 기준
            today_prog = prog_daily_list[0]
            program_net = today_prog.get("net_volume") or 0
        else:
            # fallback: 체결(실시간) 데이터 합산
            prog_data = details.get("program_trading") or {}
            prog_list = prog_data.get("program_trading") or []
            program_net = sum((p.get("net_volume") or 0) for p in prog_list)

        criteria = {
            "high_breakout": self.check_high_breakout(current_price, ohlcv, w52_high),
            "momentum_history": self.check_momentum_history(ohlcv),
            "resistance_breakout": self.check_resistance_breakout(current_price, prev_close),
            "ma_alignment": self.check_ma_alignment(current_price, ohlcv),
            "supply_demand": self.check_supply_demand(foreign_net, institution_net),
            "program_trading": self.check_program_trading(program_net),
            "top30_trading_value": self.check_top30_trading_value(code),
            "market_cap_range": self.check_market_cap(market_cap),
        }

        # 공매도 경고 (데이터가 있을 때만 추가)
        ss = self._short_selling.get(code)
        if ss and ss.get("short_ratio", 0) > 0:
            criteria["short_selling_alert"] = self.check_short_selling(ss["short_ratio"])

        # all_met에서 제외할 키 (부정적 지표, 메타 키)
        exclude_from_all_met = {"all_met", "short_selling_alert"}
        criteria["all_met"] = all(
            c["met"] for key, c in criteria.items()
            if key not in exclude_from_all_met and isinstance(c, dict)
        )

        return criteria

    def evaluate_all(self) -> dict:
        """전체 종목 평가"""
        result = {}
        for code in self.stock_details:
            result[code] = self.evaluate_stock(code)
        return result


def collect_short_selling_data(stock_codes: list[str]) -> dict:
    """전 종목 공매도 데이터 수집 (KIS API 개별 호출)

    rate limiter가 초당 20건이므로 0.05초 간격으로 호출.
    200개 종목 ≈ 10초, 400개 ≈ 20초.

    Returns:
        {종목코드: {"short_ratio": float, "short_qty": int}, ...}
    """
    import time
    from modules.kis_stock_detail import KISStockDetailAPI

    api = KISStockDetailAPI()
    result = {}
    total = len(stock_codes)

    print(f"공매도 데이터 수집: {total}개 종목")
    for i, code in enumerate(stock_codes):
        try:
            data = api.get_short_selling(code)
            if "error" not in data and data.get("short_ratio", 0) > 0:
                result[code] = data
        except Exception:
            pass

        if (i + 1) % 50 == 0:
            print(f"  진행: {i + 1}/{total}")

        time.sleep(0.05)

    print(f"공매도 데이터 수집 완료: {len(result)}개 종목 (비중 > 0)")
    return result


if __name__ == "__main__":
    raw_path = Path("results/kis/kis_latest.json")
    if not raw_path.exists():
        print("kis_latest.json 없음")
        exit(1)

    with open(raw_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 공매도 데이터 수집
    stock_codes = list(data.get("stock_details", {}).keys())
    short_selling = collect_short_selling_data(stock_codes)

    evaluator = CriteriaEvaluator(data, short_selling_data=short_selling)
    result = evaluator.evaluate_all()

    output_path = Path("results/kis/criteria_data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    # 요약 출력
    total = len(result)
    met_counts: dict[str, int] = {}
    all_met_count = 0
    short_alert_count = 0
    for code, c in result.items():
        if c.get("all_met"):
            all_met_count += 1
        if c.get("short_selling_alert", {}).get("met"):
            short_alert_count += 1
        for key in [
            "high_breakout", "momentum_history", "resistance_breakout",
            "ma_alignment", "supply_demand", "program_trading", "top30_trading_value",
            "market_cap_range",
        ]:
            if c.get(key, {}).get("met"):
                met_counts[key] = met_counts.get(key, 0) + 1

    print(f"기준 평가 완료: {total}개 종목")
    for key, count in met_counts.items():
        print(f"  {key}: {count}/{total}")
    print(f"  short_selling_alert: {short_alert_count}/{total}")
    print(f"  ALL MET: {all_met_count}/{total}")
    print(f"저장: {output_path}")
