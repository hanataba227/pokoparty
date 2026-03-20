import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect = requestUrl.searchParams.get("redirect");

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // redirect 쿼리 파라미터가 있으면 해당 경로로 리다이렉트 (상대경로만 허용)
  const redirectPath = redirect && redirect.startsWith("/") && !redirect.startsWith("//")
    ? redirect
    : "/";
  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
