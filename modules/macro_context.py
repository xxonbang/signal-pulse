"""
거시 환경 데이터 수집 및 프롬프트 주입
- Gemini 1회 호출로 시장 동향 요약
- market_status.json 읽어서 KOSDAQ 정배열/역배열 정보 반환
"""
from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

from google import genai
from google.genai import types
from google.genai.errors import ClientError, ServerError

from config.settings import GEMINI_MODEL_LITE


def fetch_macro_summary() -> str:
    """Gemini 1회 호출로 한국/글로벌 시장 동향 요약 (3~4문장, ~400자)

    실패 시 빈 문자열 반환 (분석 중단 없음).
    """
    # 순환 임포트 방지
    from modules.ai_engine import get_next_api_key, mark_success

    key_info = get_next_api_key()
    if not key_info:
        print("[MACRO] API 키 없음. 시장 동향 수집 스킵.")
        return ""

    api_key, key_index = key_info

    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=60_000),
        )

        response = client.models.generate_content(
            model=GEMINI_MODEL_LITE,
            contents=[{
                "role": "user",
                "parts": [{"text": "오늘 한국 및 글로벌 주식시장 동향을 3~4문장으로 요약해주세요. 핵심 이슈와 시장 분위기 위주로 간결하게 작성하세요."}],
            }],
            config={
                "max_output_tokens": 512,
                "tools": [{"google_search": {}}],
            },
        )

        text = (response.text or "").strip()
        if text:
            print(f"[MACRO] 시장 동향 수집 완료 ({len(text)}자)")
            mark_success(key_index)
        return text

    except (ClientError, ServerError, Exception) as e:
        print(f"[MACRO] 시장 동향 수집 실패 (스킵): {type(e).__name__}: {str(e)[:100]}")
        return ""


def load_market_status(results_dir: Path) -> str:
    """market_status.json 읽어서 KOSPI/KOSDAQ 요약 반환

    파일 구조: {kospi: {reason, signal_adjustment, ...}, kosdaq: {reason, signal_adjustment, ...}}
    파일 없거나 읽기 실패 시 빈 문자열.
    """
    path = results_dir / "kis" / "market_status.json"
    if not path.exists():
        return ""

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        parts = []
        for market_key in ("kospi", "kosdaq"):
            market_data = data.get(market_key, {})
            reason = market_data.get("reason", "")
            adj = market_data.get("signal_adjustment", 0)
            if reason:
                adj_str = f"(시그널 보정: {adj:+.1f})" if adj != 0 else ""
                parts.append(f"- {reason} {adj_str}".strip())

        return "\n".join(parts) if parts else ""

    except Exception as e:
        print(f"[MACRO] market_status.json 읽기 실패: {e}")
        return ""


_FEAR_GREED_RATING_KR = {
    "extreme fear": "극단적 공포",
    "fear": "공포",
    "neutral": "중립",
    "greed": "탐욕",
    "extreme greed": "극단적 탐욕",
}


def fetch_fear_greed_index(results_dir: Path | None = None) -> str:
    """CNN Fear & Greed 지수 수집

    results_dir이 주어지면 results_dir/kis/fear_greed.json에 저장.
    실패 시 빈 문자열 반환 (분석 중단 없음).
    """
    url = "https://production.dataviz.cnn.io/index/fearandgreed/current"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://edition.cnn.com/markets/fear-and-greed",
        "Origin": "https://edition.cnn.com",
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        score = data.get("score", 0)
        rating = data.get("rating", "")

        # JSON 저장 (프론트엔드용)
        if results_dir:
            save_path = results_dir / "kis" / "fear_greed.json"
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

        # 프롬프트용 텍스트
        rating_kr = _FEAR_GREED_RATING_KR.get(rating, rating)
        text = f"- CNN Fear & Greed 지수: {score:.1f} ({rating_kr})"
        prev_close = data.get("previous_close")
        prev_1w = data.get("previous_1_week")
        if prev_close is not None:
            text += f", 전일: {prev_close:.1f}"
        if prev_1w is not None:
            text += f", 1주전: {prev_1w:.1f}"

        print(f"[MACRO] Fear & Greed 수집 완료: {score:.1f} ({rating_kr})")
        return text

    except Exception as e:
        print(f"[MACRO] Fear & Greed 수집 실패 (스킵): {type(e).__name__}: {str(e)[:100]}")
        return ""


def build_macro_context(results_dir: Path) -> str:
    """거시 환경 데이터를 합쳐서 프롬프트용 텍스트 생성

    둘 다 비어있으면 빈 문자열 반환 (기존 동작과 동일).
    """
    summary = fetch_macro_summary()
    status = load_market_status(results_dir)
    fear_greed = fetch_fear_greed_index(results_dir)

    parts = [p for p in [summary, status, fear_greed] if p]
    if not parts:
        return ""

    return "## 0. 시장 환경\n" + "\n".join(parts) + "\n\n"
