"""KOSPI/KOSDAQ 지수 정배열/역배열 판정 모듈

KIS API로 KOSPI/KOSDAQ 종합지수 일봉 데이터를 수집하고
이동평균선 정배열/역배열/혼조 상태를 판정한다.
결과를 results/kis/market_status.json에 저장.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

KST = timezone(timedelta(hours=9))

# 지수 코드: KOSPI=0001, KOSDAQ=2001
INDEX_CODES = {
    "kospi": ("0001", "KOSPI"),
    "kosdaq": ("2001", "KOSDAQ"),
}


def _parse_index_output(output2: list) -> list[dict]:
    """API output2를 OHLCV 리스트로 변환"""
    ohlcv = []
    for item in output2:
        close = float(item.get("bstp_nmix_prpr") or 0)
        if close <= 0:
            continue
        ohlcv.append({
            "date": item.get("stck_bsop_date", ""),
            "close": close,
            "open": float(item.get("bstp_nmix_oprc") or 0),
            "high": float(item.get("bstp_nmix_hgpr") or 0),
            "low": float(item.get("bstp_nmix_lwpr") or 0),
            "volume": int(item.get("acml_vol") or 0),
        })
    return ohlcv


def fetch_index_data(client: Any, index_code: str, days: int = 300) -> list[dict]:
    """지수 일봉 데이터 조회 (날짜 분할로 120일+ 확보)

    Args:
        client: KISClient 인스턴스
        index_code: 지수 코드 (0001=KOSPI, 2001=KOSDAQ)
        days: 조회 캘린더일 수

    Returns:
        최신순 정렬된 일봉 리스트 [{date, close, open, high, low, volume}, ...]
    """
    path = "/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice"
    tr_id = "FHKUP03500100"

    now = datetime.now(KST)
    all_data: dict[str, dict] = {}  # date -> ohlcv (중복 제거용)

    # 날짜 범위를 70일씩 분할 (50거래일 ≈ 70캘린더일)
    chunk_days = 70
    for i in range(0, days, chunk_days):
        end_dt = now - timedelta(days=i)
        start_dt = now - timedelta(days=i + chunk_days)

        params = {
            "FID_COND_MRKT_DIV_CODE": "U",
            "FID_INPUT_ISCD": index_code,
            "FID_INPUT_DATE_1": start_dt.strftime("%Y%m%d"),
            "FID_INPUT_DATE_2": end_dt.strftime("%Y%m%d"),
            "FID_PERIOD_DIV_CODE": "D",
        }

        result = client.request("GET", path, tr_id, params=params)
        if result.get("rt_cd") != "0":
            break

        items = _parse_index_output(result.get("output2", []))
        for item in items:
            all_data[item["date"]] = item

        if len(all_data) >= 130:  # MA120 + 여유
            break

        time.sleep(0.05)

    # 최신순 정렬
    ohlcv = sorted(all_data.values(), key=lambda x: x["date"], reverse=True)
    return ohlcv


def evaluate_alignment(ohlcv: list[dict], market_name: str) -> dict:
    """지수 정배열/역배열/혼조 판정

    Args:
        ohlcv: 최신순 정렬된 일봉 데이터
        market_name: 시장 이름 (KOSPI/KOSDAQ)

    Returns:
        {status: "bullish"|"bearish"|"mixed", current, ma_values, reason}
    """
    if not ohlcv:
        return {"status": "unknown", "reason": "데이터 없음", "ma_values": {}}

    current = ohlcv[0]["close"]

    # ohlcv는 최신순 → 역순으로 close 추출
    closes = [d["close"] for d in reversed(ohlcv) if d["close"] > 0]

    if len(closes) < 20:
        return {
            "status": "unknown",
            "current": current,
            "reason": f"데이터 부족 ({len(closes)}일)",
            "ma_values": {},
        }

    def ema(data: list, period: int) -> float | None:
        if len(data) < period:
            return None
        k = 2 / (period + 1)
        result = sum(data[:period]) / period
        for price in data[period:]:
            result = price * k + result * (1 - k)
        return result

    periods = [5, 10, 20, 60, 120]
    ma_values: dict[str, float | None] = {}
    for p in periods:
        ma_values[f"MA{p}"] = ema(closes, p)

    available = [(p, ma_values[f"MA{p}"]) for p in periods if ma_values[f"MA{p}"] is not None]
    ma_display = {f"MA{p}": round(v, 2) for p, v in available}

    # 정배열: 현재가 > MA5 > MA10 > MA20 > ...
    vals = [current] + [v for _, v in available]
    is_bullish = all(vals[i] > vals[i + 1] for i in range(len(vals) - 1))

    # 역배열: 현재가 < MA5 < MA10 < MA20 < ...
    is_bearish = all(vals[i] < vals[i + 1] for i in range(len(vals) - 1))

    if is_bullish:
        status = "bullish"
        checked = ">".join(f"MA{p}" for p, _ in available)
        reason = f"{market_name} 정배열 (현재가>{checked})"
    elif is_bearish:
        status = "bearish"
        checked = "<".join(f"MA{p}" for p, _ in available)
        reason = f"{market_name} 역배열 (현재가<{checked})"
    else:
        status = "mixed"
        reason = f"{market_name} 혼조 (정배열도 역배열도 아님)"

    return {
        "status": status,
        "current": round(current, 2),
        "ma_values": ma_display,
        "reason": reason,
    }


def evaluate_and_save(client: Any, output_dir: str = "results/kis") -> dict:
    """KOSPI/KOSDAQ 지수 상태 평가 및 저장"""
    result = {}

    for key, (code, name) in INDEX_CODES.items():
        print(f"=== {name} 지수 상태 평가 ===")
        ohlcv = fetch_index_data(client, code)
        print(f"{name} 일봉 데이터: {len(ohlcv)}일")

        evaluation = evaluate_alignment(ohlcv, name)
        evaluation["evaluated_at"] = datetime.now(KST).isoformat()
        evaluation["data_days"] = len(ohlcv)

        print(f"상태: {evaluation['status']}")
        print(f"현재: {evaluation.get('current', 'N/A')}")
        print(f"사유: {evaluation['reason']}")
        print(f"MA: {evaluation['ma_values']}")

        result[key] = evaluation

    output_path = Path(output_dir) / "market_status.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"저장: {output_path}")
    return result


# 하위 호환: 기존 함수명 유지
fetch_kosdaq_index = lambda client, days=300: fetch_index_data(client, "2001", days)
evaluate_kosdaq_alignment = lambda ohlcv: evaluate_alignment(ohlcv, "KOSDAQ")


if __name__ == "__main__":
    from modules.kis_client import KISClient

    client = KISClient()
    evaluate_and_save(client)
