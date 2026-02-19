"""KOSDAQ 지수 정배열/역배열 판정 모듈

KIS API로 KOSDAQ 종합지수 일봉 데이터를 수집하고
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


def fetch_kosdaq_index(client: Any, days: int = 300) -> list[dict]:
    """KOSDAQ 종합지수 일봉 데이터 조회 (날짜 분할로 120일+ 확보)

    API가 1회 최대 50건을 반환하므로 날짜 범위를 분할하여 조회한다.

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
            "FID_INPUT_ISCD": "2001",
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


def evaluate_kosdaq_alignment(ohlcv: list[dict]) -> dict:
    """KOSDAQ 지수 정배열/역배열/혼조 판정

    Args:
        ohlcv: 최신순 정렬된 일봉 데이터

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

    def sma(data: list, period: int) -> float | None:
        if len(data) < period:
            return None
        return sum(data[-period:]) / period

    periods = [5, 10, 20, 60, 120]
    ma_values: dict[str, float | None] = {}
    for p in periods:
        ma_values[f"MA{p}"] = sma(closes, p)

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
        reason = f"KOSDAQ 정배열 (현재가>{checked})"
    elif is_bearish:
        status = "bearish"
        checked = "<".join(f"MA{p}" for p, _ in available)
        reason = f"KOSDAQ 역배열 (현재가<{checked})"
    else:
        status = "mixed"
        reason = "KOSDAQ 혼조 (정배열도 역배열도 아님)"

    return {
        "status": status,
        "current": round(current, 2),
        "ma_values": ma_display,
        "reason": reason,
    }


def evaluate_and_save(client: Any, output_dir: str = "results/kis") -> dict:
    """KOSDAQ 지수 상태 평가 및 저장"""
    print("=== KOSDAQ 지수 상태 평가 ===")

    ohlcv = fetch_kosdaq_index(client)
    print(f"KOSDAQ 일봉 데이터: {len(ohlcv)}일")

    result = evaluate_kosdaq_alignment(ohlcv)
    result["evaluated_at"] = datetime.now(KST).isoformat()
    result["data_days"] = len(ohlcv)

    output_path = Path(output_dir) / "market_status.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"상태: {result['status']}")
    print(f"현재: {result.get('current', 'N/A')}")
    print(f"사유: {result['reason']}")
    print(f"MA: {result['ma_values']}")
    print(f"저장: {output_path}")

    return result


if __name__ == "__main__":
    from modules.kis_client import KISClient

    client = KISClient()
    evaluate_and_save(client)
