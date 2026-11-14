package com.company.livestream.stream;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class StreamKeyService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private final PasswordEncoder passwordEncoder;

    public StreamKeyService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    public String generateStreamId() {
        byte[] bytes = new byte[5];
        SECURE_RANDOM.nextBytes(bytes);
        return "stream-" + HexFormat.of().formatHex(bytes);
    }

    public String generateRawStreamKey() {
        byte[] bytes = new byte[24];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hashStreamKey(String rawKey) {
        return passwordEncoder.encode(rawKey);
    }

    public boolean verifyStreamKey(String rawKey, String hashedKey) {
        if (rawKey == null || rawKey.isBlank() || hashedKey == null || hashedKey.isBlank()) {
            return false;
        }
        return passwordEncoder.matches(rawKey, hashedKey);
    }
}
