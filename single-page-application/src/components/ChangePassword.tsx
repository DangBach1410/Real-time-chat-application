import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword, type UserResponse } from "../helpers/authApi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

interface ChangePasswordProps {
  userId: string;
}

export default function ChangePassword({ userId }: ChangePasswordProps) {
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  // state show/hide cho từng field
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const res = await changePassword(userId, form);
      const data: UserResponse = res.data;

      if (data.status === 200) {
        setSuccessMessage(data.message || "Password changed successfully!");
        setTimeout(() => navigate("/profile"), 2000); // tự động chuyển sau 2s
      } else {
        setErrorMessage(data.message || "Change password failed");
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Change password failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold mb-6">Change Password</h2>

      {/* Thông báo */}
      {successMessage && (
        <div className="mb-4 w-full max-w-md p-3 bg-green-100 text-green-700 rounded text-center">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 w-full max-w-md p-3 bg-red-100 text-red-700 rounded text-center">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
        {/* Old Password */}
        <label className="block mb-1 font-semibold">Old Password</label>
        <div className="relative">
          <input
            type={showOld ? "text" : "password"}
            name="oldPassword"
            value={form.oldPassword}
            onChange={handleChange}
            placeholder="Old password is required"
            className="w-full p-3 border rounded pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowOld((prev) => !prev)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showOld ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
          </button>
        </div>

        {/* New Password */}
        <label className="block mb-1 font-semibold">New Password</label>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            placeholder="New password is required"
            className="w-full p-3 border rounded pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowNew((prev) => !prev)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showNew ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
          </button>
        </div>

        {/* Confirm Password */}
        <label className="block mb-1 font-semibold">Confirm New Password</label>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password is required"
            className="w-full p-3 border rounded pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm((prev) => !prev)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirm ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition"
        >
          {loading ? "Changing..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
