package com.company.livestream.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserResponse(
            Long id,
            String username,
            String email,
            String role,
            String status,
            LocalDateTime createdAt
    ) {
        public static UserResponse from(User user) {
            return new UserResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getRole(),
                    user.getStatus(),
                    user.getCreatedAt()
            );
        }
    }

    public record CreateUserRequest(
            @NotBlank(message = "Username is required")
            @Size(min = 3, max = 100, message = "Username must be between 3 and 100 characters")
            String username,

            @NotBlank(message = "Password is required")
            @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
            String password,

            @NotBlank(message = "Email is required")
            @Email(message = "Valid email is required")
            String email,

            @Pattern(regexp = "ADMIN|USER", message = "Role must be ADMIN or USER")
            String role
    ) {
    }

    public record UpdateUserRequest(
            @Email(message = "Valid email is required")
            String email,

            @Pattern(regexp = "ADMIN|USER", message = "Role must be ADMIN or USER")
            String role,

            @Pattern(regexp = "ACTIVE|DISABLED", message = "Status must be ACTIVE or DISABLED")
            String status,

            @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
            String password
    ) {
    }
}
