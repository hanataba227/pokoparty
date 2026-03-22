import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입",
  description: "PokoParty 계정을 만들어 포켓몬 파티를 저장하고 관리하세요.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
