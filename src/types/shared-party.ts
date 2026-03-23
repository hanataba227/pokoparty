/**
 * 공유 파티 관련 타입 정의
 * 기반: docs/design/feature-party-detail.md 섹션 4.1
 */

import type { PartyGrade } from './pokemon';

/** shared_parties 테이블 행 */
export interface SharedParty {
  id: string;
  user_id: string | null;
  source_party_id: string | null;
  party_name: string;
  pokemon_ids: number[];
  game_id: string;
  memo: string;
  grade: PartyGrade;
  total_score: number;
  offense_score: number;
  defense_score: number;
  diversity_score: number;
  coverage: string[];
  weaknesses: string[];
  resistances: string[];
  display_name: string;
  shared_at: string;
}

/** 갤러리 목록 API 응답 */
export interface SharedPartiesResponse {
  parties: SharedParty[];
  total: number;
  page: number;
  limit: number;
}

/** 공유 파티 상세 API 응답 */
export interface SharedPartyDetailResponse {
  party: SharedParty;
  pokemon_details: {
    id: number;
    name_ko: string;
    types: string[];
  }[];
}

/** 공유 요청 */
export interface SharePartyRequest {
  party_id: string;
}

/** 공유 응답 */
export interface SharePartyResponse {
  shared_party: SharedParty;
}
