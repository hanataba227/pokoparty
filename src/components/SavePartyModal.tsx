'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Save } from 'lucide-react';

interface SavePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  pokemonCount: number;
  selectedGameId: string;
  gameName: string;
  saving?: boolean;
}

export default function SavePartyModal({
  isOpen,
  onClose,
  onSave,
  pokemonCount,
  selectedGameId,
  gameName,
  saving = false,
}: SavePartyModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultName = `분석 파티 (${pokemonCount}마리)`;

  // 모달 열릴 때 초기화 + 포커스
  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const nameToSave = trimmedName || defaultName;
  const isValid = nameToSave.length >= 1 && nameToSave.length <= 50;

  const handleSubmit = () => {
    if (!isValid || saving) return;
    onSave(nameToSave);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !saving) {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-modal-title"
      >
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="save-modal-title" className="text-xl font-bold text-slate-900">
            파티 저장하기
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 파티 이름 입력 */}
        <div className="mb-4">
          <label htmlFor="party-name" className="block text-sm font-medium text-slate-700 mb-1.5">
            파티 이름
          </label>
          <input
            ref={inputRef}
            id="party-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={defaultName}
            maxLength={50}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800
              placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              transition-colors duration-200"
          />
          <p className="mt-1 text-xs text-slate-400">
            {trimmedName.length > 0 ? `${trimmedName.length}/50자` : `비워두면 "${defaultName}"으로 저장됩니다`}
          </p>
        </div>

        {/* 게임(세대) 읽기 전용 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            게임 (세대)
          </label>
          <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600">
            {gameName || selectedGameId}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                저장하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
