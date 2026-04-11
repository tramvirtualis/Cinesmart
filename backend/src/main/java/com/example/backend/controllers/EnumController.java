package com.example.backend.controllers;

import com.example.backend.entities.enums.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/enums")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"}, 
             allowedHeaders = "*", 
             allowCredentials = "true")
public class EnumController {

    @GetMapping
    public ResponseEntity<Map<String, List<String>>> getAllEnums() {
        Map<String, List<String>> enums = new HashMap<>();
        
        enums.put("genres", Arrays.stream(Genre.values())
                .map(Enum::name)
                .collect(Collectors.toList()));
        
        enums.put("movieStatuses", Arrays.stream(MovieStatus.values())
                .map(Enum::name)
                .collect(Collectors.toList()));
        
        enums.put("ageRatings", Arrays.stream(AgeRating.values())
                .map(Enum::name)
                .collect(Collectors.toList()));
        
        enums.put("roomTypes", Arrays.stream(RoomType.values())
                .map(Enum::name)
                .collect(Collectors.toList()));
        
        enums.put("seatTypes", Arrays.stream(SeatType.values())
                .map(Enum::name)
                .collect(Collectors.toList()));
        
        enums.put("languages", Arrays.stream(Language.values())
                .map(Enum::name)
                .collect(Collectors.toList()));
        
        enums.put("discountTypes", Arrays.stream(DiscountType.values())
                .map(Enum::name)
                .collect(Collectors.toList()));
        
        enums.put("voucherScopes", Arrays.stream(VoucherScope.values())
                .map(Enum::name)
                .collect(Collectors.toList()));
        
        enums.put("paymentMethods", Arrays.stream(PaymentMethod.values())
                .map(Enum::name)
                .collect(Collectors.toList()));
        
        return ResponseEntity.ok(enums);
    }
}

