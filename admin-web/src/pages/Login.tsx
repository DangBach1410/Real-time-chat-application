import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../helpers/authApi";
import type { LoginRequest, LoginResponse } from "../helpers/authApi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginRequest>({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await login(formData);
      const { accessToken, refreshToken, userId } =
        res.data as LoginResponse & { roles?: string[] };

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("userId", userId);

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Admin login failed", err);
      setErrorMessage(
        err?.response?.data?.message ?? err.message ?? "Network error",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-semibold text-center mb-6">Admin Login</h1>

        {errorMessage && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Username</label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Password</label>

            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded pr-10"
                placeholder="Enter your password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <AiOutlineEyeInvisible size={20} />
                ) : (
                  <AiOutlineEye size={20} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
