import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function OAuth2RedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const userId = params.get("userId");

    if (accessToken && refreshToken && userId) {
      // Lưu token + userId vào localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("userId", userId);

      // Điều hướng tới trang chat
      navigate("/chat");
    } else {
      // lỗi hoặc user cancel login
      navigate("/login", {
        state: { errorMessage: "Login failed" },
      });
    }
  }, [location, navigate]);

  return <div>Redirecting...</div>;
}
