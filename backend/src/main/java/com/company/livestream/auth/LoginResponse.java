package com.company.livestream.auth;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        UserSummary user
) {
    public record UserSummary(
            Long id,
            String username,
            String email,
            String role
    ) {
    }
}
