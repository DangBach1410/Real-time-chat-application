import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { MessageResponse } from "../helpers/chatApi";
import { searchMessages } from "../helpers/chatApi";
import { DEFAULT_AVATAR } from "../constants/common";

interface Props {
  conversationId: string;
  onBack: () => void; // close search and go back to details
  onSelectMessage?: (m: MessageResponse, q?: string) => void;
}

export default function ConversationSearchModal({ conversationId, onBack, onSelectMessage }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MessageResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = async (startPage = 0) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchMessages(conversationId, query.trim(), startPage, 20);
      if (startPage === 0) setResults(res);
      else setResults((prev) => [...prev, ...res]);
      setHasMore(res.length === 20);
      setPage(startPage + 1);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      doSearch(0);
    }
    if (e.key === "Escape") {
      onBack();
    }
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    doSearch(page);
  };

  const handleResultsScroll = () => {
    const el = resultsRef.current;
    if (!el || loading || !hasMore) return;
    const threshold = 150; // px from bottom
    if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
      loadMore();
    }
  };

  function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function renderPreview(m: MessageResponse) {
    try {
      if (m.type === "text" || m.type === "text-translation") return m.content;
      if (m.type === "link") {
        const meta = JSON.parse(m.content);
        return meta.title || meta.url || m.content;
      }
      if (m.type === "media") {
        const meta = JSON.parse(m.content);
        return meta.originalName || meta.url || m.content;
      }
      return m.content;
    } catch {
      return m.content;
    }
  }

  return (
    <div className="fixed top-20 right-0 z-50 flex items-start justify-end" style={{pointerEvents: 'auto'}}>
      <div className="w-96 border-l bg-white flex flex-col shadow overflow-hidden" style={{height: 'calc(100vh - 4rem)'}}>
        <div className="flex items-center gap-2 p-3 border-b">
          <button
            className="p-1 text-gray-600 hover:text-black"
            onClick={onBack}
            title="Back to details"
          >
            <ArrowLeft size={18} />
          </button>
          <input
            ref={inputRef}
            className="flex-1 border rounded px-2 py-1"
            placeholder="Enter keyword and press Enter to search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div
          ref={resultsRef}
          onScroll={handleResultsScroll}
          className="p-2 overflow-y-auto flex-1"
        >
          {results.length === 0 && !loading && (
            <div className="text-center text-sm text-gray-500 py-6">No results. Type a keyword and press Enter.</div>
          )}

          {results.map((m) => (
            <div
              key={m.id}
              className="border rounded p-2 mb-2 cursor-pointer hover:bg-gray-50"
              onClick={() => {
                        try {
                          onSelectMessage?.(m, query);
                        } catch (err) {
                          console.error("onSelectMessage handler threw:", err);
                        }
                        // do NOT call onBack here — keep the search modal open so parent can decide
                      }}
            >
              <div className="flex items-center gap-2 mb-1">
                <img
                  src={m.sender.imageUrl || DEFAULT_AVATAR}
                  alt={m.sender.fullName}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="text-sm font-medium">{m.sender.fullName}</div>
                <div className="ml-auto text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-sm break-words">{renderHighlighted(renderPreview(m), query)}</div>
            </div>
          ))}

          {loading && (
            <div className="text-center text-sm text-gray-500 py-2">Loading...</div>
          )}
        </div>
      </div>
    </div>
  );

  function renderHighlighted(preview: string, q: string) {
    if (!q) return <>{preview}</>;
    try {
      const parts = preview.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
      return <>{parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 font-semibold rounded">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}</>;
    } catch {
      return <>{preview}</>;
    }
  }
}
