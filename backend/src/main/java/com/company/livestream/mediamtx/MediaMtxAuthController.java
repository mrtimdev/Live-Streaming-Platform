package com.company.livestream.mediamtx;

import com.company.livestream.common.ApiResponse;
import com.company.livestream.security.JwtTokenProvider;
import com.company.livestream.stream.LiveStream;
import com.company.livestream.stream.StreamCamera;
import com.company.livestream.stream.StreamCameraRepository;
import com.company.livestream.stream.StreamKeyService;
import com.company.livestream.stream.StreamRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/internal/mediamtx")
public class MediaMtxAuthController {

    private static final Logger log = LoggerFactory.getLogger(MediaMtxAuthController.class);

    private final StreamRepository streamRepository;
    private final StreamKeyService streamKeyService;
    private final StreamCameraRepository cameraRepository;
    private final MediaMtxClient mediaMtxClient;
    private final JwtTokenProvider tokens;
    private final StreamControlService streamControlService;

    public MediaMtxAuthController(StreamRepository streamRepository,
                                  StreamCameraRepository cameraRepository,
                                  StreamKeyService streamKeyService,
                                  MediaMtxClient mediaMtxClient,
                                  JwtTokenProvider tokens,
                                  StreamControlService streamControlService) {
        this.streamRepository = streamRepository;
        this.cameraRepository = cameraRepository;
        this.streamKeyService = streamKeyService;
        this.mediaMtxClient = mediaMtxClient;
        this.tokens = tokens;
        this.streamControlService = streamControlService;
    }

    @PostMapping("/auth")
    public ResponseEntity<Void> authenticate(@RequestBody MediaMtxAuthRequest request) {
        String action = request.action() != null ? request.action().toLowerCase() : "";

        // Public playback is open without credentials
        if ("read".equals(action) || "playback".equals(action)) {
            return ResponseEntity.ok().build();
        }

        // Internal API/metrics access is allowed only from private/loopback addresses
        if ("api".equals(action) || "metrics".equals(action)) {
            if (isInternalIp(request.ip())) {
                return ResponseEntity.ok().build();
            }
            log.warn("Rejected external MediaMTX {} access from ip={}", action, request.ip());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Publishing requires valid streamId and streamKey
        if ("publish".equals(action)) {
            String rawPath = request.path() != null ? request.path().replace("%3F", "?").replace("%3f", "?") : "";
            int queryIdx = rawPath.indexOf('?');
            String pathOnly = queryIdx >= 0 ? rawPath.substring(0, queryIdx) : rawPath;
            String embeddedQuery = queryIdx >= 0 ? rawPath.substring(queryIdx + 1) : "";
            String path = normalizePath(pathOnly);
            String combinedQuery = (request.query() != null && !request.query().isBlank())
                    ? request.query()
                    : embeddedQuery;
            String rawKey = extractSecret(request, combinedQuery);

            if (path == null || rawKey == null) {
                log.warn("Rejected publish with missing streamId or key: path={} ip={}", request.path(), request.ip());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String[] parts = path.split("/", 2);
            String streamId = parts[0];
            Optional<LiveStream> streamOpt = streamRepository.findByStreamId(streamId);
            if (streamOpt.isEmpty()) {
                log.warn("Rejected publish for unknown streamId={} ip={}", streamId, request.ip());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            LiveStream stream = streamOpt.get();
            if (streamControlService.isLocked(streamId)) {
                log.warn("Rejected publish for locked streamId={} ip={}", streamId, request.ip());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            if ("webrtc".equals(request.protocol())) {
                boolean allowed = parts.length == 1 && "browser".equals(request.user())
                        && tokens.allowsBrowserPublish(rawKey, path);
                return allowed ? ResponseEntity.ok().build() : ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            String keyHash = parts.length == 1 ? stream.getStreamKeyHash()
                    : cameraRepository.findByStreamIdAndId(stream.getId(), parts[1])
                            .map(StreamCamera::getStreamKeyHash).orElse(null);
            if (keyHash == null || !streamKeyService.verifyStreamKey(rawKey, keyHash)) {
                log.warn("Rejected publish with invalid credentials for path={} ip={}", path, request.ip());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            log.info("Authorized publish for streamId={} protocol={} ip={}", streamId, request.protocol(), request.ip());
            return ResponseEntity.ok().build();
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        boolean reachable = mediaMtxClient.isHealthy();
        HttpStatus status = reachable ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(ApiResponse.ok(Map.of(
                "mediamtxReachable", reachable
        )));
    }

    static String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return null;
        }
        String normalized = path.trim();
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        if (normalized.startsWith("live/")) {
            normalized = normalized.substring("live/".length());
        }
        return normalized.isBlank() ? null : normalized;
    }

    private String extractSecret(MediaMtxAuthRequest request, String query) {
        if (request.password() != null && !request.password().isBlank()) {
            return request.password();
        }
        if (query != null && !query.isBlank()) {
            for (String param : query.split("&")) {
                String[] parts = param.split("=", 2);
                if (parts.length == 2) {
                    String k = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
                    String v = URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
                    if (("pass".equals(k) || "key".equals(k) || "password".equals(k) || "token".equals(k) || "secret".equals(k))
                            && !v.isBlank()) {
                        return v;
                    }
                }
            }
        }
        if (request.user() != null && !request.user().isBlank()
                && !"publisher".equalsIgnoreCase(request.user())
                && !"browser".equalsIgnoreCase(request.user())) {
            return request.user();
        }
        return null;
    }

    private boolean isInternalIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        try {
            InetAddress addr = InetAddress.getByName(ip);
            return addr.isLoopbackAddress() || addr.isSiteLocalAddress();
        } catch (Exception ex) {
            return false;
        }
    }
}
