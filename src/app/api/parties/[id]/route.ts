/**
 * GET    /api/parties/:id — 파티 상세 조회
 * PATCH  /api/parties/:id — 파티 이름/메모 수정
 * DELETE /api/parties/:id — 파티 삭제
 *
 * 참고: 이 파일의 핸들러는 두 번째 인자(params)를 받아야 하므로
 * withRateLimit 래퍼 대신 checkRateLimit를 직접 사용합니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { getApiErrorMessage } from "@/lib/api-error";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { loadPokemonData, loadTypeChart, loadAllPokemonNames } from "@/lib/data-loader";
import { analyzeParty } from "@/lib/party-analysis";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** rate limit 체크 헬퍼 — 초과 시 429 응답을 반환, 허용 시 null */
function enforceRateLimit(request: NextRequest): NextResponse | null {
  const { allowed } = checkRateLimit(getRateLimitKey(request));
  if (!allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": "0" } },
    );
  }
  return null;
}

/** 파티 소유권 확인 — 404/403 시 에러 응답 반환, 정상이면 null */
async function verifyOwnership(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  partyId: string,
  userId: string,
  action: "조회" | "수정" | "삭제",
): Promise<NextResponse | null> {
  const { data: existing, error: fetchError } = await supabase
    .from("saved_parties")
    .select("id, user_id")
    .eq("id", partyId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "파티를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (existing.user_id !== userId) {
    return NextResponse.json(
      { error: `본인의 파티만 ${action}할 수 있습니다.` },
      { status: 403 },
    );
  }

  return null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const supabase = await createServerSupabase();

    // 파티 조회
    const { data: party, error: fetchError } = await supabase
      .from("saved_parties")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !party) {
      return NextResponse.json(
        { error: "파티를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // party_analysis 조회
    const { data: analysisRow } = await supabase
      .from("party_analysis")
      .select("*")
      .eq("party_id", id)
      .single();

    // 데이터 로드
    const allPokemon = loadPokemonData();
    const typeChart = loadTypeChart();
    const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));
    const allNames = loadAllPokemonNames();

    // 포켓몬 상세 정보 조립
    const pokemonIds: number[] = party.pokemon_ids;
    const pokemonDetails = pokemonIds.map((pid) => {
      const p = pokemonMap.get(pid);
      return {
        id: pid,
        name_ko: allNames.get(pid) ?? `#${pid}`,
        types: p?.types ?? [],
      };
    });

    let analysis;

    if (analysisRow) {
      // 저장된 분석 결과 사용
      analysis = {
        grade: analysisRow.grade,
        total_score: analysisRow.total_score,
        offense_score: analysisRow.offense_score,
        defense_score: analysisRow.defense_score,
        diversity_score: analysisRow.diversity_score,
        coverage: analysisRow.coverage,
        weaknesses: analysisRow.weaknesses,
        resistances: analysisRow.resistances,
        suggestions: analysisRow.suggestions,
        analyzed_at: analysisRow.analyzed_at,
      };
    } else {
      // lazy 생성: 분석 계산 → INSERT → 반환
      const partyPokemon = pokemonIds
        .map((pid) => pokemonMap.get(pid))
        .filter((p) => p !== undefined);

      if (partyPokemon.length > 0) {
        const partyTypes = partyPokemon.map((p) => p.types);
        const analysisResult = analyzeParty(partyTypes, typeChart);
        const gradeInfo = analysisResult.gradeInfo;

        if (!gradeInfo) {
          analysis = null;
        } else {
          const newRow = {
            party_id: id,
            grade: gradeInfo.grade,
            total_score: gradeInfo.totalScore,
            offense_score: gradeInfo.breakdown.offense,
            defense_score: gradeInfo.breakdown.defense,
            diversity_score: gradeInfo.breakdown.diversity,
            coverage: analysisResult.coverage,
            weaknesses: analysisResult.weaknesses,
            resistances: analysisResult.resistances,
            suggestions: gradeInfo.suggestions,
          };

          // INSERT (실패해도 응답은 반환)
          try { await supabase.from("party_analysis").insert(newRow); } catch { /* ignore */ }

          analysis = {
            grade: gradeInfo.grade,
            total_score: gradeInfo.totalScore,
            offense_score: gradeInfo.breakdown.offense,
            defense_score: gradeInfo.breakdown.defense,
            diversity_score: gradeInfo.breakdown.diversity,
            coverage: analysisResult.coverage,
            weaknesses: analysisResult.weaknesses,
            resistances: analysisResult.resistances,
            suggestions: gradeInfo.suggestions,
          };
        }
      } else {
        analysis = null;
      }
    }

    return NextResponse.json({
      party,
      analysis,
      pokemon_details: pokemonDetails,
    });
  } catch (error) {
    console.error("파티 상세 조회 API 오류:", error);
    const message = getApiErrorMessage(error, "파티 상세 정보를 불러오는 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const supabase = await createServerSupabase();

    const body = await request.json();
    const { name, memo } = body as { name: unknown; memo: unknown };

    // name 또는 memo 중 하나라도 있어야 함
    const hasName = name !== undefined && name !== null;
    const hasMemo = memo !== undefined && memo !== null;

    if (!hasName && !hasMemo) {
      return NextResponse.json(
        { error: "수정할 항목(name 또는 memo)을 입력해주세요." },
        { status: 400 },
      );
    }

    // name 검증
    if (hasName) {
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
    }

    // memo 검증
    if (hasMemo) {
      if (typeof memo !== "string") {
        return NextResponse.json(
          { error: "메모는 문자열이어야 합니다." },
          { status: 400 },
        );
      }
      if (memo.length > 2000) {
        return NextResponse.json(
          { error: "메모는 2000자 이하여야 합니다." },
          { status: 400 },
        );
      }
    }

    // 소유자 확인 (RLS가 처리하지만 서버에서도 확인)
    const ownerError = await verifyOwnership(supabase, id, user.id, "수정");
    if (ownerError) return ownerError;

    // 수정할 필드 조립
    const updateFields: Record<string, unknown> = {};
    if (hasName) updateFields.name = (name as string).trim();
    if (hasMemo) updateFields.memo = memo;

    // 수정
    const { data: updated, error: updateError } = await supabase
      .from("saved_parties")
      .update(updateFields)
      .eq("id", id)
      .select("id, name, memo, updated_at")
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
    const message = getApiErrorMessage(error, "파티 수정 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const rateLimitResponse = enforceRateLimit(_request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { user } = auth;
    const supabase = await createServerSupabase();

    // 소유자 확인
    const ownerError = await verifyOwnership(supabase, id, user.id, "삭제");
    if (ownerError) return ownerError;

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
    const message = getApiErrorMessage(error, "파티 삭제 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
