# Chọn base image
FROM redis:7-alpine

# Copy config nếu có (optional)
COPY ./redis.conf /usr/local/etc/redis/redis.conf

# Expose port
EXPOSE 6379

# Command để chạy redis với config (nếu dùng config)
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
