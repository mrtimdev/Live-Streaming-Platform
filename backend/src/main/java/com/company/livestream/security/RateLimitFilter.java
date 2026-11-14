package com.company.livestream.security;

import com.company.livestream.common.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private static final int AUTH_LIMIT_PER_MIN = 30;
    private static final int HEARTBEAT_LIMIT_PER_MIN = 120;

    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public RateLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        int limit = 0;
        String bucket = null;

        if (path.startsWith("/api/auth/")) {
            limit = AUTH_LIMIT_PER_MIN;
            bucket = "auth";
        } else if (path.contains("/heartbeat")) {
            limit = HEARTBEAT_LIMIT_PER_MIN;
            bucket = "heartbeat";
        }

        if (limit > 0) {
            String clientIp = resolveClientIp(request);
            String key = bucket + ":" + clientIp;
            long now = System.currentTimeMillis();

            WindowCounter counter = counters.compute(key, (k, existing) -> {
                if (existing == null || now - existing.windowStart >= WINDOW_MS) {
                    return new WindowCounter(now);
                }
                return existing;
            });

            if (counter.count.incrementAndGet() > limit) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(response.getOutputStream(),
                        ApiResponse.error("Rate limit exceeded. Please try again shortly."));
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static final class WindowCounter {
        final long windowStart;
        final AtomicInteger count = new AtomicInteger(0);

        WindowCounter(long windowStart) {
            this.windowStart = windowStart;
        }
    }
}
