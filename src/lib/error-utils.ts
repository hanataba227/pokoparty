/**
 * 클라이언트 에러 메시지 추출 유틸
 */

/** unknown 에러에서 사용자 표시용 메시지를 추출합니다. */
export function getClientErrorMessage(err: unknown, fallback = '알 수 없는 오류'): string {
  if (err instanceof Error) return err.message;
  return fallback;
}
