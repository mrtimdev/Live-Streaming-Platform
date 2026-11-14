package com.company.livestream.user;

import com.company.livestream.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDtos.UserResponse>>> listUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.listUsers()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserDtos.UserResponse>> createUser(
            @Valid @RequestBody UserDtos.CreateUserRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        UserDtos.UserResponse created = userService.createUser(request, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("User created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDtos.UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserDtos.UpdateUserRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        UserDtos.UserResponse updated = userService.updateUser(id, request, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("User updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {
        userService.deleteUser(id, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("User deleted", null));
    }
}
