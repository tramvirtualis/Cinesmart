package com.example.backend.controllers;



import com.example.backend.dtos.N8nEventPushRequestDTO;

import com.example.backend.dtos.N8nNotificationRequestDTO;

import com.example.backend.dtos.N8nWebhookRequestDTO;

import com.example.backend.dtos.n8n.N8nAppPageDTO;
import com.example.backend.dtos.n8n.N8nCinemaSummaryDTO;

import com.example.backend.dtos.n8n.N8nPriceSummaryDTO;

import com.example.backend.dtos.n8n.N8nVoucherSummaryDTO;

import com.example.backend.services.N8nService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;



import java.util.List;

import java.util.Map;



@RestController

@RequestMapping("/api/n8n")

@RequiredArgsConstructor

@CrossOrigin

public class N8nController {



    private final N8nService n8nService;



    @GetMapping("/movies")

    public ResponseEntity<?> getMovies(@RequestParam(required = false) String status) {

        try {

            return ResponseEntity.ok(n8nService.getMoviesForAgent(status));

        } catch (Exception e) {
            return badRequest(e.getMessage());
        }

    }



    @GetMapping("/movies-with-showtimes")

    public ResponseEntity<?> getMoviesWithShowtimes(

            @RequestParam(required = false) String date,

            @RequestParam(required = false) String province) {

        try {

            return ResponseEntity.ok(n8nService.getMoviesWithShowtimesForAgent(date, province));

        } catch (Exception e) {
            return badRequest(e.getMessage());
        }

    }



    @GetMapping("/movies/detail")
    public ResponseEntity<?> getMovieDetail(@RequestParam(required = false) String movieId, @RequestParam(required = false) String movieTitle) {
        try {
            Long parsedMovieId = null;
            if (movieId != null && !movieId.isBlank()) {
                String cleanMovieId = movieId.trim();
                if (cleanMovieId.startsWith("=")) {
                    cleanMovieId = cleanMovieId.substring(1).trim();
                }
                try {
                    parsedMovieId = Long.parseLong(cleanMovieId);
                } catch (NumberFormatException e) {
                    // Nếu n8n gửi sai (vd gửi [object Object] hoặc chữ), ta coi như null và dựa vào movieTitle
                    parsedMovieId = null;
                }
            }
            return ResponseEntity.ok(n8nService.getMovieDetailForAgent(parsedMovieId, movieTitle));
        } catch (Exception e) {

            return notFound(e.getMessage());

        }

    }



    @GetMapping("/movies/{movieId}")

    public ResponseEntity<?> getMovieById(@PathVariable String movieId) {

        try {
            Long parsedMovieId = Long.parseLong(movieId);
            return ResponseEntity.ok(n8nService.getMovieDetailForAgent(parsedMovieId, null));
        } catch (NumberFormatException e) {
            return notFound("movieId phải là số hợp lệ, nhận được: " + movieId);
        } catch (Exception e) {

            return notFound(e.getMessage());

        }

    }



    @GetMapping("/showtimes")
    public ResponseEntity<?> getShowtimes(
            @RequestParam(required = false) String movieId,
            @RequestParam(required = false) String movieTitle,
            @RequestParam String date,
            @RequestParam(required = false) String province) {
        try {
            Long parsedMovieId = null;
            if (movieId != null && !movieId.isBlank()) {
                String cleanMovieId = movieId.trim();
                if (cleanMovieId.startsWith("=")) {
                    cleanMovieId = cleanMovieId.substring(1).trim();
                }
                try {
                    parsedMovieId = Long.parseLong(cleanMovieId);
                } catch (NumberFormatException e) {
                    parsedMovieId = null;
                }
            }
            return ResponseEntity.ok(n8nService.getShowtimesForAgent(parsedMovieId, movieTitle, province, date));
        } catch (Exception e) {
            return badRequest(e.getMessage());
        }
    }



    @GetMapping("/cinema-complexes")

    public ResponseEntity<List<N8nCinemaSummaryDTO>> getCinemaComplexes() {

        return ResponseEntity.ok(n8nService.getCinemasForAgent());

    }



    @GetMapping("/users/{userId}/orders")

    public ResponseEntity<?> getUserOrders(@PathVariable Long userId) {

        try {

            return ResponseEntity.ok(n8nService.getUserOrdersForAgent(userId));

        } catch (IllegalArgumentException e) {

            return badRequest(e.getMessage());

        }

    }



    @GetMapping("/vouchers")

    public ResponseEntity<List<N8nVoucherSummaryDTO>> getVouchers() {

        return ResponseEntity.ok(n8nService.getVouchersForAgent());

    }



    @GetMapping("/app-pages")

    public ResponseEntity<List<N8nAppPageDTO>> getAppPages() {

        return ResponseEntity.ok(n8nService.getAppPagesForAgent());

    }



    @GetMapping("/prices")

    public ResponseEntity<List<N8nPriceSummaryDTO>> getPrices() {

        return ResponseEntity.ok(n8nService.getPricesForAgent());

    }



    @GetMapping("/food-combos")
    public ResponseEntity<?> getFoodCombos(
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) String cinemaName,
            @RequestParam(required = false) String province) {
        try {
            return ResponseEntity.ok(n8nService.getFoodCombosForAgent(cinemaId, cinemaName, province));
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage());
        }
    }



    @GetMapping("/health")

    public ResponseEntity<Map<String, Object>> health() {

        return ResponseEntity.ok(Map.of(

                "status", "ok",

                "integration", "n8n",

                "timestamp", n8nService.health().get("timestamp")

        ));

    }



    @PostMapping("/webhook")

    public ResponseEntity<?> receiveWebhook(@RequestBody N8nWebhookRequestDTO request) {

        try {

            return ResponseEntity.ok(n8nService.handleWebhook(request));

        } catch (IllegalArgumentException | IllegalStateException e) {

            return badRequest(e.getMessage());

        }

    }



    @PostMapping("/notifications")

    public ResponseEntity<?> sendNotification(@RequestBody N8nNotificationRequestDTO request) {

        try {

            n8nService.sendNotification(request);

            return ResponseEntity.ok(Map.of("success", true));

        } catch (IllegalArgumentException e) {

            return badRequest(e.getMessage());

        }

    }



    @PostMapping("/events/push")

    public ResponseEntity<?> pushEvent(@RequestBody N8nEventPushRequestDTO request) {

        try {

            return ResponseEntity.ok(n8nService.pushEvent(request));

        } catch (IllegalArgumentException | IllegalStateException e) {

            return badRequest(e.getMessage());

        }

    }



    private ResponseEntity<Map<String, String>> badRequest(String message) {

        return ResponseEntity.badRequest().body(Map.of("error", message));

    }



    private ResponseEntity<Map<String, String>> notFound(String message) {

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", message));

    }

}


