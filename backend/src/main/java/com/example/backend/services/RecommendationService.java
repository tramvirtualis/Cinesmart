package com.example.backend.services;

import com.example.backend.dtos.CinemaComplexResponseDTO;
import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.entities.Movie;
import com.example.backend.entities.Order;
import com.example.backend.entities.Ticket;
import com.example.backend.entities.enums.Genre;
import com.example.backend.repositories.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final CinemaComplexService cinemaComplexService;
    private final MovieService movieService;
    private final OrderRepository orderRepository;

    // Radius of the Earth in kilometers
    private static final double EARTH_RADIUS = 6371.0;

    /**
     * Recommend cinemas based on user location (latitude, longitude)
     */
    public List<CinemaComplexResponseDTO> recommendNearbyCinemas(Double userLat, Double userLng) {
        List<CinemaComplexResponseDTO> allComplexes = cinemaComplexService.getAllCinemaComplexes();

        if (userLat == null || userLng == null) {
            return allComplexes;
        }

        // Sort by distance
        allComplexes.sort(Comparator.comparingDouble(c -> {
            if (c.getLatitude() == null || c.getLongitude() == null) {
                return Double.MAX_VALUE; // Put cinemas without location at the end
            }
            return calculateDistance(userLat, userLng, c.getLatitude(), c.getLongitude());
        }));

        return allComplexes;
    }

    /**
     * Recommend movies based on user's booking history (genres, directors)
     */
    public List<MovieResponseDTO> recommendMovies(Long userId) {
        // Only consider currently showing and coming soon movies
        List<MovieResponseDTO> allMovies = new ArrayList<>();
        allMovies.addAll(movieService.getNowShowingMovies());
        allMovies.addAll(movieService.getComingSoonMovies());

        // Remove duplicates if any
        allMovies = new ArrayList<>(new LinkedHashSet<>(allMovies));

        if (userId == null) {
            return allMovies;
        }

        // Fetch user history
        List<Order> userOrders = orderRepository.findByUserUserIdWithDetails(userId);
        
        if (userOrders == null || userOrders.isEmpty()) {
            return allMovies;
        }

        // Aggregate user preferences
        Map<Genre, Integer> genreFrequency = new HashMap<>();
        Map<String, Integer> directorFrequency = new HashMap<>();

        for (Order order : userOrders) {
            if (order.getTickets() != null) {
                for (Ticket ticket : order.getTickets()) {
                    if (ticket.getShowtime() != null && ticket.getShowtime().getMovieVersion() != null && ticket.getShowtime().getMovieVersion().getMovie() != null) {
                        Movie movie = ticket.getShowtime().getMovieVersion().getMovie();
                        
                        // Count genres
                        if (movie.getGenre() != null) {
                            for (Genre g : movie.getGenre()) {
                                genreFrequency.put(g, genreFrequency.getOrDefault(g, 0) + 1);
                            }
                        }

                        // Count directors
                        if (movie.getDirector() != null && !movie.getDirector().trim().isEmpty()) {
                            String director = movie.getDirector().trim();
                            directorFrequency.put(director, directorFrequency.getOrDefault(director, 0) + 1);
                        }
                    }
                }
            }
        }

        // If no history found from tickets, return default
        if (genreFrequency.isEmpty() && directorFrequency.isEmpty()) {
            return allMovies;
        }

        // Score each movie based on user preferences
        Map<Long, Double> movieScores = new HashMap<>();
        for (MovieResponseDTO m : allMovies) {
            double score = 0;
            
            // Score genres (weight: 1.0 per match)
            if (m.getGenre() != null) {
                for (Genre g : m.getGenre()) {
                    if (genreFrequency.containsKey(g)) {
                        score += genreFrequency.get(g) * 1.0;
                    }
                }
            }

            // Score directors (weight: 2.0 per match, because director is a stronger personal preference)
            if (m.getDirector() != null && !m.getDirector().trim().isEmpty()) {
                String d = m.getDirector().trim();
                if (directorFrequency.containsKey(d)) {
                    score += directorFrequency.get(d) * 2.0;
                }
            }

            movieScores.put(m.getMovieId(), score);
        }

        // Sort movies: higher score first. If score is equal, preserve original order
        allMovies.sort((m1, m2) -> {
            Double score1 = movieScores.getOrDefault(m1.getMovieId(), 0.0);
            Double score2 = movieScores.getOrDefault(m2.getMovieId(), 0.0);
            return score2.compareTo(score1);
        });

        return allMovies;
    }

    /**
     * Calculate Distance using Haversine formula
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        lat1 = Math.toRadians(lat1);
        lat2 = Math.toRadians(lat2);

        double a = Math.pow(Math.sin(dLat / 2), 2) + Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
        double c = 2 * Math.asin(Math.sqrt(a));

        return EARTH_RADIUS * c;
    }
}
