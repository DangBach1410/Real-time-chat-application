# Sử dụng OpenJDK base image
FROM eclipse-temurin:17-jdk

# Đặt working directory
WORKDIR /app

# Copy file jar (nhớ build trước)
COPY target/config-service-0.0.1-SNAPSHOT.jar /app/config-service-0.0.1-SNAPSHOT.jar

# Expose port (giống server.port)
EXPOSE 8763

# Command để chạy ứng dụng
ENTRYPOINT ["java", "-jar", "/app/config-service-0.0.1-SNAPSHOT.jar"]