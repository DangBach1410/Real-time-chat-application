import { useState } from "react";

interface NavbarProps {
  onSearch: (value: string) => void;
  onNavigate: (view: "chat" | "search" | "profile") => void;
}

export default function Navbar({ onSearch, onNavigate }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white shadow-md border-b relative">
      {/* Logo */}
      <div 
        className="text-2xl font-bold text-blue-600 cursor-pointer"
        onClick={() => onNavigate("chat")}
      >
        JoFox
      </div>

      {/* Search */}
      <div className="flex-1 mx-6">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring focus:border-blue-500"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Avatar */}
      <div className="relative">
        <img
          src="https://i.pravatar.cc/40"
          alt="User Avatar"
          className="w-10 h-10 rounded-full cursor-pointer"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        />

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg">
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                onNavigate("profile");
                setDropdownOpen(false);
              }}
            >
              View Profile
            </button>
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                localStorage.clear(); 
                window.location.href = "/login";
                setDropdownOpen(false);
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
