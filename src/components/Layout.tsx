'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Github, User, LogOut, ChevronDown, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UI } from '@/lib/ui-tokens';

const navLinks = [
  { href: '/recommend', label: '파티 추천' },
  { href: '/analyze', label: '파티 분석' },
  { href: '/compare', label: '파티 비교' },
  { href: '/pokedex', label: '포켓몬 도감' },
];

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut();
    router.push('/');
  };

  return (
    <nav className={`sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b ${UI.rowBorder}`}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-xl text-indigo-600"
          style={{ fontFamily: 'Fredoka, Noto Sans KR, sans-serif' }}
        >
          PokoParty
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {/* Auth Section - Desktop */}
          {loading ? (
            <div className="w-20 h-8 bg-slate-100 rounded-lg animate-pulse" />
          ) : user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-sm font-medium max-w-[100px] truncate">
                  {user.user_metadata?.display_name || '게스트'}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {profileDropdownOpen && (
                <div className={`absolute right-0 mt-1 w-auto min-w-[120px] ${UI.pageBg} rounded-lg shadow-lg border ${UI.rowBorder} py-1 z-50`}>
                  <Link
                    href="/mypage"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    마이페이지
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                회원가입
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="메뉴 열기"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-t ${UI.rowBorder} ${UI.pageBg}`}>
          <div className="px-4 py-3 space-y-2">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 px-3 rounded-lg font-medium transition-colors duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className={`border-t ${UI.rowBorder} pt-2 mt-2`}>
              {loading ? (
                <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
              ) : user ? (
                <>
                  <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <span className="truncate">
                      {user.user_metadata?.display_name || '게스트'}
                    </span>
                  </div>
                  <Link
                    href="/mypage"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-slate-600 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                  >
                    마이페이지
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left py-2 text-slate-600 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex-1 py-2 text-center text-sm font-medium text-slate-600 ${UI.border} ${UI.hoverBg} transition-colors`}
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2 text-center text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer className={`${UI.pageBg} border-t ${UI.rowBorder}`}>
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} PokoParty. All rights reserved.
        </p>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <Link href="/terms" className="hover:text-slate-600 transition-colors">
            이용약관
          </Link>
          <span>|</span>
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">
            개인정보 처리방침
          </Link>
          <span>|</span>
          <a
            href="https://forms.gle/nZUyXJapiBhrd2927"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-slate-600 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            문의하기
          </a>
          <span>|</span>
          <a
            href="https://github.com/hanataba227/pokoparty"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-slate-600 transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 w-full">{children}</main>
      <Footer />
    </>
  );
}
