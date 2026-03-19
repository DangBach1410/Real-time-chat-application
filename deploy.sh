#!/bin/bash

# Danh sách các dịch vụ Java cần build
services=(
  "config-service" 
  "service-registry" 
  "api-gateway" 
  "auth-service" 
  "chat-service" 
  "media-service" 
  "notification-service" 
  "presence-service" 
  "translation-service" 
  "admin-service"
)

echo ">>> BẮT ĐẦU BUILD CÁC DỊCH VỤ JAVA <<<"

for service in "${services[@]}"
do
    echo "Đang build file JAR cho: $service..."
    cd "$service" || exit
    mvn clean package -DskipTests
    cd ..
done

echo ">>> KHỞI ĐỘNG DOCKER COMPOSE <<<"
sudo docker compose up -d --build

echo "Đang chờ 5 phút để các dịch vụ hạ tầng sẵn sàng..."
sleep 300

echo ">>> KHỞI ĐỘNG LẠI DOCKER COMPOSE (SERVICES & MONITORING) <<<"
sudo docker compose restart \
  api-gateway auth-service chat-service media-service \
  notification-service presence-service translation-service \
  admin-service grafana prometheus

echo ">>> TRIỂN KHAI FRONTEND VỚI PM2 <<<"

# 1. Frontend User
echo "Đang build FE User..."
cd single-page-application
npm install && npm run build
pm2 reload fe-user || pm2 start "serve -s dist -p 4001" --name "fe-user"
cd ..

# 2. Frontend Admin
echo "Đang build FE Admin..."
cd admin-web
npm install && npm run build
pm2 reload fe-admin || pm2 start "serve -s dist -p 5174" --name "fe-admin"
cd ..

# Dọn dẹp các Image cũ để tiết kiệm dung lượng VPS
sudo docker image prune -f

echo "=== TẤT CẢ ĐÃ TRIỂN KHAI THÀNH CÔNG ==="