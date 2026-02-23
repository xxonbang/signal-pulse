"""
거시 환경 데이터 수집 및 프롬프트 주입
- Gemini 1회 호출로 시장 동향 요약
- market_status.json 읽어서 KOSDAQ 정배열/역배열 정보 반환
"""
from __future__ import annotations

import json
import time
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
    """market_status.json 읽어서 1줄 요약 반환

    파일 없거나 읽기 실패 시 빈 문자열.
    """
    path = results_dir / "kis" / "market_status.json"
    if not path.exists():
        return ""

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        reason = data.get("reason", "")
        if reason:
            return reason
        return ""

    except Exception as e:
        print(f"[MACRO] market_status.json 읽기 실패: {e}")
        return ""


def build_macro_context(results_dir: Path) -> str:
    """거시 환경 데이터를 합쳐서 프롬프트용 텍스트 생성

    둘 다 비어있으면 빈 문자열 반환 (기존 동작과 동일).
    """
    summary = fetch_macro_summary()
    status = load_market_status(results_dir)

    parts = [p for p in [summary, status] if p]
    if not parts:
        return ""

    return "## 0. 시장 환경\n" + "\n".join(parts) + "\n\n"
