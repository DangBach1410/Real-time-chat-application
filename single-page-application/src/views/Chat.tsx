import { useState } from 'react';

export default function Chat() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const groups = [
    { id: '1', name: 'Project A', avatar: 'https://i.pravatar.cc/150?img=1' },
    { id: '2', name: 'Team Chat', avatar: 'https://i.pravatar.cc/150?img=2' },
    { id: '3', name: 'Friends', avatar: 'https://i.pravatar.cc/150?img=3' }
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white shadow-md border-b">
        <div className="text-2xl font-bold text-blue-600">JoFox</div>

        <div className="flex-1 mx-6">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring focus:border-blue-500"
          />
        </div>

        <div>
          <img
            src="https://i.pravatar.cc/40"
            alt="User Avatar"
            className="w-10 h-10 rounded-full"
          />
        </div>
      </div>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Chat Group List */}
        <aside className="w-64 bg-gray-100 border-r overflow-y-auto">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-200 ${
                selectedGroup === group.id ? 'bg-gray-300' : ''
              }`}
            >
              <img
                src={group.avatar}
                alt={group.name}
                className="w-10 h-10 rounded-full"
              />
              <span className="font-medium">{group.name}</span>
            </div>
          ))}
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex items-center justify-center bg-white">
          {selectedGroup ? (
            <div className="text-gray-700 text-xl">
              Messages for group ID: {selectedGroup}
              {/* TODO: Replace with actual message list */}
            </div>
          ) : (
            <div className="text-gray-500 text-2xl font-semibold text-center px-4">
              Welcome to JoFox
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
