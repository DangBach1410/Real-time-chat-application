# Sử dụng OpenJDK base image
FROM openjdk:17-jdk

# Đặt working directory
WORKDIR /app

# Copy file jar (nhớ build trước)
COPY target/auth-service-0.0.1-SNAPSHOT.jar /app/auth-service-0.0.1-SNAPSHOT.jar

# Expose port (giống server.port)
EXPOSE 8082

# Command để chạy ứng dụng
ENTRYPOINT ["java", "-jar", "/app/auth-service-0.0.1-SNAPSHOT.jar"]