import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DEFAULT_AVATAR } from "../constants/common";
import { UserPlus } from "lucide-react";
import { API_URL } from "../constants/common";

interface NavbarProps {
  onSearch: (keyword: string) => void;
  fullName: string;
  imageUrl?: string;
}

export default function Navbar({ onSearch, fullName, imageUrl }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim()) {
      onSearch(searchValue.trim());
      navigate("/search");
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white shadow-md border-b relative">
      {/* Logo */}
      <div
        className="cursor-pointer flex items-center"
        onClick={() => navigate("/chat")}
      >
        <img
          src={`${API_URL}:9000/chat-media/JoChat.svg`}
          alt="JoChat Logo"
          className="h-14 w-14 object-contain"
        />
      </div>

      {/* Search */}
      <div className="flex-1 mx-6">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring focus:border-blue-500"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
      </div>

      {/* Avatar + Dropdown */}
      <div className="relative" ref={avatarRef}>
        <img
          src={imageUrl || DEFAULT_AVATAR}
          alt="User Avatar"
          className="w-10 h-10 rounded-full cursor-pointer object-cover"
          referrerPolicy="no-referrer"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        />
        <button
          className="absolute bottom-0 right-0 bg-white rounded-full p-0.5 shadow cursor-pointer"
          style={{ transform: "translate(0%, 0%)" }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          tabIndex={-1}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border rounded-md shadow-lg overflow-hidden z-50">
            {/* Profile */}
            <button
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100"
              onClick={() => {
                navigate("/profile");
                setDropdownOpen(false);
              }}
            >
              <img
                src={imageUrl || DEFAULT_AVATAR}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              <p className="font-medium text-gray-800 truncate">{fullName}</p>
            </button>

            <div className="border-t-2 border-gray-700 w-48 mx-auto my-1"></div>

            {/* Friend Requests */}
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                navigate("/profile/friend-requests");
                setDropdownOpen(false);
              }}
            >
              <UserPlus className="h-5 w-5 text-blue-600" />
              Friend Requests
            </button>

            {/* Logout */}
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                localStorage.clear();
                navigate("/login");
                setDropdownOpen(false);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                />
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
