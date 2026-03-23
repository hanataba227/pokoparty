/**
 * GET /api/story-points
 * 스토리 포인트 목록 반환 (gym 타입만 필터링)
 */
import { NextRequest, NextResponse } from "next/server";
import { loadStoryData, isValidGameVersion } from "@/lib/data-loader";
import { getApiErrorMessage } from "@/lib/api-error";
import { withRateLimit } from "@/lib/rate-limit";

export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameVersion = searchParams.get("gameVersion");

    if (gameVersion !== null && !isValidGameVersion(gameVersion)) {
      return NextResponse.json(
        { error: "올바르지 않은 게임 버전입니다." },
        { status: 400 },
      );
    }

    const storyPoints = loadStoryData(gameVersion ?? undefined);

    // gym 타입만 필터링
    const gymPoints = storyPoints.filter((sp) => sp.type === "gym");

    return NextResponse.json({ storyPoints: gymPoints });
  } catch (error) {
    console.error("스토리 포인트 API 오류:", error);
    const message = getApiErrorMessage(error, "스토리 포인트 데이터를 로드하는 중 오류가 발생했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
