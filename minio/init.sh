#!/bin/sh

# Chạy MinIO trong background
minio server /data --console-address ":9001" &
MINIO_PID=$!

# Chờ MinIO sẵn sàng
echo "Waiting for MinIO to start..."
until curl -s http://localhost:9000/minio/health/ready; do
    sleep 1
done
echo "MinIO is ready!"

# Thêm alias cho mc
mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

# Tạo bucket chat-media nếu chưa tồn tại
mc mb --ignore-existing local/chat-media

mc anonymous set public local/chat-media

# Cấu hình CORS cho bucket
mc anonymous set-json local/chat-media /etc/config/cors.json

# Giữ container chạy foreground
wait $MINIO_PID
