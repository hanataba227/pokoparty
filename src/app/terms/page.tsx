import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관',
  description: 'PokoParty 서비스 이용약관',
};

export default function TermsPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">이용약관</h1>

      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">제1조 (목적)</h2>
          <p>
            이 약관은 PokoParty(이하 &quot;서비스&quot;)가 제공하는 포켓몬 파티 추천 및 분석 서비스의
            이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">제2조 (정의)</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>&quot;서비스&quot;란 PokoParty가 제공하는 포켓몬 파티 추천, 파티 분석, 포켓몬 도감 등 일체의 서비스를 말합니다.</li>
            <li>&quot;이용자&quot;란 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li>&quot;회원&quot;이란 서비스에 가입하여 계정을 생성한 이용자를 말합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">제3조 (서비스의 제공)</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>서비스는 포켓몬 게임 스토리 공략에 최적화된 파티 추천 및 분석 기능을 무료로 제공합니다.</li>
            <li>서비스는 연중무휴, 1일 24시간 제공을 원칙으로 하나, 시스템 점검 등의 사유로 일시 중단될 수 있습니다.</li>
            <li>서비스의 내용은 사전 고지 후 변경될 수 있습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">제4조 (회원가입 및 탈퇴)</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>회원가입은 이메일 인증 또는 소셜 로그인(Google, GitHub 등)을 통해 가능합니다.</li>
            <li>회원은 언제든지 서비스 내에서 탈퇴를 요청할 수 있으며, 서비스는 즉시 처리합니다.</li>
            <li>탈퇴 시 회원의 개인정보 및 저장된 데이터는 개인정보 처리방침에 따라 처리됩니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">제5조 (이용자의 의무)</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>이용자는 서비스를 본래 목적에 맞게 이용하여야 합니다.</li>
            <li>이용자는 타인의 계정을 도용하거나 서비스의 정상적인 운영을 방해하는 행위를 하여서는 안 됩니다.</li>
            <li>이용자는 서비스를 통해 얻은 정보를 상업적 목적으로 무단 이용하여서는 안 됩니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">제6조 (지적재산권)</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>서비스의 소프트웨어, 디자인, 로고 등에 대한 지적재산권은 서비스 운영자에게 있습니다.</li>
            <li>포켓몬 관련 이미지, 명칭 등의 저작권은 The Pok&eacute;mon Company, Nintendo, Game Freak에 있습니다.</li>
            <li>본 서비스는 팬 프로젝트로서, 공식 포켓몬 제품이 아닙니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">제7조 (면책조항)</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>서비스는 무료로 제공되며, 서비스 이용으로 인한 직접적·간접적 손해에 대해 책임을 지지 않습니다.</li>
            <li>서비스가 제공하는 추천 결과는 참고용이며, 게임 내 실제 결과와 다를 수 있습니다.</li>
            <li>천재지변, 서버 장애 등 불가항력적 사유로 서비스 제공이 불가능한 경우 책임을 지지 않습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">제8조 (약관의 변경)</h2>
          <p>
            이 약관은 필요 시 변경될 수 있으며, 변경된 약관은 서비스 내 공지를 통해 효력이 발생합니다.
            변경 후 서비스를 계속 이용하면 변경된 약관에 동의한 것으로 간주합니다.
          </p>
        </section>

        <p className="text-slate-400 pt-4">시행일자: 2026년 3월 23일</p>
      </div>
    </div>
  );
}
