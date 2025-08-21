export default function Profile() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
      <img
        src="https://i.pravatar.cc/150?img=5"
        alt="Profile"
        className="w-32 h-32 rounded-full mb-4"
      />
      <h2 className="text-2xl font-semibold text-gray-800">John Doe</h2>
      <p className="text-gray-600">johndoe@example.com</p>
    </div>
  );
}
