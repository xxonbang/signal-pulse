📑 System Architecture: AI Vision Stock Signal Analyzer (AVSSA)

1. Overview

이 시스템은 네이버 증권의 실시간 시장 데이터를 브라우저 자동화(Playwright)를 통해 시각적으로 수집하고, Gemini 2.5 Flash의 대규모 컨텍스트 및 Vision 기능을 활용하여 국내 주식 상위 100개 종목에 대한 투자 시그널을 도출하는 자동화 파이프라인이다.

2. Tech Stack

Automation: Playwright (Headless Browser)

AI Engine: Google Gemini 2.5 Flash (Vision API)

Environment: GitHub Actions (Scheduler) or Local Desktop

Output: Markdown Report / JSON Data

3. System Workflow (Logic Chain)

Phase 1: Market Data Scraping (List Up)

Target URL: https://stock.naver.com/market/stock/kr/stocklist/trading

Action:

'코스피' 탭 선택 -> 상위 50개 종목의 종목명 및 6자리 코드 추출.

'코스닥' 탭 선택 -> 상위 50개 종목의 종목명 및 6자리 코드 추출.

Output: 총 100개의 종목 코드 리스트.

Phase 2: Visual Evidence Collection (Screenshot)

Target URL Pattern: https://stock.naver.com/domestic/stock/{symbol_code}/price

Action:

각 종목 페이지 접속 후 페이지 로딩 대기.

Screenshot Area: 전체 화면(full screen) 캡처.

Optimization: Gemini 전송 최적화를 위해 이미지 크기를 조정하고 ./captures/{yyyy-mm-dd}/{code}.png 경로에 저장.

Performance: 100개 종목 순회 시 타임아웃 방지를 위한 비동기 처리(Asyncio) 적용.

Phase 3: AI Vision Batch Processing (Analysis)

AI Model: Gemini 2.5 Flash

Action:

저장된 100장의 이미지를 한 번의 API 호출에 포함(Batch Payload).

Input: 100장의 이미지 + Structured Prompt.

Analysis Scope: 이미지 내 시가/종가, 이동평균선(MA), 차트 패턴, 거래량 변화율 분석. (전일, 시가, 고가, 저가, 거래량, 대금, 시총, 외인소진율, PER, EPS, 추정PER, 추정EPS, PBR, BPS, 배당수익률, 주당배당금, 컨센서스, 목표주가, 차트, 거래량, 호가, 시세, 투자자별 매매동향)

Phase 4: Signal Derivation & Reporting

Output Schema:

종목명(코드): [시그널]

분석 근거: 2~3줄 요약 설명.

Signal Categories: [적극매수, 매수, 중립, 매도, 적극매도]

AI에게 전달할 핵심 프롬프트 가이드라인입니다.

System Prompt:

"너는 20년 경력의 대한민국 주식 시장 전문 퀀트 애널리스트다. 제공된 100장의 이미지는 각각 네이버 증권의 종목별 주가 상세 정보 화면이다."

User Instructions:

각 이미지에서 시가/종가, 이동평균선(MA), 차트 패턴, 거래량 변화율 등 모든 지표(전일, 시가, 고가, 저가, 거래량, 대금, 시총, 외인소진율, PER, EPS, 추정PER, 추정EPS, PBR, BPS, 배당수익률, 주당배당금, 컨센서스, 목표주가, 차트, 거래량, 호가, 시세, 투자자별 매매동향)를 정확히 추출하라.

기술적 분석 관점에서 [적극매수, 매수, 중립, 매도, 적극매도] 중 하나의 시그널을 결정하라.

분석 근거는 반드시 이미지에서 확인되는 지표(예: '20일선 돌파', '거래량 폭증' 등)를 바탕으로 2~3문장으로 간결하게 설명하라.

최종 결과는 한국어로 작성하며, 마크다운 테이블 형식을 유지하라.

6. Technical Considerations (AI Tool 지시 사항)

Playwright Stealth: 네이버 금융의 봇 탐지 방지를 위해 playwright-stealth 라이브러리를 사용하거나 브라우저 유저 에이전트(User-Agent)를 최신 Chrome 버전으로 설정할 것.

Rate Limiting: Gemini API 호출 시 이미지 100장을 한 번에 보내는 양이 크므로 Request too large 에러 발생 시 20~30장 단위로 분할(Chunking)하여 전송할 것.

Wait Strategies: 페이지 이동 후 차트 컴포넌트가 완전히 렌더링될 때까지 wait_for_selector 또는 wait_for_load_state를 적절히 사용할 것.

Image Compression: 토큰 절약을 위해 캡처 후 이미지 해상도를 적절히 리사이징(예: 가로 1280px)하여 전송할 것.

7. Github.io 화면 구성
   - gemini로부터 response 받은 내용을 기반으로 github.io에 배포할 화면을 생성
   - 화면의 look & feel은 shadcn을 참고하고, css 작업은 tailwind를 사용
