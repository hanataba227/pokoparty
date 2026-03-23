import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보 처리방침',
  description: 'PokoParty 개인정보 처리방침',
};

export default function PrivacyPage() {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">개인정보 처리방침</h1>

      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
        <p>
          PokoParty(이하 &quot;서비스&quot;)는 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 등
          관련 법령을 준수합니다. 본 방침을 통해 이용자의 개인정보가 어떻게 수집·이용·보관·파기되는지
          안내드립니다.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">1. 수집하는 개인정보 항목</h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-slate-800 mb-1">회원가입 시</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>이메일 주소</li>
                <li>닉네임(표시 이름)</li>
                <li>소셜 로그인 시: 소셜 계정 식별자(Google, GitHub 등)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-slate-800 mb-1">서비스 이용 시 자동 수집</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>서비스 이용 기록(저장한 파티, 추천 이력 등)</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>회원 식별 및 계정 관리</li>
            <li>파티 저장·불러오기 등 개인화 서비스 제공</li>
            <li>서비스 개선 및 통계 분석(비식별 처리)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">3. 개인정보의 보유 및 이용 기간</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>회원 탈퇴 시까지 보유하며, 탈퇴 요청 시 지체 없이 파기합니다.</li>
            <li>단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">4. 개인정보의 제3자 제공</h2>
          <p>
            서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의해 요구되는
            경우에는 예외로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">5. 개인정보 처리 위탁</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-4 py-2 text-left">수탁업체</th>
                  <th className="border border-slate-300 px-4 py-2 text-left">위탁 업무</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Supabase (미국)</td>
                  <td className="border border-slate-300 px-4 py-2">회원 인증 및 데이터 저장</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Vercel (미국)</td>
                  <td className="border border-slate-300 px-4 py-2">웹 서비스 호스팅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">6. 개인정보의 파기</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>회원 탈퇴 시 개인정보는 지체 없이 파기합니다.</li>
            <li>전자적 파일 형태의 정보는 복구 불가능한 방법으로 삭제합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">7. 이용자의 권리</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>이용자는 언제든지 자신의 개인정보를 조회·수정·삭제할 수 있습니다.</li>
            <li>회원 탈퇴를 통해 개인정보 처리 동의를 철회할 수 있습니다.</li>
            <li>개인정보 관련 문의는 아래 연락처를 통해 가능합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">8. 쿠키 및 분석 도구</h2>
          <p>
            서비스는 인증 세션 유지를 위해 쿠키를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키 저장을
            거부할 수 있으나, 이 경우 로그인이 필요한 서비스 이용이 제한될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">9. 개인정보 보호책임자</h2>
          <p>
            개인정보 관련 문의, 불만처리, 피해구제 등은 아래 구글폼을 통해 접수해 주세요.
          </p>
          <p className="mt-2">
            <a
              href="https://forms.gle/nZUyXJapiBhrd2927"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 underline"
            >
              문의하기 (Google Form)
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">10. 방침 변경</h2>
          <p>
            이 개인정보 처리방침은 변경될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.
          </p>
        </section>

        <p className="text-slate-400 pt-4">시행일자: 2026년 3월 23일</p>
      </div>
    </div>
  );
}
