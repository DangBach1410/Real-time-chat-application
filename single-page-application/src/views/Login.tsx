import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../helpers/authApi';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import type { LoginRequest, LoginResponse } from '../helpers/authApi';
import { API_URL } from '../constants/common';

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      window.history.replaceState({}, document.title, window.location.pathname);
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await login(formData);
      const { accessToken, refreshToken, userId } = response.data as LoginResponse;

      // Lưu token + userId vào localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("userId", userId);

      navigate("/chat");
    } catch (error: any) {
      console.error("Login failed", error);
      setErrorMessage(error.response?.data?.message || "Login failed");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}:8762/oauth2/authorize/google?redirect_uri=${API_URL}:4000/oauth2/redirect`;
  };

  const handleGithubLogin = () => {
    window.location.href = `${API_URL}:8762/oauth2/authorize/github?redirect_uri=${API_URL}:4000/oauth2/redirect`;
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-center">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1">Username</label>
            <input
              name="username"
              type="text"
              className="w-full border px-3 py-2 rounded"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <label className="block mb-1">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="w-full border px-3 py-2 rounded pr-10"
                value={formData.password}
                onChange={handleInputChange}
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
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>

        <div className="text-center my-4 text-sm text-gray-500">or</div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 py-2 rounded hover:bg-gray-100 transition"
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google Logo"
            className="w-5 h-5"
          />
          <span className="text-gray-700 font-medium">Sign in with Google</span>
        </button>

        <button
          onClick={handleGithubLogin}
          className="w-full mt-3 flex items-center justify-center gap-2 bg-black py-2 rounded hover:opacity-90 transition"
        >
          <img
            src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
            alt="GitHub Logo"
            className="w-5 h-5 invert"
          />
          <span className="text-white font-medium">Sign in with GitHub</span>
        </button>

        <p className="text-center mt-4">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
