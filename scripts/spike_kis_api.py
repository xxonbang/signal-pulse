"""KIS API 엔드포인트 스파이크 테스트

KOSDAQ 지수 일봉과 공매도 현황 API 엔드포인트를 검증한다.

Usage:
    python scripts/spike_kis_api.py
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from modules.kis_client import KISClient


def test_kosdaq_index_chart(client: KISClient):
    """KOSDAQ 지수 일봉 조회 테스트"""
    print("=" * 60)
    print("TEST 1: KOSDAQ 지수 일봉 (업종 일별 시세)")
    print("=" * 60)

    end_date = datetime.now().strftime("%Y%m%d")
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y%m%d")

    path = "/uapi/domestic-stock/v1/quotations/inquire-daily-indexchartprice"
    tr_id = "FHKUP03500100"
    params = {
        "FID_COND_MRKT_DIV_CODE": "U",
        "FID_INPUT_ISCD": "2001",  # 코스닥 종합
        "FID_INPUT_DATE_1": start_date,
        "FID_INPUT_DATE_2": end_date,
        "FID_PERIOD_DIV_CODE": "D",
    }

    print(f"Path: {path}")
    print(f"TR_ID: {tr_id}")
    print(f"Params: {json.dumps(params, indent=2)}")
    print()

    try:
        data = client.request("GET", path, tr_id, params=params)
        rt_cd = data.get("rt_cd")
        msg = data.get("msg1", "")
        print(f"rt_cd: {rt_cd}, msg: {msg}")

        if rt_cd == "0":
            output1 = data.get("output1", {})
            output2 = data.get("output2", [])
            print(f"output1 keys: {list(output1.keys()) if output1 else 'N/A'}")
            print(f"output2 count: {len(output2)}")
            if output2:
                print(f"output2[0] sample: {json.dumps(output2[0], ensure_ascii=False, indent=2)}")
            print("\n>>> SUCCESS: KOSDAQ 지수 일봉 API 정상 작동")
        else:
            print(f"\n>>> FAIL: {msg}")
            print(f"Full response: {json.dumps(data, ensure_ascii=False, indent=2)}")
    except Exception as e:
        print(f"\n>>> ERROR: {e}")

    print()


def test_short_selling(client: KISClient, stock_code: str = "005930"):
    """공매도 일별 추이 조회 테스트"""
    print("=" * 60)
    print(f"TEST 2: 공매도 일별 추이 (종목: {stock_code})")
    print("=" * 60)

    end_date = datetime.now().strftime("%Y%m%d")

    path = "/uapi/domestic-stock/v1/quotations/daily-short-sale"
    tr_id = "FHPST04830000"
    params = {
        "FID_COND_MRKT_DIV_CODE": "J",
        "FID_INPUT_ISCD": stock_code,
        "FID_INPUT_DATE_1": end_date,
        "FID_INPUT_DATE_2": end_date,
    }

    print(f"Path: {path}")
    print(f"TR_ID: {tr_id}")
    print(f"Params: {json.dumps(params, indent=2)}")
    print()

    try:
        data = client.request("GET", path, tr_id, params=params)
        rt_cd = data.get("rt_cd")
        msg = data.get("msg1", "")
        print(f"rt_cd: {rt_cd}, msg: {msg}")

        if rt_cd == "0":
            output1 = data.get("output1", {})
            output2 = data.get("output2", [])
            print(f"output1: {json.dumps(output1, ensure_ascii=False, indent=2) if output1 else 'N/A'}")
            print(f"output2 count: {len(output2) if output2 else 0}")
            if output2:
                print(f"output2[0] sample: {json.dumps(output2[0], ensure_ascii=False, indent=2)}")
            # output 키만 있는 경우도 확인
            output = data.get("output", [])
            if output:
                print(f"output count: {len(output)}")
                print(f"output[0] sample: {json.dumps(output[0], ensure_ascii=False, indent=2)}")
            print("\n>>> SUCCESS: 공매도 API 정상 작동")
        else:
            print(f"\n>>> FAIL: {msg}")
            print(f"Full response: {json.dumps(data, ensure_ascii=False, indent=2)}")
    except Exception as e:
        print(f"\n>>> ERROR: {e}")

    print()


def main():
    print("KIS API Spike Test")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    client = KISClient()
    print(f"Token status: {client.get_token_status()}")
    print()

    test_kosdaq_index_chart(client)
    test_short_selling(client)

    print("=" * 60)
    print("All tests completed.")


if __name__ == "__main__":
    main()
