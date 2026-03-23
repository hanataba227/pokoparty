import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect = requestUrl.searchParams.get("redirect");
  const mode = requestUrl.searchParams.get("mode"); // "login" | "signup"

  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const isNewUser = !user.user_metadata?.display_name;

      if (isNewUser && mode === "login") {
        // 로그인 의도인데 미가입 계정 → 자동 생성된 유저 삭제 후 안내
        await supabase.auth.signOut();
        const adminSupabase = createAdminSupabase();
        await adminSupabase.auth.admin.deleteUser(user.id);

        const loginUrl = new URL("/login", requestUrl.origin);
        loginUrl.searchParams.set("error", "no_account");
        return NextResponse.redirect(loginUrl);
      }

      if (!isNewUser && mode === "signup") {
        // 회원가입 의도인데 이미 가입된 계정 → 세션 종료 후 안내
        await supabase.auth.signOut();

        const signupUrl = new URL("/signup", requestUrl.origin);
        signupUrl.searchParams.set("error", "already_registered");
        return NextResponse.redirect(signupUrl);
      }

      if (isNewUser) {
        // 신규 OAuth 유저 → 프로필 행 보장 후 온보딩으로 리다이렉트
        const adminSupabase = createAdminSupabase();
        await adminSupabase.from("profiles").upsert(
          { id: user.id, display_name: "트레이너" },
          { onConflict: "id", ignoreDuplicates: true },
        );
        return NextResponse.redirect(new URL("/onboarding", requestUrl.origin));
      }
    }
  }

  // redirect 쿼리 파라미터가 있으면 해당 경로로 리다이렉트 (상대경로만 허용)
  const redirectPath = redirect && redirect.startsWith("/") && !redirect.startsWith("//")
    ? redirect
    : "/";
  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
