import { useEffect, useState, useRef } from "react";
import { adminApi } from "../helpers/adminApi";
import { AdminAction } from "../helpers/adminApi";

export default function AuditLogs() {
  const [action, setAction] = useState<AdminAction | "">("");
  const [adminId, setAdminId] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // prevent duplicate page fetch
  const loadedPagesRef = useRef<Set<number>>(new Set());

  /**
   * Fetch logs (append)
   */
  const fetchLogs = async () => {
    if (loading || !hasMore) return;
    if (loadedPagesRef.current.has(page)) return;

    loadedPagesRef.current.add(page);
    setLoading(true);

    try {
      const res = await adminApi.getAuditLogs(
        action === "" ? undefined : action,
        adminId || undefined,
        page,
        10
      );

      const newLogs = res.data.content ?? [];

      setLogs((prev) => [...prev, ...newLogs]);

      if (newLogs.length < 10) {
        setHasMore(false);
      }
    } catch {
      loadedPagesRef.current.delete(page);
      alert("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load when page changes
   */
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /**
   * IntersectionObserver (infinite scroll)
   */
  useEffect(() => {
    if (!loadMoreRef.current || loading || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loading, hasMore]);

  /**
   * Filter handler
   */
  const handleFilter = () => {
    setLogs([]);
    setPage(0);
    setHasMore(true);
    loadedPagesRef.current.clear();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Audit Logs</h1>

        {/* Filters */}
        <div className="flex gap-2 mb-4 sticky top-0 bg-gray-100 z-10 pb-3">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as AdminAction | "")}
            className="p-2 border rounded"
          >
            <option value="">All Actions</option>
            <option value={AdminAction.BAN_USER}>BAN_USER</option>
            <option value={AdminAction.UNBAN_USER}>UNBAN_USER</option>
            <option value={AdminAction.DELETE_USER}>DELETE_USER</option>
          </select>

          <input
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            className="p-2 border rounded"
            placeholder="Admin ID"
          />

          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Filter
          </button>
        </div>

        {/* Table wrapper: allow horizontal overflow and ensure columns have space */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] bg-white rounded shadow">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left w-36">Admin</th>
                <th className="text-left w-36">Action</th>
                <th className="text-left w-56">Target User</th>
                <th className="text-left">Description</th>
                <th className="text-center w-28">Result</th>
                {/* Time column expanded: larger fixed width + no-wrap */}
                <th className="text-right w-[220px] pr-6">Time</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{l.adminId}</td>

                  <td className="font-medium text-indigo-600">{l.action}</td>

                  <td>
                    <div className="font-medium">
                      {l.targetUserName || "—"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {l.targetUserEmail || l.targetUserId}
                    </div>
                  </td>

                  {/* Description: allow wrapping but constrain width so table stays readable */}
                  <td className="text-gray-700 max-w-[560px] break-words">
                    {l.description}
                  </td>

                  <td className="text-center font-medium">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        l.success
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {l.success ? "SUCCESS" : "FAILED"}
                    </span>
                  </td>

                  {/* Time: expanded, keep on one line */}
                  <td className="text-right text-sm text-gray-500 pr-6 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Infinite scroll sentinel */}
        <div
          ref={loadMoreRef}
          className="h-12 flex items-center justify-center"
        >
          {loading && (
            <span className="text-sm text-gray-500">Loading...</span>
          )}
          {!hasMore && logs.length > 0 && (
            <span className="text-sm text-gray-400">No more logs</span>
          )}
        </div>
      </div>
    </div>
  );
}
