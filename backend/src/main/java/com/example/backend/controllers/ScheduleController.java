package com.example.backend.controllers;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dtos.ScheduleListingDTO;
import com.example.backend.dtos.ScheduleOptionsResponseDTO;
import com.example.backend.services.ScheduleService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/schedule")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"},
             allowedHeaders = "*",
             allowCredentials = "true")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping("/options")
    public ResponseEntity<ScheduleOptionsResponseDTO> getOptions(
        @RequestParam(value = "date", required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(value = "movieId", required = false) Long movieId,
        @RequestParam(value = "cinemaId", required = false) Long cinemaId) {

        return ResponseEntity.ok(scheduleService.getScheduleOptions(date, movieId, cinemaId));
    }

    @GetMapping("/listings")
    public ResponseEntity<List<ScheduleListingDTO>> getListings(
        @RequestParam(value = "date", required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(value = "movieId", required = false) Long movieId,
        @RequestParam(value = "cinemaId", required = false) Long cinemaId) {

        return ResponseEntity.ok(scheduleService.getScheduleListings(date, movieId, cinemaId));
    }
}


