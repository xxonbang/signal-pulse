"""
이미지 처리 및 파일 저장 관련 유틸리티
"""
from __future__ import annotations
import json
import base64
from datetime import datetime
from pathlib import Path
from PIL import Image
import io


def get_today_capture_dir(base_dir: Path) -> Path:
    """오늘 날짜의 캡처 디렉토리 반환"""
    today = datetime.now().strftime("%Y-%m-%d")
    capture_dir = base_dir / today
    capture_dir.mkdir(parents=True, exist_ok=True)
    return capture_dir


def resize_image(image_path: Path, max_width: int = 1280) -> bytes:
    """이미지 리사이징 (토큰 절약용)"""
    with Image.open(image_path) as img:
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="PNG", optimize=True)
        return buffer.getvalue()


def image_to_base64(image_path: Path, resize: bool = True) -> str:
    """이미지를 Base64로 인코딩"""
    if resize:
        image_bytes = resize_image(image_path)
    else:
        with open(image_path, "rb") as f:
            image_bytes = f.read()

    return base64.b64encode(image_bytes).decode("utf-8")


def save_json(data: dict, filepath: Path) -> None:
    """JSON 파일 저장"""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_json(filepath: Path) -> dict:
    """JSON 파일 로드"""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_json_response(text: str, debug: bool = False) -> dict | None:
    """AI 응답에서 JSON 파싱 (다양한 형식 지원)

    Args:
        text: AI 응답 텍스트
        debug: 디버깅 로그 출력 여부
    """
    import re

    if not text or not text.strip():
        if debug:
            print("[PARSE DEBUG] 빈 응답 텍스트")
        return None

    if debug:
        print(f"[PARSE DEBUG] 원본 응답 길이: {len(text)}자")

    # 시도할 JSON 문자열 후보들
    candidates = []
    candidate_sources = []

    # 1. 마크다운 코드블록에서 JSON 추출 (```json ... ``` 또는 ``` ... ```)
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if json_match:
        candidates.append(json_match.group(1).strip())
        candidate_sources.append("markdown_codeblock")
        if debug:
            print(f"[PARSE DEBUG] 마크다운 코드블록 발견: {len(json_match.group(1))}자")

    # 2. 균형 잡힌 중괄호로 JSON 객체 추출 (첫 번째 { 부터 매칭되는 } 까지)
    first_brace = text.find('{')
    if first_brace != -1:
        json_str = _extract_balanced_json(text[first_brace:])
        if json_str:
            candidates.append(json_str)
            candidate_sources.append("balanced_brace")
            if debug:
                print(f"[PARSE DEBUG] 균형 중괄호 JSON 추출: {len(json_str)}자")

    # 3. 원본 텍스트 그대로 (짧은 경우만)
    if len(text) < 50000:
        candidates.append(text.strip())
        candidate_sources.append("raw_text")

    if debug:
        print(f"[PARSE DEBUG] 파싱 후보 수: {len(candidates)}개")

    # 각 후보에 대해 파싱 시도
    for idx, (json_str, source) in enumerate(zip(candidates, candidate_sources)):
        if not json_str:
            continue

        # 첫 번째 시도: 그대로 파싱
        try:
            result = json.loads(json_str)
            if debug:
                print(f"[PARSE DEBUG] 성공 (후보 {idx+1}/{len(candidates)}, {source})")
            return result
        except json.JSONDecodeError as e:
            if debug:
                print(f"[PARSE DEBUG] 실패 (후보 {idx+1}, {source}): line {e.lineno} col {e.colno}")

        # 두 번째 시도: 특수문자 제거 후 파싱
        try:
            cleaned = re.sub(r'[\x00-\x1F\x7F]', '', json_str)
            result = json.loads(cleaned)
            if debug:
                print(f"[PARSE DEBUG] 성공 (후보 {idx+1}/{len(candidates)}, {source}, 클린업)")
            return result
        except json.JSONDecodeError:
            pass

    if debug:
        print(f"[PARSE DEBUG] 모든 파싱 시도 실패")
    return None


def _extract_balanced_json(text: str) -> str | None:
    """균형 잡힌 중괄호로 JSON 추출 (첫 번째 완전한 JSON 객체)"""
    if not text or text[0] != '{':
        return None

    depth = 0
    in_string = False
    escape_next = False

    for i, char in enumerate(text):
        if escape_next:
            escape_next = False
            continue

        if char == '\\' and in_string:
            escape_next = True
            continue

        if char == '"' and not escape_next:
            in_string = not in_string
            continue

        if in_string:
            continue

        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return text[:i + 1]

    return None


def generate_markdown_report(results: list, output_path: Path) -> None:
    """마크다운 리포트 생성"""
    lines = [
        "# AI 주식 분석 리포트",
        f"\n생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n",
        "| 종목명 | 코드 | 시그널 | 캡처 시각 | 분석 시각 | 분석 근거 |",
        "|--------|------|--------|-----------|-----------|----------|"
    ]

    for stock in results:
        name = stock.get("name", "N/A")
        code = stock.get("code", "N/A")
        signal = stock.get("signal", "N/A")
        capture_time = stock.get("capture_time", "N/A")
        analysis_time = stock.get("analysis_time", "N/A")
        reason = stock.get("reason", "N/A").replace("\n", " ")
        lines.append(f"| {name} | {code} | **{signal}** | {capture_time} | {analysis_time} | {reason} |")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
