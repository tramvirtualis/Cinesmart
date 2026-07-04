package com.example.backend.services;

import com.example.backend.dtos.CinemaComplexResponseDTO;
import com.example.backend.dtos.FoodComboResponseDTO;
import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.dtos.OrderResponseDTO;
import com.example.backend.dtos.PriceDTO;
import com.example.backend.dtos.ShowtimeResponseDTO;
import com.example.backend.dtos.VoucherResponseDTO;
import com.example.backend.dtos.n8n.N8nAgentLabels;
import com.example.backend.dtos.n8n.N8nAppPageDTO;
import com.example.backend.dtos.n8n.N8nCinemaSummaryDTO;
import com.example.backend.dtos.n8n.N8nFoodComboSummaryDTO;
import com.example.backend.dtos.n8n.N8nFoodMenuDTO;
import com.example.backend.dtos.n8n.N8nMovieDetailDTO;
import com.example.backend.dtos.n8n.N8nMovieSummaryDTO;
import com.example.backend.dtos.n8n.N8nOrderSummaryDTO;
import com.example.backend.dtos.n8n.N8nPriceSummaryDTO;
import com.example.backend.dtos.n8n.N8nShowtimeSummaryDTO;
import com.example.backend.dtos.n8n.N8nVoucherSummaryDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class N8nAgentMapper {

    public static final String LIST_TYPE_NOW_SHOWING = "Phim đang chiếu (danh mục rạp)";
    public static final String LIST_TYPE_WITH_SHOWTIMES = "Phim có suất chiếu (có thể đặt vé)";

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public N8nMovieSummaryDTO toMovieSummary(MovieResponseDTO movie) {
        return toMovieSummary(movie, LIST_TYPE_NOW_SHOWING);
    }

    public N8nMovieSummaryDTO toMovieSummary(MovieResponseDTO movie, String listType) {
        return N8nMovieSummaryDTO.builder()
                .id(movie.getMovieId())
                .title(movie.getTitle())
                .genres(N8nAgentLabels.genres(movie.getGenre()))
                .duration(movie.getDuration())
                .releaseDate(movie.getReleaseDate())
                .status(N8nAgentLabels.movieStatus(movie.getStatus()))
                .listType(listType)
                .url(buildMovieUrl(movie.getMovieId()))
                .build();
    }

    public N8nMovieDetailDTO toMovieDetail(MovieResponseDTO movie) {
        return N8nMovieDetailDTO.builder()
                .id(movie.getMovieId())
                .title(movie.getTitle())
                .genres(N8nAgentLabels.genres(movie.getGenre()))
                .duration(movie.getDuration())
                .releaseDate(movie.getReleaseDate())
                .status(N8nAgentLabels.movieStatus(movie.getStatus()))
                .ageRating(N8nAgentLabels.ageRating(movie.getAgeRating()))
                .director(movie.getDirector())
                .actor(movie.getActor())
                .description(movie.getDescription())
                .url(buildMovieUrl(movie.getMovieId()))
                .build();
    }

    private String buildMovieUrl(Long movieId) {
        if (movieId == null) {
            return null;
        }
        return buildPageUrl("/movie/" + movieId);
    }

    private String buildPageUrl(String path) {
        String base = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        return base + path;
    }

    public String buildFoodDrinksUrl() {
        return buildPageUrl("/food-drinks");
    }

    public N8nFoodComboSummaryDTO toFoodComboSummary(FoodComboResponseDTO combo) {
        return N8nFoodComboSummaryDTO.builder()
                .foodComboId(combo.getFoodComboId())
                .name(combo.getName())
                .price(combo.getPrice())
                .description(combo.getDescription())
                .build();
    }

    public N8nFoodMenuDTO toFoodMenu(CinemaComplexResponseDTO cinema, List<FoodComboResponseDTO> combos) {
        return N8nFoodMenuDTO.builder()
                .cinemaId(cinema.getComplexId())
                .cinemaName(cinema.getName())
                .province(cinema.getAddressProvince())
                .address(cinema.getFullAddress())
                .items(combos.stream().map(this::toFoodComboSummary).toList())
                .build();
    }

    public N8nShowtimeSummaryDTO toShowtimeSummary(ShowtimeResponseDTO showtime) {
        return N8nShowtimeSummaryDTO.builder()
                .showtimeId(showtime.getShowtimeId())
                .movieId(showtime.getMovieId())
                .movieTitle(showtime.getMovieTitle())
                .cinemaName(showtime.getCinemaComplexName())
                .province(showtime.getProvince())
                .roomName(showtime.getCinemaRoomName())
                .roomType(N8nAgentLabels.roomType(showtime.getRoomType()))
                .showtimeLabel(N8nAgentLabels.formatShowtime(showtime.getStartTime()))
                .price(showtime.getAdjustedPrice() != null ? showtime.getAdjustedPrice() : showtime.getBasePrice())
                .build();
    }

    public N8nCinemaSummaryDTO toCinemaSummary(CinemaComplexResponseDTO complex) {
        return N8nCinemaSummaryDTO.builder()
                .id(complex.getComplexId())
                .name(complex.getName())
                .province(complex.getAddressProvince())
                .address(complex.getFullAddress())
                .build();
    }

    public N8nOrderSummaryDTO toOrderSummary(OrderResponseDTO order) {
        List<String> movies = order.getItems() == null ? List.of() :
                order.getItems().stream()
                        .map(item -> item.getMovieTitle())
                        .filter(Objects::nonNull)
                        .distinct()
                        .collect(Collectors.toList());

        String cinema = order.getItems() != null && !order.getItems().isEmpty()
                ? order.getItems().get(0).getCinemaComplexName()
                : null;

        return N8nOrderSummaryDTO.builder()
                .orderId(order.getOrderId())
                .orderDate(order.getOrderDate())
                .totalAmount(order.getTotalAmount())
                .status(translateOrderStatus(order.getStatus()))
                .paymentMethod(translatePaymentMethod(order.getPaymentMethod()))
                .movies(movies)
                .cinema(cinema)
                .build();
    }

    public N8nVoucherSummaryDTO toVoucherSummary(VoucherResponseDTO voucher) {
        String status = "Đang áp dụng";
        if (voucher.getStartDate() != null
                && java.time.LocalDateTime.now().isBefore(voucher.getStartDate())) {
            status = "Sắp diễn ra";
        }
        return N8nVoucherSummaryDTO.builder()
                .code(voucher.getCode())
                .name(voucher.getName())
                .discountType(translateDiscountType(
                        voucher.getDiscountType() != null ? voucher.getDiscountType().name() : null))
                .discountValue(voucher.getDiscountValue())
                .minOrderAmount(voucher.getMinOrderAmount())
                .status(status)
                .startDate(voucher.getStartDate())
                .endDate(voucher.getEndDate())
                .url(buildPageUrl("/events"))
                .build();
    }

    public List<N8nAppPageDTO> getAppPages() {
        return List.of(
                appPage("schedule", "Lịch chiếu", "/schedule"),
                appPage("booking_history", "Lịch sử đặt vé", "/booking-history"),
                appPage("orders", "Đơn hàng", "/orders"),
                appPage("transaction_history", "Lịch sử giao dịch", "/transaction-history"),
                appPage("library", "Thư viện phim", "/library"),
                appPage("food_drinks", "Đồ ăn nước uống", "/food-drinks"),
                appPage("events", "Sự kiện & khuyến mãi (voucher)", "/events"),
                appPage("my_vouchers", "Voucher đã lưu của tôi", "/profile?tab=vouchers"),
                appPage("cinemas", "Danh sách rạp", "/cinemas"),
                appPage("book_ticket", "Đặt vé", "/book-ticket"),
                appPage("profile", "Tài khoản", "/profile"),
                appPage("wallet", "Ví Cinesmart", "/profile?tab=wallet")
        );
    }

    private N8nAppPageDTO appPage(String key, String label, String path) {
        return N8nAppPageDTO.builder()
                .key(key)
                .label(label)
                .path(path)
                .url(buildPageUrl(path))
                .build();
    }

    public N8nPriceSummaryDTO toPriceSummary(PriceDTO price) {
        return N8nPriceSummaryDTO.builder()
                .seatType(translateSeatType(price.getSeatType() != null ? price.getSeatType().name() : null))
                .roomType(N8nAgentLabels.roomType(price.getRoomType()))
                .price(price.getPrice())
                .build();
    }

    private String translateOrderStatus(String status) {
        if (status == null) {
            return null;
        }
        return switch (status.toUpperCase()) {
            case "PENDING" -> "Chờ thanh toán";
            case "PAID", "COMPLETED" -> "Đã thanh toán";
            case "CANCELLED", "CANCELED" -> "Đã hủy";
            case "REFUNDED" -> "Đã hoàn tiền";
            default -> status;
        };
    }

    private String translatePaymentMethod(String method) {
        if (method == null) {
            return null;
        }
        return switch (method.toUpperCase()) {
            case "WALLET" -> "Ví Cinesmart";
            case "MOMO" -> "MoMo";
            case "VNPAY" -> "VNPay";
            case "CASH" -> "Tiền mặt";
            default -> method;
        };
    }

    private String translateDiscountType(String type) {
        if (type == null) {
            return null;
        }
        return switch (type.toUpperCase()) {
            case "PERCENTAGE" -> "Giảm theo phần trăm";
            case "FIXED" -> "Giảm cố định";
            default -> type;
        };
    }

    private String translateSeatType(String seatType) {
        if (seatType == null) {
            return null;
        }
        return switch (seatType.toUpperCase()) {
            case "STANDARD" -> "Ghế thường";
            case "VIP" -> "Ghế VIP";
            case "COUPLE" -> "Ghế đôi";
            default -> seatType;
        };
    }
}
