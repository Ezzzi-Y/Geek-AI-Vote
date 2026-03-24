'use client';

import { useState, useEffect, useCallback } from 'react';

const API_ROOT = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const API = `${API_ROOT.replace(/\/$/, '')}/api`;

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
      <div className="min-h-screen bg-[#f4f4f0] flex items-center justify-center">
        <div className="pixel-card p-6 md:p-8">
          <p className="text-[#1a1c2c] font-bold uppercase tracking-wider text-sm md:text-base animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4f0] px-4 py-8 md:py-12">
      {/* 8-bit top border decoration */}
      <div className="fixed top-0 left-0 right-0 h-1 pixel-border-top" />

      <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="pixel-card p-4 md:p-6 flex items-center justify-between">
          <div>
            <p className="text-[#8b8680] text-xs font-bold uppercase tracking-widest mb-1 font-mono">
              GeekAI · 功能投票
            </p>
            <h1 className="text-lg md:text-2xl font-bold uppercase tracking-wider text-[#1a1c2c]">
              {poll?.title ?? '投票'}
            </h1>
          </div>
          {me ? (
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-[#1a1c2c] text-xs font-mono border-2 border-[#1a1c2c] rounded-none px-2 py-1 bg-[#fff1e8]">
                @{me.login}
              </span>
              <button onClick={handleLogout} className="pixel-btn-ghost text-xs px-3 py-1.5 md:px-4 md:py-2">
                退出
              </button>
            </div>
          ) : (
            <a
              href={`${API}/auth/github`}
              className="pixel-btn flex items-center gap-2 text-xs"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Login
            </a>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="pixel-card p-3 md:p-4 border-[#ff004d] bg-[#fff1e8]">
            <p className="text-[#ff004d] text-xs md:text-sm font-bold font-mono">⚠ {error}</p>
          </div>
        )}

        {/* Create option form */}
        {canCreate && (
          <form onSubmit={handleCreate} className="pixel-card p-4 md:p-6">
            <h2 className="text-[#1a1c2c] font-bold uppercase tracking-wider text-sm md:text-base mb-2">
              ▸ 提交你的功能建议
            </h2>
            <p className="text-[#8b8680] text-xs font-mono mb-4">每人限一条，提交即算投票</p>
            <div className="flex gap-2 md:gap-3">
              <input
                className="pixel-input flex-1"
                placeholder="描述你最期待的功能…"
                value={newLabel}
                onChange={e => { setNewLabel(e.target.value); setError(''); }}
                maxLength={100}
                required
              />
              <button type="submit" disabled={submitting || !newLabel.trim()} className="pixel-btn whitespace-nowrap">
                {submitting ? '...' : '提交'}
              </button>
            </div>
          </form>
        )}

        {!me && (
          <div className="pixel-card p-4 md:p-5 text-center">
            <p className="text-[#8b8680] text-xs md:text-sm font-mono">
              ← 登录后可投票或提交功能建议 →
            </p>
          </div>
        )}

        {/* Options list */}
        <div className="space-y-3">
          {poll?.options.length === 0 && (
            <div className="pixel-card p-6 md:p-8 text-center">
              <p className="text-[#8b8680] font-mono text-sm">暂无投票项，快来第一个提交吧！</p>
            </div>
          )}
          {poll?.options.map((opt, i) => {
            const isVoted = poll.votedOptionId === opt.id;
            const isMine = poll.myOptionId === opt.id;
            const pct = Math.round((opt.votes / maxVotes) * 100);
            return (
              <div key={opt.id} className="pixel-option p-4 md:p-5 overflow-hidden">
                {/* Pixel progress bar */}
                <div
                  className="absolute top-0 left-0 bottom-0 transition-all duration-300 rounded-none"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isVoted ? 'rgba(41,173,255,0.15)' : 'rgba(26,28,44,0.06)',
                  }}
                />
                <div className="relative flex items-center justify-between gap-3 md:gap-4">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <span className="text-[#8b8680] text-xs font-mono w-5 shrink-0 font-bold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[#1a1c2c] font-bold text-sm md:text-base leading-snug break-words">
                        {opt.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {isMine && (
                          <span className="text-xs font-bold font-mono text-[#29adff] border-2 border-[#29adff] rounded-none px-1.5 py-0.5 bg-[#29adff]/10">
                            MY
                          </span>
                        )}
                        {isVoted && (
                          <span className="text-xs font-bold font-mono text-[#00e436] border-2 border-[#00e436] rounded-none px-1.5 py-0.5 bg-[#00e436]/10">
                            VOTED ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <span className="text-[#1a1c2c] font-bold text-base md:text-lg tabular-nums font-mono">
                      {opt.votes}
                    </span>
                    {me && !hasVoted && (
                      <button
                        onClick={() => handleVote(opt.id)}
                        disabled={submitting}
                        className="pixel-btn-secondary text-xs px-3 py-1.5 md:px-4 md:py-2"
                      >
                        Vote
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
              className="pixel-btn-ghost text-xs px-3 py-1.5 md:px-4 md:py-2"
              download
            >
              Export CSV
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
