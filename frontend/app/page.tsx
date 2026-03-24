'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface Option {
  id: number;
  label: string;
  votes: number;
  creator_id: number;
}

interface Me {
  id: number;
  login: string;
}

interface PollData {
  title: string;
  options: Option[];
  votedOptionId: number | null;
  myOptionId: number | null;
}

export default function Home() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [poll, setPoll] = useState<PollData | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [voted, setVoted] = useState(false);

  const fetchPoll = useCallback(async () => {
    const res = await fetch(`${API}/options`, { credentials: 'include' });
    setPoll(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      const [meRes] = await Promise.all([
        fetch(`${API}/me`, { credentials: 'include' }),
        fetchPoll(),
      ]);
      setMe(await meRes.json());
    })();
  }, [fetchPoll]);

  const handleVote = async (id: number) => {
    if (!me || submitting) return;
    setSubmitting(true);
    setError('');
    const res = await fetch(`${API}/vote/${id}`, { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error);
    } else {
      setVoted(true);
      await fetchPoll();
    }
    setSubmitting(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me || !newLabel.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    const res = await fetch(`${API}/options`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel.trim() }),
    });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error);
    } else {
      setNewLabel('');
      setVoted(true);
      await fetchPoll();
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
    setMe(null);
    setVoted(false);
    await fetchPoll();
  };

  const maxVotes = Math.max(1, ...(poll?.options.map(o => o.votes) ?? [1]));
  const canCreate = !!me && !poll?.myOptionId && !poll?.votedOptionId;
  const hasVoted = !!poll?.votedOptionId || voted;

  if (me === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-white/70 text-xl animate-pulse">加载中…</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-4 py-12">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-pink-400/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-400/30 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative glass-card p-6 flex items-center justify-between overflow-hidden">
          <div>
            <p className="text-white/60 text-sm font-medium tracking-widest uppercase mb-1">GeekAI · 功能投票</p>
            <h1 className="text-2xl font-semibold text-white">{poll?.title ?? '投票'}</h1>
          </div>
          {me ? (
            <div className="flex items-center gap-3">
              <span className="text-white/75 text-sm">@{me.login}</span>
              <button onClick={handleLogout} className="glass-btn text-sm px-4 py-2">
                退出
              </button>
            </div>
          ) : (
            <a
              href={`${API}/auth/github`}
              className="glass-btn flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub 登录
            </a>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card p-4 border-red-400/40 bg-red-500/10">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Create option form */}
        {canCreate && (
          <form onSubmit={handleCreate} className="relative glass-card p-6 overflow-hidden">
            <h2 className="text-white font-semibold mb-3">提交你的功能建议</h2>
            <p className="text-white/55 text-sm mb-4">每人限一条，提交即算投票</p>
            <div className="flex gap-3">
              <input
                className="glass-input flex-1"
                placeholder="描述你最期待的功能…"
                value={newLabel}
                onChange={e => { setNewLabel(e.target.value); setError(''); }}
                maxLength={100}
                required
              />
              <button type="submit" disabled={submitting || !newLabel.trim()} className="glass-btn whitespace-nowrap">
                {submitting ? '提交中…' : '提交'}
              </button>
            </div>
          </form>
        )}

        {!me && (
          <div className="relative glass-card p-5 overflow-hidden text-center">
            <p className="text-white/70 text-sm">登录后可投票或提交功能建议</p>
          </div>
        )}

        {/* Options list */}
        <div className="space-y-3">
          {poll?.options.length === 0 && (
            <div className="glass-card p-8 text-center overflow-hidden relative">
              <p className="text-white/50">暂无投票项，快来第一个提交吧！</p>
            </div>
          )}
          {poll?.options.map((opt, i) => {
            const isVoted = poll.votedOptionId === opt.id;
            const isMine = poll.myOptionId === opt.id;
            const pct = Math.round((opt.votes / maxVotes) * 100);
            return (
              <div key={opt.id} className="glass-option p-5 overflow-hidden">
                {/* Inner glow overlay */}
                <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.10), transparent)' }} />
                {/* Progress bar */}
                <div
                  className="absolute inset-0 rounded-2xl transition-all duration-700"
                  style={{
                    background: isVoted
                      ? `linear-gradient(to right, rgba(167,139,250,0.25) 0%, rgba(167,139,250,0.08) ${pct}%, transparent ${pct}%)`
                      : `linear-gradient(to right, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) ${pct}%, transparent ${pct}%)`,
                    transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-white/40 text-sm font-mono w-5 shrink-0">#{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-white font-medium leading-snug break-words">{opt.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {isMine && <span className="text-xs text-purple-300/80 font-medium">我的建议</span>}
                        {isVoted && <span className="text-xs text-violet-300/80 font-medium">已投票 ✓</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-white/85 font-semibold tabular-nums">{opt.votes}</span>
                    {me && !hasVoted && (
                      <button
                        onClick={() => handleVote(opt.id)}
                        disabled={submitting}
                        className="glass-btn text-sm px-4 py-2"
                      >
                        投票
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {(poll?.options.length ?? 0) > 0 && (
          <div className="flex justify-end pb-4">
            <a
              href={`${API}/export`}
              className="glass-btn text-sm px-4 py-2"
              download
            >
              导出 CSV
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
