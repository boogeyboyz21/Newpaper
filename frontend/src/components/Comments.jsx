import React, { useEffect, useRef, useState } from "react";
import { ThumbsUp, MessageSquare, CornerDownRight, Smile } from "lucide-react";
import { api, wsUrl } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { timeAgo } from "./ArticleCard";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const COMPOSE = ["😀", "😂", "😍", "👍", "🙏", "🎉", "🔥", "❤️", "😮", "😢", "👏", "💯", "🤔", "😎", "🚀", "✅"];

function CommentForm({ articleId, parentId, onDone }) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/articles/${articleId}/comments`, {
        body, parent_id: parentId || null,
        author_name: user && user !== false ? undefined : name || "Guest",
      });
      setBody("");
      if (data.moderated) toast.warning("Your comment is held for moderation (flagged content).");
      onDone && onDone();
    } catch {
      toast.error("Could not post comment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2" data-testid={parentId ? "reply-form" : "comment-form"}>
      {(!user || user === false) && (
        <input data-testid="guest-name-input" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Your name (commenting as guest)"
          className="w-full border border-[var(--line)] px-3 py-2 text-sm bg-transparent outline-none text-ink rounded-lg" />
      )}
      <div className="relative">
        <textarea data-testid="comment-textarea" value={body} onChange={(e) => setBody(e.target.value)}
          rows={parentId ? 2 : 3} placeholder={parentId ? "Write a reply…" : "Join the discussion…"}
          className="w-full border border-[var(--line)] px-3 py-2 pr-10 text-sm bg-transparent outline-none text-ink rounded-lg" />
        <button type="button" data-testid="emoji-toggle" onClick={() => setShowEmoji((s) => !s)}
          className="absolute right-2 top-2 text-ink-soft hover:text-green"><Smile size={18} /></button>
        {showEmoji && (
          <div data-testid="emoji-palette" className="absolute right-0 z-20 mt-1 card p-2 grid grid-cols-8 gap-1 shadow-lg">
            {COMPOSE.map((e) => (
              <button type="button" key={e} data-testid={`emoji-${e}`} className="text-lg hover:scale-125 transition-transform"
                onClick={() => { setBody((b) => b + e); setShowEmoji(false); }}>{e}</button>
            ))}
          </div>
        )}
      </div>
      <button data-testid="submit-comment-btn" disabled={busy}
        className="bg-green text-white px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50 rounded-full">
        {parentId ? "Reply" : "Post Comment"}
      </button>
    </form>
  );
}

function flatten(nodes, depth, out) {
  for (const c of nodes) {
    out.push({ ...c, depth });
    if (c.replies && c.replies.length) flatten(c.replies, depth + 1, out);
  }
  return out;
}
function countAll(nodes) {
  let n = 0;
  for (const c of nodes) n += 1 + countAll(c.replies || []);
  return n;
}

export default function Comments({ articleId }) {
  const [comments, setComments] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const wsRef = useRef(null);

  const load = () => {
    api.get(`/articles/${articleId}/comments`).then(({ data }) => setComments(data)).catch(() => {});
  };

  useEffect(() => {
    load();
    const ws = new WebSocket(wsUrl(`/api/ws/comments/${articleId}`));
    ws.onmessage = () => load();
    wsRef.current = ws;
    return () => ws.close();
    // eslint-disable-next-line
  }, [articleId]);

  const upvote = async (id) => { try { await api.post(`/comments/${id}/upvote`); } catch {} };
  const react = async (id, emoji) => { try { await api.post(`/comments/${id}/react`, { emoji }); load(); } catch {} };

  const flat = flatten(comments, 0, []);

  return (
    <section data-testid="comments-section" className="mt-10 pt-8 border-t-2 border-[var(--green-dark)]">
      <h3 className="font-serif-display text-2xl flex items-center gap-2 mb-4">
        <MessageSquare size={22} /> Discussion
        <span className="text-base text-ink-soft" data-testid="comment-count">({countAll(comments)})</span>
        <span className="text-[10px] uppercase tracking-widest text-green border border-green px-2 py-0.5 ml-2 rounded-full">Live</span>
      </h3>
      <div className="mb-6"><CommentForm articleId={articleId} onDone={load} /></div>
      <div data-testid="comment-list">
        {flat.length === 0 && <p className="text-sm text-ink-soft">Be the first to comment.</p>}
        {flat.map((c) => (
          <div key={c.id} data-testid="comment-item"
            className={c.depth > 0 ? "py-4 border-l-2 border-[var(--line)] pl-4" : "py-4 border-b border-[var(--line)]"}
            style={{ marginLeft: c.depth * 24 }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{c.author_name}</span>
              {c.is_guest && <span className="text-[10px] uppercase tracking-wider text-ink-soft border border-[var(--line)] px-1 rounded">Guest</span>}
              <span className="text-xs text-ink-soft">· {timeAgo(c.created_at)}</span>
            </div>
            <p className="text-sm text-ink leading-relaxed">{c.body}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button data-testid="upvote-btn" onClick={() => upvote(c.id)} className="flex items-center gap-1 text-xs text-ink-soft hover:text-green">
                <ThumbsUp size={13} /> {c.upvotes}
              </button>
              {REACTIONS.map((e) => {
                const n = (c.reactions && c.reactions[e]) || 0;
                return (
                  <button key={e} data-testid={`react-${e}`} onClick={() => react(c.id, e)}
                    className={`text-xs px-2 py-0.5 rounded-full border ${n > 0 ? "border-green" : "border-[var(--line)]"} hover:border-green`}>
                    {e} {n > 0 && <span className="text-ink-soft">{n}</span>}
                  </button>
                );
              })}
              <button data-testid="reply-btn" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="flex items-center gap-1 text-xs text-ink-soft hover:text-green">
                <CornerDownRight size={13} /> Reply
              </button>
            </div>
            {replyTo === c.id && (
              <div className="mt-3">
                <CommentForm articleId={articleId} parentId={c.id} onDone={() => { setReplyTo(null); load(); }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
