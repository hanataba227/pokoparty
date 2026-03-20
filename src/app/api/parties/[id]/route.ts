/**
 * PATCH  /api/parties/:id — 파티 이름 수정
 * DELETE /api/parties/:id — 파티 삭제
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();

    // 세션 이중 체크
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { name } = body as { name: unknown };

    // name 검증
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "파티 이름을 입력해주세요." },
        { status: 400 },
      );
    }
    if (name.length < 1 || name.length > 50) {
      return NextResponse.json(
        { error: "파티 이름은 1~50자여야 합니다." },
        { status: 400 },
      );
    }

    // 소유자 확인 (RLS가 처리하지만 서버에서도 확인)
    const { data: existing, error: fetchError } = await supabase
      .from("saved_parties")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "파티를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: "본인의 파티만 수정할 수 있습니다." },
        { status: 403 },
      );
    }

    // 수정
    const { data: updated, error: updateError } = await supabase
      .from("saved_parties")
      .update({ name: name.trim() })
      .eq("id", id)
      .select("id, name, updated_at")
      .single();

    if (updateError) {
      console.error("파티 수정 오류:", updateError);
      return NextResponse.json(
        { error: "파티 수정 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("파티 수정 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();

    // 세션 이중 체크
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 소유자 확인
    const { data: existing, error: fetchError } = await supabase
      .from("saved_parties")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "파티를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: "본인의 파티만 삭제할 수 있습니다." },
        { status: 403 },
      );
    }

    // 삭제
    const { error: deleteError } = await supabase
      .from("saved_parties")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("파티 삭제 오류:", deleteError);
      return NextResponse.json(
        { error: "파티 삭제 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("파티 삭제 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
