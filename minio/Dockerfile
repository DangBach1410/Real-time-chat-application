FROM minio/minio:latest

# Copy script init & cors config
COPY init.sh /init.sh
COPY cors.json /etc/config/cors.json

# Set quyền chạy cho script
RUN chmod +x /init.sh

# Đặt entrypoint chạy script init
ENTRYPOINT ["sh", "/init.sh"]