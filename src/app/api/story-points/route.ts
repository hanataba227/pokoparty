/**
 * GET /api/story-points
 * 스토리 포인트 목록 반환 (gym 타입만 필터링)
 */
import { NextResponse } from "next/server";
import { loadStoryData } from "@/lib/data-loader";

export async function GET() {
  try {
    const storyPoints = loadStoryData();

    // gym 타입만 필터링
    const gymPoints = storyPoints.filter((sp) => sp.type === "gym");

    return NextResponse.json({ storyPoints: gymPoints });
  } catch (error) {
    console.error("스토리 포인트 API 오류:", error);

    const message =
      error instanceof Error &&
      error.message.includes("데이터 파일을 찾을 수 없습니다")
        ? error.message
        : "스토리 포인트 데이터를 로드하는 중 오류가 발생했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
