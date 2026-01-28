"""
Gemini API 연동 및 프롬프트 관리
"""
from __future__ import annotations
import time
from datetime import datetime
from pathlib import Path
from google import genai

from config.settings import GEMINI_API_KEYS, GEMINI_MODEL, SIGNAL_CATEGORIES
from modules.utils import parse_json_response, resize_image


# 현재 사용 중인 API 키 인덱스
_current_key_index = 0
_failed_keys = set()


def get_next_api_key() -> tuple[str, int] | None:
    """다음 사용 가능한 API 키 반환"""
    global _current_key_index

    if not GEMINI_API_KEYS:
        print("[ERROR] Gemini API 키가 설정되지 않았습니다.")
        return None

    if len(_failed_keys) >= len(GEMINI_API_KEYS):
        print("[INFO] 모든 키가 실패 상태. 리셋 후 재시도...")
        _failed_keys.clear()

    for _ in range(len(GEMINI_API_KEYS)):
        if _current_key_index not in _failed_keys:
            key = GEMINI_API_KEYS[_current_key_index]
            return key, _current_key_index
        _current_key_index = (_current_key_index + 1) % len(GEMINI_API_KEYS)

    return None


def mark_key_failed(key_index: int):
    """키를 실패 상태로 표시"""
    _failed_keys.add(key_index)
    print(f"  [KEY #{key_index + 1}] 실패. 남은 키: {len(GEMINI_API_KEYS) - len(_failed_keys)}개")


def rotate_to_next_key():
    """다음 키로 로테이션"""
    global _current_key_index
    _current_key_index = (_current_key_index + 1) % len(GEMINI_API_KEYS)


# 분석 프롬프트
ANALYSIS_PROMPT = """이 이미지는 "{name}" (종목코드: {code})의 네이버 증권 상세 페이지입니다.

다음 작업을 수행하세요:

1. **데이터 추출**: 이미지에서 다음 정보를 추출하세요
   - 현재가, 전일대비, 등락률
   - 시가, 고가, 저가
   - 거래량, 거래대금

2. **기술적 분석**: 차트와 지표를 분석하여 투자 시그널을 결정하세요
   - 시그널: [적극매수, 매수, 중립, 매도, 적극매도] 중 하나

3. **분석 근거**: 시그널 결정의 근거를 2~3문장으로 설명하세요

다음 JSON 형식으로만 응답하세요:
```json
{{
  "name": "{name}",
  "code": "{code}",
  "current_price": "현재가",
  "change": "전일대비",
  "change_percent": "등락률",
  "signal": "시그널",
  "reason": "분석 근거"
}}
```
"""


def analyze_stock_image(image_path: Path, stock: dict, max_retries: int = 3) -> dict | None:
    """단일 종목 이미지 분석 (API 키 fallback 포함)"""

    for attempt in range(max_retries):
        key_info = get_next_api_key()
        if not key_info:
            print(f"  [ERROR] 사용 가능한 API 키가 없습니다.")
            return None

        api_key, key_index = key_info

        try:
            # 클라이언트 생성
            client = genai.Client(api_key=api_key)

            # 이미지 로드 및 리사이즈
            image_bytes = resize_image(image_path)

            # 프롬프트 생성
            prompt = ANALYSIS_PROMPT.format(name=stock["name"], code=stock["code"])

            # API 호출 (새 방식)
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    {
                        "role": "user",
                        "parts": [
                            {"inline_data": {"mime_type": "image/png", "data": image_bytes}},
                            {"text": prompt}
                        ]
                    }
                ]
            )

            # 응답 파싱
            result = parse_json_response(response.text)

            if result:
                if result.get("signal") not in SIGNAL_CATEGORIES:
                    result["signal"] = "중립"
                rotate_to_next_key()
                return result

            return None

        except Exception as e:
            error_msg = str(e)
            print(f"  [KEY #{key_index + 1}] 오류: {error_msg[:80]}")

            if "429" in error_msg or "quota" in error_msg.lower() or "rate" in error_msg.lower():
                mark_key_failed(key_index)
                rotate_to_next_key()
                time.sleep(1)
                continue

            # 모델 이름 오류시 다른 키로 재시도하지 않음
            if "404" in error_msg:
                return None

            return None

    print(f"  [ERROR] {max_retries}회 시도 후 실패")
    return None


def analyze_stocks(scrape_results: list[dict], capture_dir: Path) -> list[dict]:
    """여러 종목 분석"""
    print("\n=== Phase 3: AI 분석 ===\n")
    print(f"사용 가능한 API 키: {len(GEMINI_API_KEYS)}개\n")

    results = []

    for i, stock in enumerate(scrape_results, 1):
        if not stock.get("success"):
            continue

        name = stock["name"]
        code = stock["code"]
        image_path = capture_dir / f"{code}.png"

        if not image_path.exists():
            print(f"[{i}] {name}: 이미지 없음")
            continue

        print(f"[{i}/{len(scrape_results)}] {name} 분석 중...", end=" ")

        result = analyze_stock_image(image_path, stock)

        if result:
            # 캡처 시각 추가
            result["capture_time"] = stock.get("capture_time", "N/A")
            # 분석 완료 시각 추가
            result["analysis_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            results.append(result)
            print(f"-> {result.get('signal', 'N/A')}")
        else:
            print("-> 실패")

        time.sleep(0.5)

    print(f"\n분석 완료: {len(results)}개 종목")
    return results
