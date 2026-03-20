/**
 * API 라우트 공통 에러 메시지 추출
 * 데이터 파일 누락 에러는 원본 메시지를 반환하고,
 * 그 외에는 기본 메시지를 반환
 */
export function getApiErrorMessage(error: unknown, defaultMessage: string): string {
  return error instanceof Error &&
    error.message.includes("데이터 파일을 찾을 수 없습니다")
    ? error.message
    : defaultMessage;
}
