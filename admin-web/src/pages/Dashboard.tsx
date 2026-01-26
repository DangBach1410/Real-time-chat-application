import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiUsers, FiActivity, FiLogOut } from "react-icons/fi";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken || isTokenExpired(refreshToken)) {
      localStorage.clear();
      navigate("/login");
    }
  }, [navigate]);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded"
          >
            <FiLogOut />
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Management */}
          <Link
            to="/admin/users"
            className="bg-white p-6 rounded shadow hover:shadow-md transition"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                <FiUsers size={24} />
              </div>

              <div>
                <h2 className="text-xl font-medium">User Management</h2>
                <p className="text-gray-500 mt-1">
                  Ban / Unban / Delete & Search users
                </p>
              </div>
            </div>
          </Link>

          {/* Audit Logs */}
          <Link
            to="/admin/audit-logs"
            className="bg-white p-6 rounded shadow hover:shadow-md transition"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                <FiActivity size={24} />
              </div>

              <div>
                <h2 className="text-xl font-medium">Audit Logs</h2>
                <p className="text-gray-500 mt-1">
                  Track all admin actions
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
