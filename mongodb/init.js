// Chuyển sang hoặc tạo database "chatapp"
db = db.getSiblingDB("chatapp");

// =====================
// Collection: users
// =====================
db.createCollection("users");

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ "friends.id": 1 });
db.users.createIndex({ "friendRequests.senderId": 1 });

// =====================
// Collection: conversations
// =====================
db.createCollection("conversations");

// Index: tìm nhanh theo userId trong members
db.conversations.createIndex({ "members.userId": 1 });

// Index: sắp xếp nhanh khi load danh sách chat
db.conversations.createIndex({ lastMessageAt: -1 });

// =====================
// Collection: messages
// =====================
db.createCollection("messages");
db.messages.createIndex({ conversationId: 1, createdAt: -1 });
db.messages.createIndex({ "sender.userId": 1 });

