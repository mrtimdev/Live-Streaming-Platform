package com.company.livestream.auth;

import com.company.livestream.common.AuditLogService;
import com.company.livestream.common.Constants;
import com.company.livestream.exception.UnauthorizedException;
import com.company.livestream.security.JwtTokenProvider;
import com.company.livestream.user.User;
import com.company.livestream.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;
    private final AuditLogService auditLogService;

    public AuthService(AuthenticationManager authenticationManager,
                       JwtTokenProvider jwtTokenProvider,
                       UserRepository userRepository,
                       StringRedisTemplate redisTemplate,
                       AuditLogService auditLogService) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.redisTemplate = redisTemplate;
        this.auditLogService = auditLogService;
    }

    public LoginResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username().trim(), request.password())
            );
        } catch (AuthenticationException ex) {
            throw new UnauthorizedException("Invalid username or password");
        }

        User user = userRepository.findByUsername(request.username().trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid username or password"));

        if (!Constants.USER_STATUS_ACTIVE.equalsIgnoreCase(user.getStatus())) {
            throw new UnauthorizedException("Account is disabled");
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user.getUsername(), user.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());
        storeRefreshToken(refreshToken, user.getUsername());

        auditLogService.logAdminAction(user.getUsername(), "LOGIN", "AUTH", "role=" + user.getRole());

        return new LoginResponse(
                accessToken,
                refreshToken,
                "Bearer",
                new LoginResponse.UserSummary(user.getId(), user.getUsername(), user.getEmail(), user.getRole())
        );
    }

    public LoginResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()
                || !jwtTokenProvider.validateToken(refreshToken)
                || !"refresh".equals(jwtTokenProvider.getTokenType(refreshToken))) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);
        if (!isRefreshTokenActive(refreshToken, username)) {
            throw new UnauthorizedException("Refresh token has been revoked");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("User no longer exists"));
        if (!Constants.USER_STATUS_ACTIVE.equalsIgnoreCase(user.getStatus())) {
            throw new UnauthorizedException("Account is disabled");
        }

        revokeRefreshToken(refreshToken);
        String newAccessToken = jwtTokenProvider.generateAccessToken(user.getUsername(), user.getRole());
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(user.getUsername());
        storeRefreshToken(newRefreshToken, user.getUsername());

        return new LoginResponse(
                newAccessToken,
                newRefreshToken,
                "Bearer",
                new LoginResponse.UserSummary(user.getId(), user.getUsername(), user.getEmail(), user.getRole())
        );
    }

    public void logout(String refreshToken, String username) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            revokeRefreshToken(refreshToken);
        }
        if (username != null) {
            auditLogService.logAdminAction(username, "LOGOUT", "AUTH", "");
        }
    }

    private void storeRefreshToken(String token, String username) {
        try {
            redisTemplate.opsForValue().set(
                    Constants.REDIS_REFRESH_TOKEN_PREFIX + token,
                    username,
                    Duration.ofMillis(jwtTokenProvider.getRefreshExpirationMs())
            );
        } catch (Exception ex) {
            log.warn("Redis unavailable while storing refresh token: {}", ex.getMessage());
        }
    }

    private boolean isRefreshTokenActive(String token, String username) {
        try {
            String stored = redisTemplate.opsForValue().get(Constants.REDIS_REFRESH_TOKEN_PREFIX + token);
            return stored == null || username.equals(stored);
        } catch (Exception ex) {
            log.warn("Redis unavailable while validating refresh token: {}", ex.getMessage());
            return true;
        }
    }

    private void revokeRefreshToken(String token) {
        try {
            redisTemplate.delete(Constants.REDIS_REFRESH_TOKEN_PREFIX + token);
        } catch (Exception ex) {
            log.warn("Redis unavailable while revoking refresh token: {}", ex.getMessage());
        }
    }
}
