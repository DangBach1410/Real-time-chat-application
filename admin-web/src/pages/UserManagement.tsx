import { useEffect, useState, useRef } from "react";
import { adminApi } from "../helpers/adminApi";
import type { SearchUserResponse } from "../helpers/adminApi";
import {
  FiSearch,
  FiUserX,
  FiUserCheck,
  FiTrash2,
  FiX,
} from "react-icons/fi";

type ActionType = "ban" | "unban" | "delete";

export default function UserManagement() {
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState<SearchUserResponse[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] =
    useState<SearchUserResponse | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);

  const adminId = localStorage.getItem("userId") || "";

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // prevent duplicate page fetch
  const loadedPagesRef = useRef<Set<number>>(new Set());

  /**
   * Fetch users (infinite scroll)
   */
  const fetchUsers = async () => {
    if (loading || !hasMore) return;
    if (loadedPagesRef.current.has(page)) return;

    loadedPagesRef.current.add(page);
    setLoading(true);

    try {
      const res = await adminApi.searchUsers(keyword, page, 10);
      const newUsers: SearchUserResponse[] = res.data;

      setUsers((prev) => [...prev, ...newUsers]);

      if (newUsers.length < 10) {
        setHasMore(false);
      }
    } catch {
      loadedPagesRef.current.delete(page);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load when page changes
   */
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /**
   * IntersectionObserver
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
   * Helpers
   */
  const updateUserInList = (
    userId: string,
    updater: (u: SearchUserResponse) => SearchUserResponse | null
  ) => {
    setUsers((prev) =>
      prev
        .map((u) => (u.id === userId ? updater(u) : u))
        .filter(Boolean) as SearchUserResponse[]
    );
  };

  /**
   * Modal
   */
  const openModal = (type: ActionType, user: SearchUserResponse) => {
    setSelectedUser(user);
    setActionType(type);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSelectedUser(null);
    setActionType(null);
  };

  const confirmAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      if (actionType === "ban") {
        await adminApi.banUser(selectedUser.id, adminId);
        updateUserInList(selectedUser.id, (u) => ({
          ...u,
          status: "BANNED",
        }));
      }

      if (actionType === "unban") {
        await adminApi.unbanUser(selectedUser.id, adminId);
        updateUserInList(selectedUser.id, (u) => ({
          ...u,
          status: "ACTIVE",
        }));
      }

      if (actionType === "delete") {
        await adminApi.deleteUser(selectedUser.id, adminId);
        updateUserInList(selectedUser.id, () => null);
      }

      closeModal();
    } catch {
      alert("Action failed");
    }
  };

  /**
   * Search
   */
  const handleSearch = () => {
    setUsers([]);
    setPage(0);
    setHasMore(true);
    loadedPagesRef.current.clear();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">User Management</h1>

        {/* Search */}
        <div className="sticky top-0 z-10 bg-gray-100 pb-4 mb-4">
          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 p-2 border rounded"
              placeholder="Search by name or email"
            />
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded"
            >
              <FiSearch />
              Search
            </button>
          </div>
        </div>

        {/* Table */}
        <table className="w-full bg-white rounded shadow">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">User</th>
              <th className="text-left">Email</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-3 flex items-center gap-3">
                  <img
                    src={u.imageUrl || "/avatar.png"}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium">{u.fullName}</div>
                    <div className="text-xs text-gray-500 select-all">
                      ID: {u.id}
                    </div>
                  </div>
                </td>

                <td>{u.email}</td>

                <td
                  className={`font-medium ${
                    u.status === "ACTIVE"
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {u.status}
                </td>

                <td className="p-3">
                  <div className="flex justify-center gap-2">
                    {u.status === "ACTIVE" && (
                      <button
                        onClick={() => openModal("ban", u)}
                        className="flex items-center gap-1 px-2 py-1 bg-yellow-400 rounded"
                      >
                        <FiUserX />
                        Ban
                      </button>
                    )}

                    {u.status === "BANNED" && (
                      <button
                        onClick={() => openModal("unban", u)}
                        className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded"
                      >
                        <FiUserCheck />
                        Unban
                      </button>
                    )}

                    <button
                      onClick={() => openModal("delete", u)}
                      className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded"
                    >
                      <FiTrash2 />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Infinite scroll sentinel */}
        <div
          ref={loadMoreRef}
          className="h-12 flex items-center justify-center"
        >
          {loading && (
            <span className="text-sm text-gray-500">Loading...</span>
          )}
          {!hasMore && users.length > 0 && (
            <span className="text-sm text-gray-400">
              No more users
            </span>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {open && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[420px] rounded shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Confirm action</h2>
              <button onClick={closeModal}>
                <FiX size={20} />
              </button>
            </div>

            <p className="mb-2 text-sm text-gray-600">
              User ID:{" "}
              <span className="font-mono">{selectedUser.id}</span>
            </p>

            <p className="mb-6">
              Are you sure you want to{" "}
              <span className="font-semibold">{actionType}</span> user{" "}
              <span className="font-semibold">
                {selectedUser.fullName}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
