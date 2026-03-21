'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createBrowserSupabase } from '@/lib/supabase-browser';
import { UI } from '@/lib/ui-tokens';

interface ProfileSectionProps {
  user: User;
}

export default function ProfileSection({ user }: ProfileSectionProps) {
  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || '유저';
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [currentName, setCurrentName] = useState(displayName);

  const createdAt = new Date(user.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleSave = async () => {
    if (!name.trim() || name.trim() === currentName) {
      setEditing(false);
      setName(currentName);
      return;
    }
    setSaving(true);
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.updateUser({
        data: { display_name: name.trim() },
      });
      if (!error) {
        setCurrentName(name.trim());
        // Also update profiles table
        await supabase
          .from('profiles')
          .update({ display_name: name.trim() })
          .eq('id', user.id);
      }
    } catch {
      setName(currentName);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setName(currentName);
    setEditing(false);
  };

  return (
    <div className={`${UI.pageBg} ${UI.border} p-6 shadow-sm`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-indigo-600">
            {currentName.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-2 py-1 border border-indigo-300 rounded-md text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  maxLength={20}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors cursor-pointer"
                  aria-label="저장"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  aria-label="취소"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-slate-800 truncate">
                  {currentName}
                </h2>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  aria-label="닉네임 수정"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{user.email}</p>
          <p className="text-xs text-slate-400 mt-1">가입일: {createdAt}</p>
        </div>
      </div>
    </div>
  );
}
