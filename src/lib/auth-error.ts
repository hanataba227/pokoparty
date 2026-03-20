/** Supabase Auth 에러 코드 → 한국어 메시지 매핑 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  user_already_exists: "이미 가입된 이메일입니다.",
  weak_password: "비밀번호는 8자 이상이어야 합니다.",
  email_not_confirmed:
    "이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.",
  over_request_limit: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  invalid_email: "올바른 이메일 형식을 입력해주세요.",
  session_expired: "세션이 만료되었습니다. 다시 로그인해주세요.",
};

const NETWORK_ERROR_MESSAGE =
  "서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.";

/**
 * Supabase AuthError에서 한국어 메시지를 추출한다.
 */
export function getAuthErrorMessage(error: {
  code?: string;
  message?: string;
}): string {
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }
  if (error.message?.includes("fetch")) {
    return NETWORK_ERROR_MESSAGE;
  }
  return error.message ?? "알 수 없는 오류가 발생했습니다.";
}

/** 비밀번호 클라이언트 사전 검증 (영문+숫자 8~72자) */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (password.length > 72) return "비밀번호는 72자 이하여야 합니다.";
  if (!/[a-zA-Z]/.test(password))
    return "비밀번호에 영문자를 포함해주세요.";
  if (!/[0-9]/.test(password))
    return "비밀번호에 숫자를 포함해주세요.";
  return null;
}
