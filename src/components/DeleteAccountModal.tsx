'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  confirmText: string;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  confirmText,
}: DeleteAccountModalProps) {
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isConfirmed = confirmInput === confirmText;

  const handleConfirm = async () => {
    if (!isConfirmed || loading) return;
    setLoading(true);
    setError('');
    try {
      await onConfirm();
    } catch {
      setError('회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmInput('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="delete-modal-overlay"
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        data-testid="delete-modal-box"
        className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 제목 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-red-600">회원 탈퇴</h2>
        </div>

        {/* 경고 메시지 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">
            탈퇴하면 저장된 파티와 모든 데이터가 영구 삭제되며 복구할 수 없습니다.
          </p>
        </div>

        {/* 확인 입력 */}
        <div className="mb-4">
          <label
            htmlFor="delete-confirm-input"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            확인을 위해 아이디 <span className="font-bold text-red-600">{confirmText}</span>를
            입력해주세요.
          </label>
          <input
            id="delete-confirm-input"
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={loading}
            placeholder={confirmText}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-colors duration-200 text-sm disabled:opacity-50"
          />
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!isConfirmed || loading}
            className="flex-1 py-2.5 px-4 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? '탈퇴 처리 중...' : '회원 탈퇴'}
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 text-sm font-medium border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
