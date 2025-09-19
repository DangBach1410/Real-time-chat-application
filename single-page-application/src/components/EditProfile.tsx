import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateUser, type UserResponse } from "../helpers/authApi";

interface EditProfileProps {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function EditProfile({ userId, firstName, lastName, email }: EditProfileProps) {
  const [form, setForm] = useState({
    firstName,
    lastName,
    email,
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await updateUser(userId, form);
      const data: UserResponse = res.data;

      if (data.status === 200) {
        setSuccessMessage(data.message || "Profile updated!");
        setTimeout(() => navigate("/profile"), 2000);
      } else {
        setErrorMessage(data.message || "Update failed");
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

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
        <input
          type="text"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          placeholder="First Name"
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="text"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          placeholder="Last Name"
          className="w-full p-3 border rounded"
          required
        />
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full p-3 border rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
