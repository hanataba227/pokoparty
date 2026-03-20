/**
 * GET  /api/parties — 본인 저장 파티 목록 조회 (페이지네이션)
 * POST /api/parties — 파티 저장
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

/** 유저당 최대 저장 파티 수 */
const MAX_PARTIES = 30;

/** 허용되는 game_id 목록 */
const VALID_GAME_IDS = ["sword-shield"];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // 세션 이중 체크 (미들웨어가 이미 보호하지만)
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

    // 페이지네이션 파라미터
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)),
    );
    const offset = (page - 1) * limit;

    // 전체 개수 조회
    const { count } = await supabase
      .from("saved_parties")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // 파티 목록 조회 (최신순)
    const { data: parties, error: fetchError } = await supabase
      .from("saved_parties")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error("파티 목록 조회 오류:", fetchError);
      return NextResponse.json(
        { error: "파티 목록을 불러오는 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      parties: parties ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("파티 목록 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const { name, pokemon_ids, story_point_id, game_id } = body as {
      name: unknown;
      pokemon_ids: unknown;
      story_point_id: unknown;
      game_id: unknown;
    };

    // --- 입력 검증 ---

    // name 검증: 문자열, 1~50자, 공백만으로 구성 불가
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

    // pokemon_ids 검증: 정수 배열, 1~6개, 각 1~898, 중복 불허
    if (!Array.isArray(pokemon_ids)) {
      return NextResponse.json(
        { error: "포켓몬 목록이 올바르지 않습니다." },
        { status: 400 },
      );
    }
    if (pokemon_ids.length < 1 || pokemon_ids.length > 6) {
      return NextResponse.json(
        { error: "포켓몬은 1~6마리여야 합니다." },
        { status: 400 },
      );
    }
    for (const id of pokemon_ids) {
      if (!Number.isInteger(id) || id < 1 || id > 898) {
        return NextResponse.json(
          { error: "올바르지 않은 포켓몬 ID가 포함되어 있습니다." },
          { status: 400 },
        );
      }
    }
    // 중복 체크
    if (new Set(pokemon_ids).size !== pokemon_ids.length) {
      return NextResponse.json(
        { error: "중복된 포켓몬은 허용되지 않습니다." },
        { status: 400 },
      );
    }

    // game_id 검증
    if (typeof game_id !== "string" || !VALID_GAME_IDS.includes(game_id)) {
      return NextResponse.json(
        { error: "올바르지 않은 게임 ID입니다." },
        { status: 400 },
      );
    }

    // story_point_id 검증: 문자열 또는 null/undefined
    if (
      story_point_id !== undefined &&
      story_point_id !== null &&
      typeof story_point_id !== "string"
    ) {
      return NextResponse.json(
        { error: "올바르지 않은 스토리 포인트 ID입니다." },
        { status: 400 },
      );
    }

    // --- 유저당 최대 30개 제한 ---
    const { count } = await supabase
      .from("saved_parties")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count !== null && count >= MAX_PARTIES) {
      return NextResponse.json(
        { error: "저장 가능한 최대 파티 수(30개)를 초과했습니다." },
        { status: 409 },
      );
    }

    // --- 저장 ---
    const { data: party, error: insertError } = await supabase
      .from("saved_parties")
      .insert({
        user_id: user.id,
        name: name.trim(),
        pokemon_ids,
        story_point_id: story_point_id ?? null,
        game_id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("파티 저장 오류:", insertError);
      return NextResponse.json(
        { error: "파티 저장 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json(party, { status: 201 });
  } catch (error) {
    console.error("파티 저장 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
