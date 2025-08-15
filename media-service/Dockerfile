# Sử dụng OpenJDK base image
FROM openjdk:17-jdk

# Thông tin tác giả
LABEL authors="bachtd"

# Đặt working directory
WORKDIR /app

# Copy file jar đã build (nhớ chạy mvn clean package trước)
COPY target/media-service-0.0.1-SNAPSHOT.jar /app/media-service-0.0.1-SNAPSHOT.jar

# Expose port
EXPOSE 8084

# Command để chạy ứng dụng
ENTRYPOINT ["java", "-jar", "/app/media-service-0.0.1-SNAPSHOT.jar"]