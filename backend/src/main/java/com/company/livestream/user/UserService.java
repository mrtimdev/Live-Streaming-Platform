package com.company.livestream.user;

import com.company.livestream.common.AuditLogService;
import com.company.livestream.common.Constants;
import com.company.livestream.exception.BadRequestException;
import com.company.livestream.exception.ResourceNotFoundException;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    public List<UserDtos.UserResponse> listUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(UserDtos.UserResponse::from)
                .toList();
    }

    public User findByUsernameOrThrow(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    @Transactional
    public UserDtos.UserResponse createUser(UserDtos.CreateUserRequest request, String actor) {
        if (userRepository.existsByUsername(request.username())) {
            throw new BadRequestException("Username already exists");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already exists");
        }

        User user = new User();
        user.setUsername(request.username().trim());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setEmail(request.email().trim().toLowerCase());
        user.setRole(request.role() != null ? request.role() : Constants.ROLE_USER);
        user.setStatus(Constants.USER_STATUS_ACTIVE);

        User saved = userRepository.save(user);
        auditLogService.logAdminAction(actor, "CREATE_USER", saved.getUsername(), "role=" + saved.getRole());
        return UserDtos.UserResponse.from(saved);
    }

    @Transactional
    public UserDtos.UserResponse updateUser(Long id, UserDtos.UpdateUserRequest request, String actor) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));

        if (request.email() != null && !request.email().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(request.email())) {
                throw new BadRequestException("Email already exists");
            }
            user.setEmail(request.email().trim().toLowerCase());
        }
        if (request.role() != null) {
            user.setRole(request.role());
        }
        if (request.status() != null) {
            user.setStatus(request.status());
        }
        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }

        User saved = userRepository.save(user);
        auditLogService.logAdminAction(actor, "UPDATE_USER", saved.getUsername(),
                "role=" + saved.getRole() + ",status=" + saved.getStatus());
        return UserDtos.UserResponse.from(saved);
    }

    @Transactional
    public void deleteUser(Long id, String actor) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        if (user.getUsername().equals(actor)) {
            throw new BadRequestException("Cannot delete your own account");
        }
        userRepository.delete(user);
        auditLogService.logAdminAction(actor, "DELETE_USER", user.getUsername(), "");
    }
}
