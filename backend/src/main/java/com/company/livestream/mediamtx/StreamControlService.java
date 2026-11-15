package com.company.livestream.mediamtx;

import com.company.livestream.common.AuditLogService;
import com.company.livestream.exception.BadRequestException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Objects;

@Service
public class StreamControlService {

    private static final String LOCK_KEY_PREFIX = "stream:lock:";

    private final MediaMtxClient mediaMtxClient;
    private final StringRedisTemplate redisTemplate;
    private final AuditLogService auditLogService;

    public StreamControlService(MediaMtxClient mediaMtxClient,
                                StringRedisTemplate redisTemplate,
                                AuditLogService auditLogService) {
        this.mediaMtxClient = mediaMtxClient;
        this.redisTemplate = redisTemplate;
        this.auditLogService = auditLogService;
    }

    public boolean isLocked(String streamId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(LOCK_KEY_PREFIX + streamId));
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Publishing lock service unavailable");
        }
    }

    public boolean setLocked(String streamId, boolean locked, String actor) {
        String key = LOCK_KEY_PREFIX + streamId;
        if (locked) {
            redisTemplate.opsForValue().set(key, "1");
        } else {
            redisTemplate.delete(key);
        }
        auditLogService.logAdminAction(actor, locked ? "STREAM_LOCKED" : "STREAM_UNLOCKED", streamId,
                locked ? "Publishing locked by admin" : "Publishing unlocked by admin");
        return locked;
    }

    public StreamHealthResponse getHealth(String streamId) {
        String mainPath = "live/" + streamId;
        String cameraPrefix = mainPath + "/";
        List<MediaMtxPathResponse.PathItem> allPaths = mediaMtxClient.listPaths().orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Streaming server unavailable"));

        List<FeedHealth> feeds = allPaths.stream()
                .filter(p -> p.name() != null && (p.name().equals(mainPath) || p.name().startsWith(cameraPrefix)))
                .map(p -> toFeedHealth(p, mainPath))
                .toList();

        FeedHealth mainFeed = feeds.stream()
                .filter(f -> f.cameraId() == null)
                .findFirst()
                .orElse(null);

        return new StreamHealthResponse(streamId, isLocked(streamId), mainFeed, feeds);
    }

    public void disconnect(String streamId, String cameraId, String sourceId, String actor) {
        String targetPath = (cameraId == null || cameraId.isBlank())
                ? "live/" + streamId
                : "live/" + streamId + "/" + cameraId.trim();

        MediaMtxPathResponse.PathItem path = mediaMtxClient.listPaths()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Streaming server unavailable"))
                .stream()
                .filter(p -> targetPath.equals(p.name()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("No active publisher found for this feed"));

        if (!path.ready() || path.source() == null || path.source().id() == null) {
            throw new BadRequestException("No active publisher session to disconnect");
        }

        if (!path.source().id().equals(sourceId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Publisher changed. Refresh before disconnecting.");
        }
        boolean kicked = mediaMtxClient.kickPublisher(path.source().type(), path.source().id());
        if (!kicked) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not disconnect the active publisher");
        }

        auditLogService.logAdminAction(actor, "PUBLISHER_DISCONNECTED", streamId,
                "Disconnected " + path.source().type() + " on " + targetPath);
    }

    private FeedHealth toFeedHealth(MediaMtxPathResponse.PathItem item, String mainPath) {
        String cameraId = Objects.equals(item.name(), mainPath)
                ? null
                : item.name().substring(mainPath.length() + 1);
        return new FeedHealth(
                cameraId,
                item.name(),
                item.ready(),
                item.readyTime(),
                item.source() != null ? item.source().type() : null,
                item.source() != null ? item.source().id() : null,
                item.tracks() != null ? item.tracks() : List.of(),
                item.bytesReceived(),
                item.bytesSent(),
                item.readers() != null ? item.readers().size() : 0
        );
    }

    public record StreamHealthResponse(
            String streamId,
            boolean locked,
            FeedHealth mainFeed,
            List<FeedHealth> feeds
    ) {
    }

    public record FeedHealth(
            String cameraId,
            String path,
            boolean ready,
            String readyTime,
            String sourceType,
            String sourceId,
            List<String> tracks,
            long bytesReceived,
            long bytesSent,
            int readerCount
    ) {
    }
}
