// Switch to or create the "chatapp" database
db = db.getSiblingDB("chatapp");

// Tạo collection cho người dùng
db.createCollection("users");

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });