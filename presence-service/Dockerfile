# Sử dụng OpenJDK base image
FROM eclipse-temurin:17-jdk

# Đặt working directory
WORKDIR /app

# Copy file jar (nhớ build trước)
COPY target/presence-service-0.0.1-SNAPSHOT.jar /app/presence-service-0.0.1-SNAPSHOT.jar

# Expose port (giống server.port)
EXPOSE 8085

# Command để chạy ứng dụng
ENTRYPOINT ["java", "-jar", "/app/presence-service-0.0.1-SNAPSHOT.jar"]