# Sử dụng OpenJDK base image
FROM openjdk:17-jdk

# Đặt working directory
WORKDIR /app

# Copy file jar (nhớ build trước)
COPY target/translation-service-0.0.1-SNAPSHOT.jar /app/translation-service-0.0.1-SNAPSHOT.jar

# Expose port (giống server.port)
EXPOSE 8086

# Command để chạy ứng dụng
ENTRYPOINT ["java", "-jar", "/app/translation-service-0.0.1-SNAPSHOT.jar"]