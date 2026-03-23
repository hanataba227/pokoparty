'use client';

import { useState, useCallback } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';
import { getClientErrorMessage } from '@/lib/error-utils';

interface ImportPartyButtonProps {
  sharedPartyId: string;
  originalGameId: string;
  isImported?: boolean;
}

export default function ImportPartyButton({
  sharedPartyId,
  originalGameId,
  isImported = false,
}: ImportPartyButtonProps) {
  const [imported, setImported] = useState(isImported);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = useCallback(async () => {
    if (importing) return;
    try {
      setImporting(true);
      setError(null);

      const res = await fetch('/api/parties/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shared_party_id: sharedPartyId,
          game_id: originalGameId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      setImported(true);
    } catch (err) {
      setError(getClientErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }, [sharedPartyId, originalGameId, importing]);

  if (imported) {
    return (
      <div className="mt-6 flex justify-center">
        <div className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-4 h-4" />
          저장됨
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <button
        onClick={handleImport}
        disabled={importing}
        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {importing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            저장 중...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            내 파티에 저장하기
          </>
        )}
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
