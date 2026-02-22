/**
 * 한국어 초성 검색 유틸리티
 * - 초성으로 검색: "ㅅㅅㅈㅈ" → "삼성전자" 매칭
 * - 일반 텍스트 검색도 지원 (종목명, 종목코드)
 */

// 초성 목록 (19개)
const CHOSUNG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

/** 한글 문자의 초성 추출. 한글이 아니면 원문자 반환. */
function getChosung(char: string): string {
  const code = char.charCodeAt(0);
  // 한글 완성형 범위: 0xAC00 ~ 0xD7A3
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return CHOSUNG[Math.floor((code - 0xAC00) / (21 * 28))];
  }
  return char;
}

/** 문자열에서 초성만 추출 */
function extractChosung(text: string): string {
  return [...text].map(getChosung).join('');
}

/** 검색어가 초성만으로 이루어져 있는지 확인 */
function isChosungOnly(query: string): boolean {
  return [...query].every((ch) => CHOSUNG.includes(ch));
}

/**
 * 종목 검색 매칭
 * - 종목코드 포함 여부
 * - 종목명 포함 여부 (대소문자 무시)
 * - 초성 검색 (검색어가 초성만일 때)
 */
export function matchStock(query: string, name: string, code: string): boolean {
  if (!query) return true;

  const q = query.trim().toLowerCase();
  if (!q) return true;

  // 종목코드 매칭
  if (code.includes(q)) return true;

  // 종목명 일반 매칭
  if (name.toLowerCase().includes(q)) return true;

  // 초성 검색: 검색어가 초성만으로 구성된 경우
  if (isChosungOnly(q)) {
    const nameChosung = extractChosung(name);
    return nameChosung.includes(q);
  }

  return false;
}
