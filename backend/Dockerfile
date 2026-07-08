# Sử dụng image Maven để build ứng dụng
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
# Copy file pom.xml và source code
COPY pom.xml .
COPY src ./src
# Build ứng dụng, bỏ qua test để build nhanh hơn
RUN mvn clean package -DskipTests

# Sử dụng JDK 17 cho môi trường runtime
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
# Copy file jar đã build từ stage trước
COPY --from=build /app/target/*.jar app.jar

# Mở port (Render tự động cung cấp biến môi trường PORT, mặc định Spring Boot dùng 8080)
EXPOSE 8080

# Chạy ứng dụng
ENTRYPOINT ["java", "-jar", "app.jar"]
