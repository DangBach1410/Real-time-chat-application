// Chuyển sang hoặc tạo database "chatapp"
db = db.getSiblingDB("chatapp");

// =====================
// Collection: users
// =====================
db.createCollection("users");

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

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

// Index: tìm nhanh messages theo conversationId + phân trang
db.messages.createIndex({ conversationId: 1, createdAt: -1 });
