'use client';

import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { UI } from '@/lib/ui-tokens';

const MEMO_MAX_LENGTH = 2000;

interface PartyMemoEditorProps {
  partyId: string;
  initialMemo: string;
}

export default function PartyMemoEditor({ partyId, initialMemo }: PartyMemoEditorProps) {
  const [memo, setMemo] = useState(initialMemo);
  const [saving, setSaving] = useState(false);
  const [savedText, setSavedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 변경사항이 없으면 저장 불가
  const hasChanges = memo !== initialMemo;

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/parties/${partyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '메모 저장에 실패했습니다.');
      }
      // 저장 성공 피드백
      setSavedText('저장됨');
      setTimeout(() => setSavedText(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setSaving(false);
    }
  }, [partyId, memo, hasChanges, saving]);

  return (
    <div className={`${UI.pageBg} ${UI.border} p-4`}>
      <h2 className={UI.sectionTitle}>메모 / 후기</h2>

      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX_LENGTH))}
        maxLength={MEMO_MAX_LENGTH}
        placeholder="파티에 대한 메모나 후기를 작성해보세요..."
        className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">
          {memo.length} / {MEMO_MAX_LENGTH}
        </span>

        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                저장 중...
              </>
            ) : savedText ? (
              savedText
            ) : (
              '저장'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
