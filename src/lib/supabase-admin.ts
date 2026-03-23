import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin 클라이언트 (service_role 키 사용)
 * 서버 전용 — Auth 유저 삭제 등 관리 작업에 사용
 */
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
