#!/bin/sh

# Chạy MinIO
minio server /data --console-address ":9001" &
MINIO_PID=$!

echo "Waiting for MinIO to start..."
# Dùng -k để curl bỏ qua kiểm tra cert
until curl -sk https://localhost:9000/minio/health/ready; do
    sleep 1
done
echo "MinIO is ready!"

# 1. Thêm alias với --insecure
mc alias set local https://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" --insecure

# 2. Tạo bucket với --insecure
mc mb --ignore-existing local/chat-media --insecure

# 3. Set public với --insecure
mc anonymous set public local/chat-media --insecure

# 4. Cấu hình CORS với --insecure
# Đảm bảo file /etc/config/cors.json có nội dung đúng
mc cors set local/chat-media /etc/config/cors.json --insecure

wait $MINIO_PID