# Sử dụng image MongoDB chính thức làm base image
FROM mongo

# Tạo thư mục chứa script init
RUN mkdir -p /docker-entrypoint-initdb.d

# Copy init script vào thư mục mặc định để Mongo chạy khi container khởi tạo
COPY ./init.js /docker-entrypoint-initdb.d/init.js

# Port mặc định MongoDB
EXPOSE 27017
