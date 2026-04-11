package com.example.backend;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

	public static void main(String[] args) {
		loadEnvFileIntoSystemProperties();
		SpringApplication.run(BackendApplication.class, args);
	}

	/**
	 * Đọc file .env theo nghĩa đen: cắt tại dấu {@code =} đầu tiên, không expand {@code $}
	 * (thư viện dotenv hay cắt/sai với mật khẩu kiểu {@code ...$}). Gán vào {@link System#setProperty}
	 * trước khi Spring khởi tạo — Spring đọc được {@code ${SPRING_DATASOURCE_PASSWORD}} giống biến môi trường.
	 * Không ghi đè nếu biến đã có trên OS ({@link System#getenv}).
	 */
	private static void loadEnvFileIntoSystemProperties() {
		Path envPath = resolveEnvFilePath();
		if (envPath == null) {
			return;
		}
		try {
			List<String> lines = Files.readAllLines(envPath, StandardCharsets.UTF_8);
			if (!lines.isEmpty() && !lines.get(0).isEmpty() && lines.get(0).charAt(0) == '\uFEFF') {
				lines.set(0, lines.get(0).substring(1));
			}
			for (String rawLine : lines) {
				String line = rawLine.strip();
				if (line.isEmpty() || line.startsWith("#")) {
					continue;
				}
				int eq = line.indexOf('=');
				if (eq <= 0) {
					continue;
				}
				String key = line.substring(0, eq).trim();
				if (key.isEmpty()) {
					continue;
				}
				String value = line.substring(eq + 1).trim();
				value = stripOuterQuotes(value);
				if (System.getenv(key) != null) {
					continue;
				}
				if (System.getProperty(key) != null) {
					continue;
				}
				System.setProperty(key, value);
			}
		} catch (IOException e) {
			System.err.println("Warning: could not read .env at " + envPath + ": " + e.getMessage());
		}
	}

	private static Path resolveEnvFilePath() {
		Path cwd = Paths.get("").toAbsolutePath().normalize();
		Path parent = cwd.getParent();
		Path[] candidates = new Path[] {
			cwd.resolve(".env"),
			cwd.resolve("backend").resolve(".env"),
			parent != null ? parent.resolve(".env") : null,
			parent != null ? parent.resolve("backend").resolve(".env") : null
		};
		for (Path p : candidates) {
			if (p != null && Files.isRegularFile(p)) {
				return p;
			}
		}
		return null;
	}

	private static String stripOuterQuotes(String value) {
		if (value.length() >= 2) {
			char a = value.charAt(0);
			char b = value.charAt(value.length() - 1);
			if (a == '"' && b == '"') {
				return unescapeDoubleQuoted(value.substring(1, value.length() - 1));
			}
			if (a == '\'' && b == '\'') {
				return value.substring(1, value.length() - 1);
			}
		}
		return value;
	}

	private static String unescapeDoubleQuoted(String s) {
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < s.length(); i++) {
			char c = s.charAt(i);
			if (c == '\\' && i + 1 < s.length()) {
				char n = s.charAt(i + 1);
				if (n == '\\' || n == '"') {
					sb.append(n);
					i++;
					continue;
				}
			}
			sb.append(c);
		}
		return sb.toString();
	}
}
