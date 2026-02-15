FROM minio/minio:latest

# Tạo thư mục certs
RUN mkdir -p /root/.minio/certs

# Copy chứng chỉ vào
COPY public.crt /root/.minio/certs/public.crt
COPY private.key /root/.minio/certs/private.key

# Copy script init & cors config
COPY init.sh /init.sh
COPY cors.json /etc/config/cors.json

# Set quyền chạy cho script
RUN chmod +x /init.sh

EXPOSE 9000
EXPOSE 9001

# Đặt entrypoint chạy script init
ENTRYPOINT ["sh", "/init.sh"]