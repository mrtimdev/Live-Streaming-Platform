package com.company.livestream.stream;

import com.company.livestream.common.AuditLogService;
import com.company.livestream.common.Constants;
import com.company.livestream.exception.BadRequestException;
import com.company.livestream.exception.ResourceNotFoundException;
import com.company.livestream.history.HistoryService;
import com.company.livestream.history.StreamHistory;
import com.company.livestream.user.User;
import com.company.livestream.user.UserService;
import com.company.livestream.viewer.ViewerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class StreamService {

    private static final Logger log = LoggerFactory.getLogger(StreamService.class);

    private final StreamRepository streamRepository;
    private final StreamKeyService streamKeyService;
    private final StreamMapper streamMapper;
    private final UserService userService;
    private final ViewerService viewerService;
    private final HistoryService historyService;
    private final StringRedisTemplate redisTemplate;
    private final AuditLogService auditLogService;
    private final StreamCameraService cameraService;

    public StreamService(StreamRepository streamRepository,
                         StreamKeyService streamKeyService,
                         StreamMapper streamMapper,
                         UserService userService,
                         ViewerService viewerService,
                         HistoryService historyService,
                         StringRedisTemplate redisTemplate,
                         AuditLogService auditLogService,
                         StreamCameraService cameraService) {
        this.streamRepository = streamRepository;
        this.streamKeyService = streamKeyService;
        this.streamMapper = streamMapper;
        this.userService = userService;
        this.viewerService = viewerService;
        this.historyService = historyService;
        this.redisTemplate = redisTemplate;
        this.auditLogService = auditLogService;
        this.cameraService = cameraService;
    }

    @Transactional
    public StreamDtos.StreamCredentialsResponse createStream(StreamDtos.CreateStreamRequest request, String adminUsername) {
        User admin = userService.findByUsernameOrThrow(adminUsername);

        String streamId;
        if (request.streamId() != null && !request.streamId().isBlank()) {
            streamId = request.streamId().trim();
            if (streamRepository.existsByStreamId(streamId)) {
                throw new BadRequestException("Stream ID already exists: " + streamId);
            }
        } else {
            streamId = generateUniqueStreamId();
        }

        String rawKey = streamKeyService.generateRawStreamKey();
        String keyHash = streamKeyService.hashStreamKey(rawKey);

        LiveStream stream = new LiveStream();
        stream.setTitle(request.title().trim());
        stream.setDescription(request.description() != null ? request.description().trim() : null);
        stream.setThumbnailUrl(request.thumbnailUrl() != null && !request.thumbnailUrl().isBlank()
                ? request.thumbnailUrl().trim() : null);
        stream.setStreamId(streamId);
        stream.setStreamKeyHash(keyHash);
        stream.setStatus(StreamStatus.OFFLINE);
        stream.setCreatedBy(admin.getId());

        LiveStream saved = streamRepository.save(stream);
        cacheStreamStatus(saved.getStreamId(), StreamStatus.OFFLINE);
        auditLogService.logAdminAction(adminUsername, "CREATE_STREAM", saved.getStreamId(), "title=" + saved.getTitle());

        StreamDtos.StreamResponse dto = streamMapper.toStreamResponse(saved, 0L);
        return new StreamDtos.StreamCredentialsResponse(
                dto,
                rawKey,
                streamMapper.getRtmpPublicUrl(),
                streamMapper.buildObsStreamKey(saved.getStreamId(), rawKey)
        );
    }

    public Page<StreamDtos.StreamResponse> listStreams(String search,
                                                       StreamStatus status,
                                                       int page,
                                                       int size,
                                                       String sortBy,
                                                       String sortDir) {
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String safeSort = switch (sortBy != null ? sortBy : "createdAt") {
            case "title", "status", "startedAt", "createdAt" -> sortBy;
            default -> "createdAt";
        };
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by(direction, safeSort));
        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        return streamRepository.searchStreams(status, normalizedSearch, pageable)
                .map(s -> streamMapper.toStreamResponse(s, viewerService.getActiveViewerCount(s.getStreamId())));
    }

    public StreamDtos.StreamResponse getStream(String idOrStreamId) {
        LiveStream stream = findStreamByIdOrStreamId(idOrStreamId);
        long viewers = viewerService.getActiveViewerCount(stream.getStreamId());
        return streamMapper.toStreamResponse(stream, viewers);
    }

    @Transactional
    public StreamDtos.StreamResponse updateStream(String idOrStreamId,
                                                  StreamDtos.UpdateStreamRequest request,
                                                  String adminUsername) {
        LiveStream stream = findStreamByIdOrStreamId(idOrStreamId);
        stream.setTitle(request.title().trim());
        stream.setDescription(request.description() != null ? request.description().trim() : null);
        stream.setThumbnailUrl(request.thumbnailUrl() != null && !request.thumbnailUrl().isBlank()
                ? request.thumbnailUrl().trim() : null);

        LiveStream saved = streamRepository.save(stream);
        auditLogService.logAdminAction(adminUsername, "UPDATE_STREAM", saved.getStreamId(), "title=" + saved.getTitle());
        long viewers = viewerService.getActiveViewerCount(saved.getStreamId());
        return streamMapper.toStreamResponse(saved, viewers);
    }

    @Transactional
    public void deleteStream(String idOrStreamId, String adminUsername) {
        Long id = findStreamByIdOrStreamId(idOrStreamId).getId();
        LiveStream stream = streamRepository.lockById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stream not found: " + idOrStreamId));
        String streamId = stream.getStreamId();
        streamRepository.delete(stream);
        viewerService.clearStreamViewers(streamId);
        deleteCachedStreamStatus(streamId);
        auditLogService.logAdminAction(adminUsername, "DELETE_STREAM", streamId, "");
    }

    @Transactional
    public StreamDtos.StreamCredentialsResponse regenerateKey(String idOrStreamId, String adminUsername) {
        LiveStream stream = findStreamByIdOrStreamId(idOrStreamId);
        String rawKey = streamKeyService.generateRawStreamKey();
        stream.setStreamKeyHash(streamKeyService.hashStreamKey(rawKey));
        LiveStream saved = streamRepository.save(stream);

        auditLogService.logAdminAction(adminUsername, "REGENERATE_STREAM_KEY", saved.getStreamId(), "");

        long viewers = viewerService.getActiveViewerCount(saved.getStreamId());
        StreamDtos.StreamResponse dto = streamMapper.toStreamResponse(saved, viewers);
        return new StreamDtos.StreamCredentialsResponse(
                dto,
                rawKey,
                streamMapper.getRtmpPublicUrl(),
                streamMapper.buildObsStreamKey(saved.getStreamId(), rawKey)
        );
    }

    public List<StreamHistory> getStreamHistory(String idOrStreamId) {
        LiveStream stream = findStreamByIdOrStreamId(idOrStreamId);
        return historyService.getStreamHistory(stream.getId());
    }

    public List<StreamDtos.PublicStreamResponse> listPublicLiveStreams() {
        return streamRepository.findByStatusOrderByStartedAtDesc(StreamStatus.LIVE)
                .stream()
                .map(this::toPublicStream)
                .toList();
    }

    public StreamDtos.PublicStreamResponse getPublicStream(String idOrStreamId) {
        return toPublicStream(findStreamByIdOrStreamId(idOrStreamId));
    }

    public StreamDtos.PlaybackResponse getPublicPlayback(String idOrStreamId) {
        LiveStream stream = findStreamByIdOrStreamId(idOrStreamId);
        long viewers = viewerService.getActiveViewerCount(stream.getStreamId());
        return streamMapper.toPlaybackResponse(stream, viewers, cameraService.getViews(stream));
    }

    private StreamDtos.PublicStreamResponse toPublicStream(LiveStream stream) {
        return streamMapper.toPublicStreamResponse(stream, viewerService.getActiveViewerCount(stream.getStreamId()),
                cameraService.getViews(stream));
    }

    @Transactional
    public void markStreamLive(Long id) {
        LiveStream stream = streamRepository.lockById(id).orElse(null);
        if (stream == null || stream.getStatus() == StreamStatus.LIVE) {
            return;
        }
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        stream.setStatus(StreamStatus.LIVE);
        stream.setStartedAt(now);
        stream.setEndedAt(null);
        streamRepository.save(stream);
        cacheStreamStatus(stream.getStreamId(), StreamStatus.LIVE);
        historyService.recordStarted(stream.getId(), now);
        log.info("Stream transitioned to LIVE: {}", stream.getStreamId());
    }

    @Transactional
    public void markStreamOffline(Long id) {
        LiveStream stream = streamRepository.lockById(id).orElse(null);
        if (stream == null || stream.getStatus() == StreamStatus.OFFLINE) {
            return;
        }
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        long durationSeconds = 0L;
        if (stream.getStartedAt() != null) {
            durationSeconds = Math.max(0L, Duration.between(stream.getStartedAt(), now).getSeconds());
        }
        stream.setStatus(StreamStatus.OFFLINE);
        stream.setEndedAt(now);
        streamRepository.save(stream);
        cacheStreamStatus(stream.getStreamId(), StreamStatus.OFFLINE);
        historyService.recordStopped(stream.getId(), now, durationSeconds);
        log.info("Stream transitioned to OFFLINE: {} (duration={}s)", stream.getStreamId(), durationSeconds);
    }

    public LiveStream findStreamByIdOrStreamId(String idOrStreamId) {
        return streamRepository.findByStreamId(idOrStreamId)
                .or(() -> {
                    try {
                        return streamRepository.findById(Long.parseLong(idOrStreamId));
                    } catch (NumberFormatException ex) {
                        return java.util.Optional.empty();
                    }
                })
                .orElseThrow(() -> new ResourceNotFoundException("Stream not found: " + idOrStreamId));
    }

    private String generateUniqueStreamId() {
        for (int i = 0; i < 10; i++) {
            String candidate = streamKeyService.generateStreamId();
            if (!streamRepository.existsByStreamId(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Unable to generate unique stream ID");
    }

    private void cacheStreamStatus(String streamId, StreamStatus status) {
        try {
            redisTemplate.opsForValue().set(Constants.streamStatusKey(streamId), status.name());
        } catch (Exception ex) {
            log.warn("Redis unavailable while caching stream status for {}: {}", streamId, ex.getMessage());
        }
    }

    private void deleteCachedStreamStatus(String streamId) {
        try {
            redisTemplate.delete(Constants.streamStatusKey(streamId));
        } catch (Exception ex) {
            log.warn("Redis unavailable while deleting stream status for {}: {}", streamId, ex.getMessage());
        }
    }
}
