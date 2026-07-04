package com.example.backend.services;

import com.example.backend.config.N8nApiKeyFilter;
import com.example.backend.config.N8nProperties;
import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.dtos.N8nEventPushRequestDTO;
import com.example.backend.dtos.N8nNotificationRequestDTO;
import com.example.backend.dtos.N8nWebhookRequestDTO;
import com.example.backend.dtos.NotificationDTO;
import com.example.backend.dtos.n8n.N8nAppPageDTO;
import com.example.backend.dtos.n8n.N8nCinemaSummaryDTO;
import com.example.backend.dtos.CinemaComplexResponseDTO;
import com.example.backend.dtos.n8n.N8nFoodMenuDTO;
import com.example.backend.dtos.n8n.N8nFoodMenuListResponseDTO;
import com.example.backend.dtos.n8n.N8nMovieDetailDTO;
import com.example.backend.dtos.n8n.N8nMovieListResponseDTO;
import com.example.backend.dtos.n8n.N8nMovieSummaryDTO;
import com.example.backend.dtos.n8n.N8nOrderSummaryDTO;
import com.example.backend.dtos.n8n.N8nPriceSummaryDTO;
import com.example.backend.dtos.n8n.N8nShowtimeListResponseDTO;
import com.example.backend.dtos.n8n.N8nShowtimeSummaryDTO;
import com.example.backend.dtos.n8n.N8nVoucherSummaryDTO;
import com.example.backend.entities.Movie;
import com.example.backend.repositories.MovieRepository;
import com.example.backend.repositories.ShowtimeRepository;
import com.example.backend.entities.enums.VoucherScope;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class N8nService {

    private final N8nProperties n8nProperties;
    private final MovieService movieService;
    private final MovieRepository movieRepository;
    private final ShowtimeService showtimeService;
    private final OrderService orderService;
    private final CinemaComplexService cinemaComplexService;
    private final NotificationService notificationService;
    private final N8nAgentMapper n8nAgentMapper;
    private final PriceService priceService;
    private final VoucherService voucherService;
    private final FoodComboService foodComboService;
    private final ShowtimeRepository showtimeRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(120_000);
        return new RestTemplate(factory);
    }

    private static final ThreadLocal<String> lastChatSource = new ThreadLocal<>();
    private static final ThreadLocal<Map<String, Object>> lastChatMeta = new ThreadLocal<>();

    public String getLastChatSource() {
        String source = lastChatSource.get();
        return source != null ? source : "fallback";
    }

    public Map<String, Object> getLastChatMeta() {
        Map<String, Object> meta = lastChatMeta.get();
        return meta != null ? meta : Map.of();
    }

    public Map<String, Object> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("service", "movie-ticket-booking");
        status.put("integration", "n8n");
        status.put("enabled", n8nProperties.isEnabled());
        status.put("webhookConfigured", n8nProperties.getWebhookUrl() != null
                && !n8nProperties.getWebhookUrl().isBlank());
        status.put("timestamp", LocalDateTime.now().toString());
        return status;
    }

    public N8nMovieListResponseDTO getMoviesForAgent(String status) {
        List<MovieResponseDTO> movies;
        String listType;
        String description;

        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            movies = movieService.getAllMovies();
            listType = "Tất cả phim";
            description = "Danh sách toàn bộ phim trên hệ thống Cinesmart.";
        } else if (isNowShowingStatus(status)) {
            movies = movieService.getNowShowingMovies();
            listType = N8nAgentMapper.LIST_TYPE_NOW_SHOWING;
            description = "Phim đang chiếu trong danh mục rạp (đã từng/đang có lịch). "
                    + "Danh sách này KHÔNG đảm bảo còn suất vào ngày hoặc thành phố cụ thể. "
                    + "Nếu khách hỏi suất hôm nay/ngày mai hoặc theo thành phố → dùng get_movies_with_showtimes.";
        } else if (isComingSoonStatus(status)) {
            movies = movieService.getComingSoonMovies();
            listType = "Phim sắp chiếu";
            description = "Phim sắp ra mắt, chưa có suất chiếu trên hệ thống.";
        } else {
            throw new IllegalArgumentException(
                    "status không hợp lệ. Dùng: NOW_SHOWING, COMING_SOON hoặc để trống");
        }

        List<N8nMovieSummaryDTO> movieList = movies.stream()
                .map(movie -> n8nAgentMapper.toMovieSummary(movie, listType))
                .toList();

        return N8nMovieListResponseDTO.builder()
                .listType(listType)
                .description(description)
                .movies(movieList)
                .build();
    }

    public N8nMovieListResponseDTO getMoviesWithShowtimesForAgent(String date, String province) {
        date = sanitizeN8nParameter(date);
        province = sanitizeN8nParameter(province);

        LocalDate localDate;
        if (date == null) {
            localDate = LocalDate.now();
        } else {
            try {
                localDate = LocalDate.parse(date);
                if (localDate.getYear() < LocalDate.now().getYear()) {
                    localDate = localDate.withYear(LocalDate.now().getYear());
                }
                if (localDate.isBefore(LocalDate.now())) {
                    localDate = LocalDate.now();
                }
            } catch (Exception e) {
                localDate = LocalDate.now();
            }
        }

        LocalDateTime startOfDay = localDate.atStartOfDay();
        LocalDateTime endOfDay = localDate.plusDays(1).atStartOfDay();
        LocalDateTime now = LocalDateTime.now();
        if (localDate.equals(LocalDate.now()) && now.isAfter(startOfDay)) {
            startOfDay = now;
        }

        List<Movie> movies = showtimeRepository.findMoviesWithPublicShowtimesOnDate(
                startOfDay, endOfDay, province);

        List<N8nMovieSummaryDTO> movieList = movies.stream()
                .map(movie -> movieService.getMovieById(movie.getMovieId()))
                .map(movie -> n8nAgentMapper.toMovieSummary(movie, N8nAgentMapper.LIST_TYPE_WITH_SHOWTIMES))
                .toList();

        String provinceLabel = province != null ? province : "toàn quốc";
        return N8nMovieListResponseDTO.builder()
                .listType(N8nAgentMapper.LIST_TYPE_WITH_SHOWTIMES)
                .description("Phim đang có suất chiếu còn vé vào ngày " + localDate + " tại " + provinceLabel + ". "
                        + "Đây là danh sách đúng khi khách hỏi 'phim gì chiếu hôm nay', 'có suất nào', 'đặt vé được phim gì'.")
                .date(localDate)
                .province(province)
                .movies(movieList)
                .build();
    }

    private MovieResponseDTO resolveMovie(Long movieId, String movieTitle) {
        if (movieId != null) {
            return movieService.getMovieById(movieId);
        } else if (movieTitle != null && !movieTitle.isBlank()) {
            List<Movie> movies = movieRepository.findByTitleContainingIgnoreCase(movieTitle.trim());
            if (movies.isEmpty()) {
                throw new IllegalArgumentException("Không tìm thấy phim nào có tên chứa: " + movieTitle);
            }
            // Trả về phim đầu tiên tìm thấy
            Movie firstMatch = movies.get(0);
            return movieService.getMovieById(firstMatch.getMovieId());
        }
        throw new IllegalArgumentException("Phải cung cấp movieId hoặc movieTitle");
    }

    public N8nMovieDetailDTO getMovieDetailForAgent(Long movieId, String movieTitle) {
        MovieResponseDTO movie = resolveMovie(movieId, movieTitle);
        return n8nAgentMapper.toMovieDetail(movie);
    }

    public N8nShowtimeListResponseDTO getShowtimesForAgent(Long movieId, String movieTitle, String province, String date) {
        MovieResponseDTO movie = resolveMovie(movieId, movieTitle);
        date = sanitizeN8nParameter(date);
        province = sanitizeN8nParameter(province);

        if (date == null) {
            throw new IllegalArgumentException("date là bắt buộc (định dạng yyyy-MM-dd)");
        }

        LocalDate localDate;
        try {
            localDate = LocalDate.parse(date);
            if (localDate.getYear() < LocalDate.now().getYear()) {
                localDate = localDate.withYear(LocalDate.now().getYear());
            }
            if (localDate.isBefore(LocalDate.now())) {
                localDate = LocalDate.now();
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Định dạng ngày không hợp lệ: " + date);
        }
        List<N8nShowtimeSummaryDTO> showtimes = showtimeService
                .getPublicShowtimes(movie.getMovieId(), province, localDate).stream()
                .map(n8nAgentMapper::toShowtimeSummary)
                .toList();

        String provinceLabel = province != null ? province : "toàn quốc";
        String description = showtimes.isEmpty()
                ? "Phim \"" + movie.getTitle() + "\" không có suất chiếu còn vé vào ngày "
                        + localDate + " tại " + provinceLabel + "."
                : "Các suất chiếu còn vé của phim \"" + movie.getTitle() + "\" vào ngày "
                        + localDate + " tại " + provinceLabel + ".";

        return N8nShowtimeListResponseDTO.builder()
                .movieTitle(movie.getTitle())
                .date(localDate)
                .province(province)
                .description(description)
                .showtimes(showtimes)
                .build();
    }

    private boolean isNowShowingStatus(String status) {
        return "NOW_SHOWING".equalsIgnoreCase(status)
                || "DANG_CHIEU".equalsIgnoreCase(status)
                || "DANG CHIEU".equalsIgnoreCase(status);
    }

    private boolean isComingSoonStatus(String status) {
        return "COMING_SOON".equalsIgnoreCase(status)
                || "SAP_CHIEU".equalsIgnoreCase(status)
                || "SAP CHIEU".equalsIgnoreCase(status);
    }

    private String sanitizeN8nParameter(String param) {
        if (param == null) return null;
        param = param.trim();
        if (param.startsWith("=")) {
            param = param.substring(1).trim();
        }
        if (param.equals("[object Object]") || param.isBlank()) {
            return null;
        }
        return param;
    }

    public N8nFoodMenuListResponseDTO getFoodCombosForAgent(Long cinemaId, String cinemaName, String province) {
        String foodDrinksUrl = n8nAgentMapper.buildFoodDrinksUrl();
        String sanitizedProvince = sanitizeN8nParameter(province);
        String sanitizedCinemaName = sanitizeN8nParameter(cinemaName);

        if (cinemaId == null && sanitizedCinemaName == null && sanitizedProvince == null) {
            return N8nFoodMenuListResponseDTO.builder()
                    .description("Đồ ăn/nước uống bán theo từng rạp. Gọi get_cinema_complexes lấy id rạp, "
                            + "hoặc truyền cinemaName / province để tra cứu.")
                    .url(foodDrinksUrl)
                    .menus(List.of())
                    .build();
        }

        List<CinemaComplexResponseDTO> cinemas;
        if (cinemaId != null) {
            CinemaComplexResponseDTO cinema = cinemaComplexService.getAllCinemaComplexes().stream()
                    .filter(c -> cinemaId.equals(c.getComplexId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy rạp với id: " + cinemaId));
            cinemas = List.of(cinema);
        } else if (sanitizedCinemaName != null) {
            cinemas = cinemaComplexService.getAllCinemaComplexes().stream()
                    .filter(c -> c.getName().toLowerCase().contains(sanitizedCinemaName.toLowerCase()))
                    .toList();
            if (cinemas.isEmpty()) {
                throw new IllegalArgumentException("Không tìm thấy rạp có tên chứa: " + sanitizedCinemaName);
            }
        } else {
            cinemas = cinemaComplexService.getAllCinemaComplexes().stream()
                    .filter(c -> matchesProvinceFilter(c, sanitizedProvince))
                    .toList();
            if (cinemas.isEmpty()) {
                throw new IllegalArgumentException("Không tìm thấy rạp tại: " + sanitizedProvince);
            }
        }

        List<N8nFoodMenuDTO> menus = cinemas.stream()
                .map(cinema -> n8nAgentMapper.toFoodMenu(
                        cinema,
                        foodComboService.getFoodCombosByCinemaComplexId(cinema.getComplexId())))
                .toList();

        String description;
        if (menus.isEmpty()) {
            description = "Không tìm thấy menu đồ ăn cho bộ lọc hiện tại.";
        } else if (cinemaId != null || sanitizedCinemaName != null) {
            description = "Menu đồ ăn/nước uống tại rạp " + menus.get(0).getCinemaName() + ".";
        } else {
            description = "Menu đồ ăn/nước uống tại các rạp ở " + sanitizedProvince + ".";
        }

        return N8nFoodMenuListResponseDTO.builder()
                .description(description)
                .url(foodDrinksUrl)
                .menus(menus)
                .build();
    }

    private boolean matchesProvinceFilter(CinemaComplexResponseDTO cinema, String province) {
        if (province == null) {
            return true;
        }
        String cinemaProvince = cinema.getAddressProvince();
        return cinemaProvince != null
                && cinemaProvince.toLowerCase().contains(province.toLowerCase());
    }

    public List<N8nCinemaSummaryDTO> getCinemasForAgent() {
        return cinemaComplexService.getAllCinemaComplexes().stream()
                .map(n8nAgentMapper::toCinemaSummary)
                .toList();
    }

    public List<N8nOrderSummaryDTO> getUserOrdersForAgent(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId là bắt buộc");
        }
        return orderService.getOrdersByUser(userId).stream()
                .map(n8nAgentMapper::toOrderSummary)
                .toList();
    }

    public List<N8nVoucherSummaryDTO> getVouchersForAgent() {
        return voucherService.getCustomerVisiblePublicVouchers().stream()
                .map(n8nAgentMapper::toVoucherSummary)
                .toList();
    }

    public List<N8nAppPageDTO> getAppPagesForAgent() {
        return n8nAgentMapper.getAppPages();
    }

    public List<N8nPriceSummaryDTO> getPricesForAgent() {
        return priceService.getAllPrices().stream()
                .map(n8nAgentMapper::toPriceSummary)
                .toList();
    }

    public Map<String, Object> handleWebhook(N8nWebhookRequestDTO request) {
        if (request.getAction() == null || request.getAction().isBlank()) {
            throw new IllegalArgumentException("action là bắt buộc");
        }

        return switch (request.getAction().toLowerCase()) {
            case "send_notification" -> sendNotificationFromPayload(request.getPayload());
            case "push_event" -> pushEventFromPayload(request.getPayload());
            default -> throw new IllegalArgumentException("action không được hỗ trợ: " + request.getAction());
        };
    }

    public void sendNotification(N8nNotificationRequestDTO request) {
        validateNotificationRequest(request);
        NotificationDTO notification = NotificationDTO.builder()
                .type(request.getType() != null ? request.getType() : "N8N_AUTOMATION")
                .title(request.getTitle())
                .message(request.getMessage())
                .timestamp(LocalDateTime.now().toString())
                .data(request.getData())
                .build();
        notificationService.sendNotificationToUser(request.getUserId(), notification);
    }

    public String sendChatMessage(String message, String sessionId, Long userId) {
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("message là bắt buộc");
        }

        String webhookUrl = n8nProperties.getWebhookUrl();
        if (webhookUrl != null && !webhookUrl.isBlank()) {
            try {
                String reply = callN8nChatWebhook(message.trim(), sessionId, userId);
                lastChatSource.set("n8n");
                return reply;
            } catch (Exception e) {
                log.warn("n8n chat webhook failed: {}", e.getMessage());
                throw new IllegalStateException("Không nhận được phản hồi từ n8n AI");
            }
        }

        lastChatSource.set("fallback");
        return generateFallbackReply(message.trim());
    }

    public Map<String, Object> pushEvent(N8nEventPushRequestDTO request) {
        if (request.getEventType() == null || request.getEventType().isBlank()) {
            throw new IllegalArgumentException("eventType là bắt buộc");
        }
        return pushToN8nWebhook(request.getEventType(), request.getPayload());
    }

    public Map<String, Object> pushToN8nWebhook(String eventType, Map<String, Object> payload) {
        String webhookUrl = n8nProperties.getWebhookUrl();
        if (webhookUrl == null || webhookUrl.isBlank()) {
            throw new IllegalStateException("N8N_WEBHOOK_URL chưa được cấu hình trong .env");
        }

        Map<String, Object> body = new HashMap<>();
        body.put("eventType", eventType);
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("source", "movie-ticket-booking");
        if (payload != null) {
            body.put("payload", payload);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(N8nApiKeyFilter.API_KEY_HEADER, n8nProperties.getApiKey());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(webhookUrl, entity, String.class);

        log.info("Pushed event '{}' to n8n webhook, status={}", eventType, response.getStatusCode());

        Map<String, Object> result = new HashMap<>();
        result.put("eventType", eventType);
        result.put("webhookUrl", webhookUrl);
        result.put("statusCode", response.getStatusCode().value());
        result.put("responseBody", response.getBody());
        return result;
    }

    private Map<String, Object> sendNotificationFromPayload(Map<String, Object> payload) {
        if (payload == null) {
            throw new IllegalArgumentException("payload là bắt buộc cho send_notification");
        }
        N8nNotificationRequestDTO request = N8nNotificationRequestDTO.builder()
                .userId(toLong(payload.get("userId")))
                .type((String) payload.get("type"))
                .title((String) payload.get("title"))
                .message((String) payload.get("message"))
                .data(castToStringObjectMap(payload.get("data")))
                .build();
        sendNotification(request);
        return Map.of("success", true, "action", "send_notification");
    }

    private Map<String, Object> pushEventFromPayload(Map<String, Object> payload) {
        if (payload == null) {
            throw new IllegalArgumentException("payload là bắt buộc cho push_event");
        }
        String eventType = (String) payload.get("eventType");
        Map<String, Object> eventPayload = castToStringObjectMap(payload.get("payload"));
        return pushToN8nWebhook(eventType, eventPayload);
    }

    private String callN8nChatWebhook(String message, String sessionId, Long userId) throws Exception {
        Map<String, Object> body = new HashMap<>();
        String resolvedSessionId = sessionId != null && !sessionId.isBlank()
                ? sessionId
                : (userId != null ? String.valueOf(userId) : "guest");
        Object userIdPayload = resolvedSessionId.matches("\\d+")
                ? Long.parseLong(resolvedSessionId)
                : resolvedSessionId;
        body.put("userId", userIdPayload);
        body.put("chat_message", message);
        body.put("type", "chat");
        body.put("message", message);
        body.put("chatInput", message);
        body.put("sessionId", resolvedSessionId);
        body.put("timestamp", LocalDateTime.now().toString());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        log.info("Calling n8n webhook {} with message={}", n8nProperties.getWebhookUrl(), message);
        ResponseEntity<String> response = restTemplate.postForEntity(
                n8nProperties.getWebhookUrl(), entity, String.class);

        String responseBody = response.getBody();
        log.info("n8n chat webhook status={}, body={}", response.getStatusCode(), responseBody);

        if (!response.getStatusCode().is2xxSuccessful() || responseBody == null) {
            throw new IllegalStateException("n8n webhook trả về status " + response.getStatusCode());
        }

        storeChatMetaFromBody(responseBody);
        String reply = extractReplyFromWebhookResponse(responseBody);
        if (reply == null || reply.isBlank()) {
            throw new IllegalStateException(
                    "n8n webhook trả về reply rỗng. Kiểm tra node Respond to Webhook / Edit Fields trong n8n.");
        }
        return reply;
    }

    private String extractReplyFromWebhookResponse(String body) throws Exception {
        String trimmed = body.trim();
        if (trimmed.isEmpty()) {
            return "";
        }

        if (trimmed.startsWith("[")) {
            List<Object> array = objectMapper.readValue(trimmed, new TypeReference<>() {});
            if (!array.isEmpty()) {
                return extractReplyFromValue(array.get(0));
            }
            return "";
        }

        if (trimmed.startsWith("{")) {
            Map<String, Object> json = objectMapper.readValue(trimmed, new TypeReference<>() {});
            return extractReplyFromValue(json);
        }

        return trimmed;
    }

    private void storeChatMetaFromBody(String body) {
        lastChatMeta.remove();
        try {
            String trimmed = body.trim();
            if (!trimmed.startsWith("{")) {
                return;
            }
            Map<String, Object> json = objectMapper.readValue(trimmed, new TypeReference<>() {});
            mergeChatMetaFromMap(json);
            Object replyField = json.get("reply");
            if (replyField instanceof String replyText) {
                mergeChatMetaFromJsonString(replyText);
            }
        } catch (Exception e) {
            log.debug("Could not parse chat meta from n8n body: {}", e.getMessage());
        }
    }

    private void mergeChatMetaFromMap(Map<String, Object> json) {
        if (json == null || json.isEmpty()) {
            return;
        }
        Map<String, Object> meta = lastChatMeta.get() != null
                ? new HashMap<>(lastChatMeta.get())
                : new HashMap<>();

        Object action = json.get("action");
        if (action != null && !String.valueOf(action).isBlank()) {
            meta.put("action", String.valueOf(action).trim().toUpperCase());
        }
        Object targetUrl = json.get("target_url");
        if (targetUrl == null) {
            targetUrl = json.get("targetUrl");
        }
        if (targetUrl != null && !String.valueOf(targetUrl).isBlank()) {
            meta.put("target_url", String.valueOf(targetUrl).trim());
        }
        Object responseAiAgent = json.get("response_ai_agent");
        if (responseAiAgent == null) {
            responseAiAgent = json.get("responseAiAgent");
        }
        if (responseAiAgent != null && !String.valueOf(responseAiAgent).isBlank()) {
            meta.put("response_ai_agent", String.valueOf(responseAiAgent).trim());
        }

        if (!meta.isEmpty()) {
            lastChatMeta.set(meta);
        }
    }

    private void mergeChatMetaFromJsonString(String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        String trimmed = text.trim();
        if (!trimmed.startsWith("{")) {
            return;
        }
        try {
            Map<String, Object> json = objectMapper.readValue(trimmed, new TypeReference<>() {});
            mergeChatMetaFromMap(json);
        } catch (Exception e) {
            log.debug("Could not parse nested chat meta JSON: {}", e.getMessage());
        }
    }

    private String extractReplyFromValue(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof String text) {
            String trimmed = text.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                try {
                    mergeChatMetaFromJsonString(trimmed.startsWith("{") ? trimmed : null);
                    if (trimmed.startsWith("[")) {
                        List<Object> array = objectMapper.readValue(trimmed, new TypeReference<>() {});
                        if (!array.isEmpty()) {
                            return extractReplyFromValue(array.get(0));
                        }
                    } else {
                        Map<String, Object> parsed = objectMapper.readValue(trimmed, new TypeReference<>() {});
                        mergeChatMetaFromMap(parsed);
                        return extractReplyFromValue(parsed);
                    }
                } catch (Exception e) {
                    log.debug("Could not parse reply JSON string: {}", e.getMessage());
                }
            }
            return trimmed;
        }
        if (value instanceof Map<?, ?> map) {
            for (String key : List.of("reply", "output", "response_ai_agent", "text", "message", "response")) {
                Object candidate = map.get(key);
                if (candidate != null) {
                    String extracted = extractReplyFromValue(candidate);
                    if (!extracted.isBlank()) {
                        return extracted;
                    }
                }
            }
            Object json = map.get("json");
            if (json != null) {
                String extracted = extractReplyFromValue(json);
                if (!extracted.isBlank()) {
                    return extracted;
                }
            }
            Object data = map.get("data");
            if (data != null) {
                String extracted = extractReplyFromValue(data);
                if (!extracted.isBlank()) {
                    return extracted;
                }
            }
            return "";
        }
        if (value instanceof List<?> list) {
            if (list.isEmpty()) {
                return "";
            }
            return extractReplyFromValue(list.get(0));
        }
        return "";
    }

    private String generateFallbackReply(String message) {
        String lower = normalizeChatText(message);

        if (lower.contains("dat ve") || lower.contains("đặt vé")
                || lower.contains("mua ve") || lower.contains("mua vé")
                || (lower.contains("đặt") && lower.contains("vé"))
                || (lower.contains("mua") && lower.contains("vé"))) {
            return "Bạn có thể đặt vé nhanh qua tab \"Đặt vé nhanh\" bên trái, hoặc chọn phim rồi bấm \"Mua vé\" nhé!";
        }
        if (lower.contains("lich chieu") || lower.contains("lịch chiếu")
                || lower.contains("suất chiếu") || lower.contains("suat chieu")
                || lower.contains("suất") || lower.contains("chiếu")) {
            return "Vào mục Lịch chiếu để xem suất theo ngày và rạp. "
                    + "Bạn có thể hỏi mình \"phim nào có suất hôm nay ở HCM\" để xem phim đang chiếu thực tế nhé!";
        }
        if (lower.contains("khuyen mai") || lower.contains("khuyến mãi")
                || lower.contains("voucher") || lower.contains("giảm giá") || lower.contains("giam gia")) {
            return "Hiện có voucher giảm giá trên trang chủ. Đăng nhập để nhận ưu đãi dành riêng cho bạn!";
        }
        if (mentionsMovies(lower)) {
            return buildNowShowingReply();
        }
        if (isGreeting(lower)) {
            return "Xin chào! Mình là Popcorn Bot. Bạn cần hỗ trợ đặt vé, lịch chiếu hay gợi ý phim không?";
        }
        return "Mình chưa nhận phản hồi từ n8n AI. Bạn thử hỏi \"phim đang chiếu\" hoặc chọn nút gợi ý bên dưới nhé!";
    }

    private String normalizeChatText(String message) {
        return message.toLowerCase()
                .replace('đ', 'd')
                .trim();
    }

    private boolean isGreeting(String lower) {
        return lower.equals("hi")
                || lower.equals("hello")
                || lower.equals("chao")
                || lower.equals("xin chao")
                || lower.startsWith("xin chao ")
                || lower.startsWith("chao ")
                || lower.contains("xin chao")
                || lower.contains("hello");
    }

    private boolean mentionsMovies(String lower) {
        return lower.contains("phim")
                || lower.contains("goi y")
                || lower.contains("gợi ý")
                || lower.contains("phim hay")
                || lower.contains("dang chieu")
                || lower.contains("đang chiếu");
    }

    private String buildNowShowingReply() {
        N8nMovieListResponseDTO catalog = getMoviesForAgent("NOW_SHOWING");
        if (catalog.getMovies() == null || catalog.getMovies().isEmpty()) {
            return "Hiện chưa có phim trong danh mục đang chiếu. "
                    + "Bạn hỏi \"phim nào có suất hôm nay\" để xem phim đang chiếu thực tế nhé!";
        }

        StringBuilder sb = new StringBuilder("Phim đang chiếu tại Cinesmart:\n");
        int limit = Math.min(5, catalog.getMovies().size());
        for (int i = 0; i < limit; i++) {
            sb.append("• ").append(catalog.getMovies().get(i).getTitle()).append('\n');
        }
        if (catalog.getMovies().size() > limit) {
            sb.append("... và ").append(catalog.getMovies().size() - limit)
                    .append(" phim khác. Hỏi mình \"phim nào có suất hôm nay\" để xem lịch chiếu cụ thể nhé!");
        } else {
            sb.append("Hỏi mình \"phim nào có suất hôm nay\" hoặc chọn phim để xem lịch chiếu và đặt vé nhé!");
        }
        return sb.toString().trim();
    }

    private void validateNotificationRequest(N8nNotificationRequestDTO request) {
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("userId là bắt buộc");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new IllegalArgumentException("title là bắt buộc");
        }
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            throw new IllegalArgumentException("message là bắt buộc");
        }
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castToStringObjectMap(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        throw new IllegalArgumentException("payload.data phải là object JSON");
    }
}
