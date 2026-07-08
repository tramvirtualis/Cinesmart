package com.example.backend.services;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class PaymentReturnUrlStore {

    private final ConcurrentMap<String, String> returnUrls = new ConcurrentHashMap<>();

    public void save(String txnRef, String frontendUrl) {
        if (txnRef == null || txnRef.isBlank() || frontendUrl == null || frontendUrl.isBlank()) {
            return;
        }
        returnUrls.put(txnRef, frontendUrl);
    }

    public String resolve(String txnRef, String fallbackUrl) {
        if (txnRef == null || txnRef.isBlank()) {
            return fallbackUrl;
        }
        return returnUrls.getOrDefault(txnRef, fallbackUrl);
    }

    public void remove(String txnRef) {
        if (txnRef != null) {
            returnUrls.remove(txnRef);
        }
    }
}
