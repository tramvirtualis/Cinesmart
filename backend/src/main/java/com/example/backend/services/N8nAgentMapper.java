package com.example.backend.services;

import com.example.backend.dtos.CinemaComplexResponseDTO;
import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.dtos.OrderResponseDTO;
import com.example.backend.dtos.PriceDTO;
import com.example.backend.dtos.ShowtimeResponseDTO;
import com.example.backend.dtos.VoucherResponseDTO;
import com.example.backend.dtos.n8n.N8nAppPageDTO;
import com.example.backend.dtos.n8n.N8nCinemaSummaryDTO;
import com.example.backend.dtos.n8n.N8nMovieDetailDTO;
import com.example.backend.dtos.n8n.N8nMovieSummaryDTO;
import com.example.backend.dtos.n8n.N8nOrderSummaryDTO;
import com.example.backend.dtos.n8n.N8nPriceSummaryDTO;
import com.example.backend.dtos.n8n.N8nShowtimeSummaryDTO;
import com.example.backend.dtos.n8n.N8nVoucherSummaryDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class N8nAgentMapper {

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public N8nMovieSummaryDTO toMovieSummary(MovieResponseDTO movie) {
        return N8nMovieSummaryDTO.builder()
                .id(movie.getMovieId())
                .title(movie.getTitle())
                .genres(toGenreNames(movie))
                .duration(movie.getDuration())
                .releaseDate(movie.getReleaseDate())
                .status(movie.getStatus() != null ? movie.getStatus().name() : null)
                .url(buildMovieUrl(movie.getMovieId()))
                .build();
    }

    public N8nMovieDetailDTO toMovieDetail(MovieResponseDTO movie) {
        return N8nMovieDetailDTO.builder()
                .id(movie.getMovieId())
                .title(movie.getTitle())
                .genres(toGenreNames(movie))
                .duration(movie.getDuration())
                .releaseDate(movie.getReleaseDate())
                .status(movie.getStatus() != null ? movie.getStatus().name() : null)
                .ageRating(movie.getAgeRating() != null ? movie.getAgeRating().name() : null)
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

    public N8nShowtimeSummaryDTO toShowtimeSummary(ShowtimeResponseDTO showtime) {
        return N8nShowtimeSummaryDTO.builder()
                .showtimeId(showtime.getShowtimeId())
                .movieId(showtime.getMovieId())
                .movieTitle(showtime.getMovieTitle())
                .cinemaName(showtime.getCinemaComplexName())
                .province(showtime.getProvince())
                .roomName(showtime.getCinemaRoomName())
                .roomType(showtime.getRoomType() != null ? showtime.getRoomType().name() : null)
                .startTime(showtime.getStartTime())
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
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .movies(movies)
                .cinema(cinema)
                .build();
    }

    public N8nVoucherSummaryDTO toVoucherSummary(VoucherResponseDTO voucher) {
        String status = "ACTIVE";
        if (voucher.getStartDate() != null
                && java.time.LocalDateTime.now().isBefore(voucher.getStartDate())) {
            status = "UPCOMING";
        }
        return N8nVoucherSummaryDTO.builder()
                .code(voucher.getCode())
                .name(voucher.getName())
                .discountType(voucher.getDiscountType() != null ? voucher.getDiscountType().name() : null)
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
                .seatType(price.getSeatType() != null ? price.getSeatType().name() : null)
                .roomType(price.getRoomType() != null ? price.getRoomType().name() : null)
                .price(price.getPrice())
                .build();
    }

    private List<String> toGenreNames(MovieResponseDTO movie) {
        if (movie.getGenre() == null) {
            return Collections.emptyList();
        }
        return movie.getGenre().stream()
                .map(Enum::name)
                .collect(Collectors.toList());
    }
}
