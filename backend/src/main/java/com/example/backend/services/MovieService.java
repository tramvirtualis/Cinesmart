package com.example.backend.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.backend.dtos.CreateMovieDTO;
import com.example.backend.dtos.MovieResponseDTO;
import com.example.backend.dtos.UpdateMovieDTO;
import com.example.backend.entities.Movie;
import com.example.backend.entities.MovieVersion;
import com.example.backend.entities.enums.Language;
import com.example.backend.entities.enums.MovieStatus;
import com.example.backend.entities.enums.RoomType;
import com.example.backend.repositories.MovieRepository;
import com.example.backend.repositories.MovieVersionRepository;
import com.example.backend.repositories.ShowtimeRepository;
import com.example.backend.repositories.TicketRepository;
import com.example.backend.entities.Showtime;

import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;
import com.example.backend.entities.enums.Action;
import com.example.backend.entities.enums.ObjectType;
import com.example.backend.utils.SecurityUtils;

@Service
@RequiredArgsConstructor
public class MovieService {
    
    private final MovieRepository movieRepository;
    private final MovieVersionRepository movieVersionRepository;
    private final ShowtimeRepository showtimeRepository;
    private final TicketRepository ticketRepository;
    private final ActivityLogService activityLogService;
    
    
    @Transactional
    public MovieResponseDTO createMovie(CreateMovieDTO createMovieDTO, String username) {
        // Tính status tự động từ showtime sớm nhất (mặc định là COMING_SOON nếu chưa có showtime)
        MovieStatus calculatedStatus = calculateMovieStatus(null);
        
        Movie movie = Movie.builder()
                .title(createMovieDTO.getTitle())
                .genre(createMovieDTO.getGenre())
                .duration(createMovieDTO.getDuration())
                .releaseDate(createMovieDTO.getReleaseDate())
                .ageRating(createMovieDTO.getAgeRating())
                .actor(createMovieDTO.getActor())
                .director(createMovieDTO.getDirector())
                .description(createMovieDTO.getDescription())
                .trailerURL(createMovieDTO.getTrailerURL())
                .poster(createMovieDTO.getPoster())
                .status(calculatedStatus)
                .build();
        
        Movie savedMovie = movieRepository.save(movie);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.CREATE,
                    ObjectType.MOVIE,
                    savedMovie.getMovieId(),
                    savedMovie.getTitle(),
                    "Thêm phim mới: " + savedMovie.getTitle()
                );
            } catch (Exception e) {
                // Log error but don't fail the operation
                System.err.println("ERROR: Failed to log activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        if (createMovieDTO.getFormats() != null && createMovieDTO.getLanguages() != null) {
            List<MovieVersion> versions = new ArrayList<>();
            for (RoomType format : createMovieDTO.getFormats()) {
                for (Language language : createMovieDTO.getLanguages()) {
                    MovieVersion version = MovieVersion.builder()
                            .movie(savedMovie)
                            .roomType(format)
                            .language(language)
                            .build();
                    versions.add(version);
                }
            }
            movieVersionRepository.saveAll(versions);
        }
        
        return convertToDTO(savedMovie);
    }
    
    @Transactional
    public MovieResponseDTO updateMovie(Long movieId, UpdateMovieDTO updateMovieDTO, String username) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + movieId));
        
        // Kiểm tra ràng buộc: không cho phép sửa một số trường quan trọng nếu có vé đã thanh toán
        if (ticketRepository.existsPaidTicketsByMovieId(movieId)) {
            // Chỉ cho phép sửa các trường không ảnh hưởng đến vé đã đặt
            // Các trường như description, trailerURL, poster, actor, director có thể sửa được
            // Nhưng title, duration, releaseDate, ageRating, genre có thể ảnh hưởng đến vé đã đặt
            if (updateMovieDTO.getTitle() != null && !updateMovieDTO.getTitle().equals(movie.getTitle())) {
                throw new RuntimeException("Không thể thay đổi tên phim vì đã có vé đã được đặt.");
            }
            if (updateMovieDTO.getDuration() != null && !updateMovieDTO.getDuration().equals(movie.getDuration())) {
                throw new RuntimeException("Không thể thay đổi thời lượng phim vì đã có vé đã được đặt.");
            }
            if (updateMovieDTO.getReleaseDate() != null && !updateMovieDTO.getReleaseDate().equals(movie.getReleaseDate())) {
                throw new RuntimeException("Không thể thay đổi ngày phát hành vì đã có vé đã được đặt.");
            }
            if (updateMovieDTO.getAgeRating() != null && !updateMovieDTO.getAgeRating().equals(movie.getAgeRating())) {
                throw new RuntimeException("Không thể thay đổi độ tuổi phim vì đã có vé đã được đặt.");
            }
            if (updateMovieDTO.getGenre() != null && !updateMovieDTO.getGenre().equals(movie.getGenre())) {
                throw new RuntimeException("Không thể thay đổi thể loại phim vì đã có vé đã được đặt.");
            }
        }
        
        if (updateMovieDTO.getTitle() != null) {
            movie.setTitle(updateMovieDTO.getTitle());
        }
        if (updateMovieDTO.getGenre() != null) {
            movie.setGenre(updateMovieDTO.getGenre());
        }
        if (updateMovieDTO.getDuration() != null) {
            movie.setDuration(updateMovieDTO.getDuration());
        }
        if (updateMovieDTO.getReleaseDate() != null) {
            movie.setReleaseDate(updateMovieDTO.getReleaseDate());
        }
        if (updateMovieDTO.getAgeRating() != null) {
            movie.setAgeRating(updateMovieDTO.getAgeRating());
        }
        if (updateMovieDTO.getActor() != null) {
            movie.setActor(updateMovieDTO.getActor());
        }
        if (updateMovieDTO.getDirector() != null) {
            movie.setDirector(updateMovieDTO.getDirector());
        }
        if (updateMovieDTO.getDescription() != null) {
            movie.setDescription(updateMovieDTO.getDescription());
        }
        if (updateMovieDTO.getTrailerURL() != null) {
            movie.setTrailerURL(updateMovieDTO.getTrailerURL());
        }
        if (updateMovieDTO.getPoster() != null) {
            movie.setPoster(updateMovieDTO.getPoster());
        }
        // Cho phép admin cập nhật status thủ công (đặc biệt là ENDED)
        if (updateMovieDTO.getStatus() != null) {
            // Kiểm tra ràng buộc khi đánh dấu phim đã kết thúc
            if (updateMovieDTO.getStatus() == MovieStatus.ENDED) {
                // Lấy tất cả showtimes của phim
                List<Showtime> allShowtimes = showtimeRepository.findAllByMovieId(movieId);
                LocalDateTime now = LocalDateTime.now();
                
                // Kiểm tra xem còn có suất chiếu trong tương lai không
                boolean hasFutureShowtime = allShowtimes.stream()
                        .anyMatch(st -> st.getStartTime().isAfter(now));
                
                if (hasFutureShowtime) {
                    throw new RuntimeException("Không thể đánh dấu phim đã kết thúc vì còn có suất chiếu trong tương lai. Vui lòng xóa hoặc cập nhật các suất chiếu trước.");
                }
                
                // Kiểm tra xem còn có vé đã thanh toán cho các suất chiếu trong tương lai không
                // (Chỉ kiểm tra các showtime trong tương lai)
                boolean hasPaidTicketsForFuture = allShowtimes.stream()
                        .filter(st -> st.getStartTime().isAfter(now))
                        .anyMatch(st -> ticketRepository.existsPaidTicketsByShowtimeId(st.getShowtimeId()));
                
                if (hasPaidTicketsForFuture) {
                    throw new RuntimeException("Không thể đánh dấu phim đã kết thúc vì còn có vé đã được đặt cho các suất chiếu trong tương lai. Vui lòng đợi các suất chiếu hoàn tất trước.");
                }
            }
            movie.setStatus(updateMovieDTO.getStatus());
        } else {
            // Nếu không có status trong DTO (bỏ đánh dấu ENDED), tính lại status từ showtime
            // Bỏ qua logic giữ nguyên ENDED để cho phép bỏ đánh dấu
            MovieStatus calculatedStatus = calculateMovieStatusWithoutPreservingEnded(movie);
            movie.setStatus(calculatedStatus);
        }
        
        Movie updatedMovie = movieRepository.save(movie);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.UPDATE,
                    ObjectType.MOVIE,
                    updatedMovie.getMovieId(),
                    updatedMovie.getTitle(),
                    "Cập nhật thông tin phim: " + updatedMovie.getTitle()
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        if (updateMovieDTO.getFormats() != null && updateMovieDTO.getLanguages() != null) {
            // Lấy các MovieVersion hiện có
            List<MovieVersion> existingVersions = movieVersionRepository.findByMovie(updatedMovie);
            
            // Tạo danh sách các combination mới cần có
            List<MovieVersion> versionsToKeep = new ArrayList<>();
            List<MovieVersion> versionsToCreate = new ArrayList<>();
            
            for (RoomType format : updateMovieDTO.getFormats()) {
                for (Language language : updateMovieDTO.getLanguages()) {
                    // Tìm version đã tồn tại với cùng format và language
                    Optional<MovieVersion> existingVersion = existingVersions.stream()
                            .filter(v -> v.getRoomType() == format && v.getLanguage() == language)
                            .findFirst();
                    
                    if (existingVersion.isPresent()) {
                        // Giữ lại version đã có (giữ nguyên ID)
                        versionsToKeep.add(existingVersion.get());
                    } else {
                        // Tạo version mới nếu chưa có
                        MovieVersion newVersion = MovieVersion.builder()
                                .movie(updatedMovie)
                                .roomType(format)
                                .language(language)
                                .build();
                        versionsToCreate.add(newVersion);
                    }
                }
            }
            
            // Xóa các versions không còn trong danh sách mới
            List<MovieVersion> versionsToDelete = existingVersions.stream()
                    .filter(v -> !versionsToKeep.contains(v))
                    .collect(Collectors.toList());
            movieVersionRepository.deleteAll(versionsToDelete);
            
            // Tạo các versions mới
            if (!versionsToCreate.isEmpty()) {
                movieVersionRepository.saveAll(versionsToCreate);
            }
        }
        
        return convertToDTO(updatedMovie);
    }
    
    @Transactional
    public void deleteMovie(Long movieId, String username) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + movieId));
        
        // Kiểm tra ràng buộc: không cho phép xóa nếu có vé đã thanh toán
        if (ticketRepository.existsPaidTicketsByMovieId(movieId)) {
            throw new RuntimeException("Không thể xóa phim vì đã có vé đã được đặt.");
        }
        
        String movieName = movie.getTitle();
        
        List<MovieVersion> versions = movieVersionRepository.findByMovie(movie);
        if (!versions.isEmpty()) {
            movieVersionRepository.deleteAll(versions);
        }
        
        movieRepository.delete(movie);
        
        // Log activity - username được truyền từ controller
        if (username != null && !username.isEmpty()) {
            try {
                activityLogService.logActivity(
                    username,
                    Action.DELETE,
                    ObjectType.MOVIE,
                    movieId,
                    movieName,
                    "Xóa phim: " + movieName
                );
            } catch (Exception e) {
                System.err.println("ERROR: Failed to log activity: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }
    
    public MovieResponseDTO getMovieById(Long movieId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phim với ID: " + movieId));
        
        return convertToDTO(movie);
    }
    
    public List<MovieResponseDTO> getAllMovies() {
        return movieRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    
    public List<MovieResponseDTO> getNowShowingMovies() {
        List<Movie> movies = movieRepository.findNowShowingMovies();
        return movies.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<MovieResponseDTO> getComingSoonMovies() {
        List<Movie> movies = movieRepository.findComingSoonMovies();
        return movies.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<MovieResponseDTO> getMoviesByStatus(MovieStatus status) {
        List<Movie> movies = movieRepository.findByStatus(status);
        return movies.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    
    /**
     * Tính status của phim dựa trên showtime sớm nhất
     * - COMING_SOON: Nếu chưa có showtime hoặc showtime sớm nhất trong tương lai
     * - NOW_SHOWING: Nếu có showtime đã bắt đầu hoặc đang diễn ra
     * - ENDED: CHỈ được set thủ công bởi admin, KHÔNG tự động tính
     */
    private MovieStatus calculateMovieStatus(Movie movie) {
        if (movie == null || movie.getMovieId() == null) {
            // Phim mới chưa có ID, mặc định là COMING_SOON
            return MovieStatus.COMING_SOON;
        }
        
        // Nếu status hiện tại là ENDED, giữ nguyên (chỉ admin mới có thể set ENDED)
        if (movie.getStatus() == MovieStatus.ENDED) {
            return MovieStatus.ENDED;
        }
        
        // Lấy tất cả showtimes của phim
        List<Showtime> showtimes = showtimeRepository.findAllByMovieId(movie.getMovieId());
        
        if (showtimes.isEmpty()) {
            // Chưa có showtime, mặc định là COMING_SOON
            return MovieStatus.COMING_SOON;
        }
        
        LocalDateTime now = LocalDateTime.now();
        
        // Tìm showtime sớm nhất và muộn nhất
        Optional<Showtime> earliestShowtime = showtimes.stream()
                .min((s1, s2) -> s1.getStartTime().compareTo(s2.getStartTime()));
        Optional<Showtime> latestShowtime = showtimes.stream()
                .max((s1, s2) -> s1.getEndTime().compareTo(s2.getEndTime()));
        
        if (earliestShowtime.isPresent() && latestShowtime.isPresent()) {
            LocalDateTime earliestStart = earliestShowtime.get().getStartTime();
            LocalDateTime latestEnd = latestShowtime.get().getEndTime();
            
            if (now.isBefore(earliestStart)) {
                // Tất cả showtime đều trong tương lai
                return MovieStatus.COMING_SOON;
            } else {
                // Có showtime đã bắt đầu hoặc đang diễn ra -> NOW_SHOWING
                // KHÔNG tự động set ENDED ngay cả khi tất cả showtime đã kết thúc
                return MovieStatus.NOW_SHOWING;
            }
        }
        
        // Fallback
        return MovieStatus.COMING_SOON;
    }
    
    /**
     * Tính status của phim dựa trên showtime mà KHÔNG giữ nguyên ENDED
     * Dùng khi admin bỏ đánh dấu ENDED để tính lại status từ showtime
     */
    private MovieStatus calculateMovieStatusWithoutPreservingEnded(Movie movie) {
        if (movie == null || movie.getMovieId() == null) {
            return MovieStatus.COMING_SOON;
        }
        
        // Lấy tất cả showtimes của phim
        List<Showtime> showtimes = showtimeRepository.findAllByMovieId(movie.getMovieId());
        
        if (showtimes.isEmpty()) {
            return MovieStatus.COMING_SOON;
        }
        
        LocalDateTime now = LocalDateTime.now();
        
        // Tìm showtime sớm nhất và muộn nhất
        Optional<Showtime> earliestShowtime = showtimes.stream()
                .min((s1, s2) -> s1.getStartTime().compareTo(s2.getStartTime()));
        Optional<Showtime> latestShowtime = showtimes.stream()
                .max((s1, s2) -> s1.getEndTime().compareTo(s2.getEndTime()));
        
        if (earliestShowtime.isPresent() && latestShowtime.isPresent()) {
            LocalDateTime earliestStart = earliestShowtime.get().getStartTime();
            LocalDateTime latestEnd = latestShowtime.get().getEndTime();
            
            if (now.isBefore(earliestStart)) {
                // Tất cả showtime đều trong tương lai
                return MovieStatus.COMING_SOON;
            } else if (now.isAfter(latestEnd)) {
                // Tất cả showtime đã kết thúc
                // Nhưng không tự động set ENDED, để admin quyết định
                return MovieStatus.NOW_SHOWING;
            } else {
                // Có showtime đang diễn ra hoặc sắp diễn ra
                return MovieStatus.NOW_SHOWING;
            }
        }
        
        return MovieStatus.COMING_SOON;
    }
    
    private MovieResponseDTO convertToDTO(Movie movie) {
        List<MovieVersion> versions = movieVersionRepository.findByMovie(movie);
        
        List<RoomType> formats = versions.stream()
                .map(MovieVersion::getRoomType)
                .distinct()
                .collect(Collectors.toList());
        
        List<Language> languages = versions.stream()
                .map(MovieVersion::getLanguage)
                .distinct()
                .collect(Collectors.toList());
        
        // Tính lại status từ showtime sớm nhất, nhưng giữ nguyên ENDED nếu đã được set thủ công
        MovieStatus calculatedStatus = calculateMovieStatus(movie);
        
        return MovieResponseDTO.builder()
                .movieId(movie.getMovieId())
                .title(movie.getTitle())
                .genre(movie.getGenre())
                .duration(movie.getDuration())
                .releaseDate(movie.getReleaseDate())
                .ageRating(movie.getAgeRating())
                .actor(movie.getActor())
                .director(movie.getDirector())
                .description(movie.getDescription())
                .trailerURL(movie.getTrailerURL())
                .poster(movie.getPoster())
                .status(calculatedStatus)
                .formats(formats)
                .languages(languages)
                .build();
    }
}