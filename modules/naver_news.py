"""
네이버 뉴스 API 모듈
종목별 최신 뉴스 수집
"""
import os
import re
import time
import requests
from datetime import datetime
from html import unescape
from typing import Dict, List, Any, Optional


class NaverNewsAPI:
    """네이버 검색 API를 활용한 뉴스 수집"""

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        request_delay: float = 0.1,
        max_retries: int = 3,
    ):
        self.client_id = client_id or os.getenv("NAVER_CLIENT_ID", "")
        self.client_secret = client_secret or os.getenv("NAVER_CLIENT_SECRET", "")
        self.api_url = "https://openapi.naver.com/v1/search/news.json"
        self.request_delay = request_delay
        self.max_retries = max_retries
        self._last_request_time = 0

    def is_configured(self) -> bool:
        """API 키가 설정되어 있는지 확인"""
        return bool(self.client_id and self.client_secret)

    def _wait_for_rate_limit(self):
        """Rate limit 대응을 위한 딜레이"""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.request_delay:
            time.sleep(self.request_delay - elapsed)
        self._last_request_time = time.time()

    def _clean_html(self, text: str) -> str:
        """HTML 태그 및 특수문자 제거"""
        if not text:
            return ""
        # HTML 엔티티 디코딩 (&amp; -> &, &lt; -> < 등)
        text = unescape(text)
        # HTML 태그 제거
        text = re.sub(r'<[^>]+>', '', text)
        # 연속 공백 제거
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _parse_date(self, date_str: str) -> str:
        """날짜 문자열 파싱

        입력: "Mon, 02 Feb 2026 14:30:00 +0900"
        출력: "02-02 14:30"
        """
        try:
            dt = datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %z")
            return dt.strftime("%m-%d %H:%M")
        except Exception:
            return date_str[:16] if date_str else ""

    def search_news(
        self,
        query: str,
        display: int = 3,
        sort: str = "date",
    ) -> List[Dict[str, Any]]:
        """뉴스 검색

        Args:
            query: 검색어 (종목명)
            display: 검색 결과 개수 (최대 100)
            sort: 정렬 방식 (date: 최신순, sim: 정확도순)

        Returns:
            뉴스 리스트
        """
        if not self.is_configured():
            return []

        self._wait_for_rate_limit()

        headers = {
            "X-Naver-Client-Id": self.client_id,
            "X-Naver-Client-Secret": self.client_secret,
        }

        params = {
            "query": query,
            "display": display,
            "start": 1,
            "sort": sort,
        }

        for attempt in range(self.max_retries):
            try:
                response = requests.get(
                    self.api_url,
                    headers=headers,
                    params=params,
                    timeout=10,
                )

                if response.status_code == 200:
                    data = response.json()
                    items = data.get("items", [])

                    # 데이터 정제
                    cleaned_items = []
                    for item in items:
                        cleaned_items.append({
                            "title": self._clean_html(item.get("title", "")),
                            "link": item.get("link", ""),
                            "description": self._clean_html(item.get("description", "")),
                            "pubDate": self._parse_date(item.get("pubDate", "")),
                            "originallink": item.get("originallink", ""),
                        })
                    return cleaned_items

                elif response.status_code == 429:
                    # Rate limit - exponential backoff
                    wait_time = (2 ** attempt) * 0.5
                    if attempt < self.max_retries - 1:
                        print(f"  [WARN] Rate limit, 재시도 대기 {wait_time}초...")
                        time.sleep(wait_time)
                        continue
                    else:
                        print("  [ERROR] Rate limit 초과: 최대 재시도 횟수 도달")
                        return []

                else:
                    print(f"  [ERROR] API 응답 에러: {response.status_code}")
                    return []

            except requests.exceptions.Timeout:
                print(f"  [WARN] 타임아웃, 재시도 {attempt + 1}/{self.max_retries}")
                if attempt < self.max_retries - 1:
                    time.sleep(1)
                    continue
                return []

            except Exception as e:
                print(f"  [ERROR] 요청 실패: {e}")
                return []

        return []

    def get_stock_news(self, stock_name: str, count: int = 3) -> List[Dict]:
        """종목명으로 뉴스 검색

        Args:
            stock_name: 종목명 (예: "삼성전자")
            count: 뉴스 개수

        Returns:
            뉴스 리스트
        """
        # 종목명 + "주식" 키워드 추가하여 관련성 높이기
        return self.search_news(f"{stock_name} 주식", display=count, sort="date")

    def get_multiple_stocks_news(
        self,
        stocks: List[Dict[str, Any]],
        news_count: int = 3,
    ) -> Dict[str, List[Dict]]:
        """여러 종목의 뉴스 일괄 수집

        Args:
            stocks: 종목 리스트 [{"code": "005930", "name": "삼성전자"}, ...]
            news_count: 종목당 뉴스 개수

        Returns:
            {종목코드: [뉴스리스트], ...}
        """
        result = {}
        total = len(stocks)

        for idx, stock in enumerate(stocks, 1):
            code = stock.get("code", "")
            name = stock.get("name", "")

            if not name:
                continue

            if idx % 10 == 0 or idx == 1:
                print(f"  뉴스 수집 중... {idx}/{total}")

            news = self.get_stock_news(name, count=news_count)
            result[code] = news

        return result


def collect_news_for_stocks(stocks: List[Dict[str, Any]], news_count: int = 3) -> Dict[str, List[Dict]]:
    """종목 리스트에 대한 뉴스 수집 (외부 호출용)

    Args:
        stocks: 종목 리스트
        news_count: 종목당 뉴스 개수

    Returns:
        {종목코드: [뉴스리스트], ...}
    """
    api = NaverNewsAPI()

    if not api.is_configured():
        print("  [SKIP] 네이버 API 키가 설정되지 않아 뉴스 수집을 건너뜁니다")
        return {}

    print(f"  네이버 뉴스 API로 {len(stocks)}개 종목 뉴스 수집 시작")
    return api.get_multiple_stocks_news(stocks, news_count)
