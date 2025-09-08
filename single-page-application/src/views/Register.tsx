import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../helpers/authApi';
import type { RegisterRequest } from '../helpers/authApi';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

export default function Register() {
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'USER',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' }); // Xóa lỗi khi người dùng sửa
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    try {
      await register(formData);
      navigate('/login', {
        state: { successMessage: 'Register successfully. Please login.' },
      });
    } catch (err: any) {
      // Nếu lỗi là object từng trường hoặc có message chung
      if (err?.response?.data) {
        if (err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setFieldErrors(err.response.data);
        }
      } else {
        setError('Registration failed');
      }
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 mb-4 rounded text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Username</label>
            <input
              type="text"
              name="username"
              className="w-full border px-3 py-2 rounded"
              value={formData.username}
              onChange={handleChange}
              required
            />
            {fieldErrors.username && (
              <div className="text-red-600 text-sm mt-1">{fieldErrors.username}</div>
            )}
          </div>

          <div>
            <label className="block mb-1">First Name</label>
            <input
              type="text"
              name="firstName"
              className="w-full border px-3 py-2 rounded"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            {fieldErrors.firstName && (
              <div className="text-red-600 text-sm mt-1">{fieldErrors.firstName}</div>
            )}
          </div>

          <div>
            <label className="block mb-1">Last Name</label>
            <input
              type="text"
              name="lastName"
              className="w-full border px-3 py-2 rounded"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
            {fieldErrors.lastName && (
              <div className="text-red-600 text-sm mt-1">{fieldErrors.lastName}</div>
            )}
          </div>

          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              name="email"
              className="w-full border px-3 py-2 rounded"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {fieldErrors.email && (
              <div className="text-red-600 text-sm mt-1">{fieldErrors.email}</div>
            )}
          </div>

          <div>
            <label className="block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="w-full border px-3 py-2 rounded pr-10"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <AiOutlineEyeInvisible size={20} />
                ) : (
                  <AiOutlineEye size={20} />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <div className="text-red-600 text-sm mt-1">{fieldErrors.password}</div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Register
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
