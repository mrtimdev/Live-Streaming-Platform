package com.company.livestream;

import com.company.livestream.common.Constants;
import com.company.livestream.stream.StreamDtos;
import com.company.livestream.user.User;
import com.company.livestream.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StreamPlatformIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private StringRedisTemplate redisTemplate;

    private String adminToken;
    private String regularUserToken;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() throws Exception {
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        ZSetOperations<String, String> zSetOps = mock(ZSetOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(redisTemplate.opsForZSet()).thenReturn(zSetOps);
        when(zSetOps.add(anyString(), anyString(), anyDouble())).thenReturn(true);
        when(zSetOps.zCard(anyString())).thenReturn(1L);
        when(redisTemplate.expire(anyString(), any())).thenReturn(true);

        if (!userRepository.existsByUsername("regular_user")) {
            User user = new User();
            user.setUsername("regular_user");
            user.setPassword(passwordEncoder.encode("userpass123"));
            user.setEmail("user@livestream.local");
            user.setRole(Constants.ROLE_USER);
            user.setStatus(Constants.USER_STATUS_ACTIVE);
            userRepository.save(user);
        }

        adminToken = loginAndGetToken("admin", "admin123");
        regularUserToken = loginAndGetToken("regular_user", "userpass123");
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        String body = objectMapper.writeValueAsString(new com.company.livestream.auth.LoginRequest(username, password));
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("accessToken").asText();
    }

    @Test
    void unauthorizedAndInvalidTokenAreRejected() throws Exception {
        mockMvc.perform(get("/api/streams"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/streams")
                        .header("Authorization", "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/streams")
                        .header("Authorization", "Bearer " + regularUserToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void createStreamDuplicateAndObsAuthFlow() throws Exception {
        StreamDtos.CreateStreamRequest createReq = new StreamDtos.CreateStreamRequest(
                "Keynote Broadcast",
                "Annual engineering keynote",
                null,
                "keynote-2026"
        );

        MvcResult createResult = mockMvc.perform(post("/api/streams")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.stream.streamId").value("keynote-2026"))
                .andExpect(jsonPath("$.data.streamKey").isNotEmpty())
                .andExpect(jsonPath("$.data.obsStreamKey").isNotEmpty())
                .andReturn();

        JsonNode createdJson = objectMapper.readTree(createResult.getResponse().getContentAsString());
        String rawKey = createdJson.path("data").path("streamKey").asText();

        // Duplicate streamId rejected
        mockMvc.perform(post("/api/streams")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isBadRequest());

        // Ordinary listing must NOT expose streamKey
        mockMvc.perform(get("/api/streams/keynote-2026")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.streamKey").doesNotExist())
                .andExpect(jsonPath("$.data.streamKeyHash").doesNotExist());

        // Valid OBS publish key accepted
        String validPublishAuth = """
                {"user":"publisher","password":"%s","ip":"172.18.0.5","action":"publish","path":"live/keynote-2026","protocol":"rtmp","id":"1","query":""}
                """.formatted(rawKey);
        mockMvc.perform(post("/api/internal/mediamtx/auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPublishAuth))
                .andExpect(status().isOk());

        // Invalid OBS publish key rejected
        String invalidPublishAuth = """
                {"user":"publisher","password":"wrong-secret","ip":"172.18.0.5","action":"publish","path":"live/keynote-2026","protocol":"rtmp","id":"2","query":""}
                """;
        mockMvc.perform(post("/api/internal/mediamtx/auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPublishAuth))
                .andExpect(status().isUnauthorized());

        // Public read allowed without credentials
        String publicReadAuth = """
                {"user":"","password":"","ip":"203.0.113.10","action":"read","path":"live/keynote-2026","protocol":"hls","id":"3","query":""}
                """;
        mockMvc.perform(post("/api/internal/mediamtx/auth")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(publicReadAuth))
                .andExpect(status().isOk());

        // Viewer heartbeat works
        mockMvc.perform(post("/api/public/streams/keynote-2026/heartbeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\":\"viewer-abc-123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activeViewers").value(1));

        // Cleanup
        mockMvc.perform(delete("/api/streams/keynote-2026")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        assertThat(rawKey).isNotBlank();
    }

    @Test
    void unknownStreamReturns404() throws Exception {
        mockMvc.perform(get("/api/public/streams/non-existent-stream"))
                .andExpect(status().isNotFound());
    }
}
