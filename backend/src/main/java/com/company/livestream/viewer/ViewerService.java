package com.company.livestream.viewer;

import com.company.livestream.common.Constants;
import com.company.livestream.exception.ResourceNotFoundException;
import com.company.livestream.stream.LiveStream;
import com.company.livestream.stream.StreamRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Service
public class ViewerService {

    private static final Logger log = LoggerFactory.getLogger(ViewerService.class);

    private final StringRedisTemplate redisTemplate;
    private final StreamRepository streamRepository;

    @Value("${app.viewer.heartbeat-ttl-seconds:45}")
    private long heartbeatTtlSeconds;

    public ViewerService(StringRedisTemplate redisTemplate, StreamRepository streamRepository) {
        this.redisTemplate = redisTemplate;
        this.streamRepository = streamRepository;
    }

    public ViewerHeartbeat.Response recordHeartbeat(String streamIdentifier, String sessionId) {
        LiveStream stream = resolveStream(streamIdentifier);
        String key = Constants.viewerSetKey(stream.getStreamId());
        long now = System.currentTimeMillis();
        long expiresAt = now + (heartbeatTtlSeconds * 1000L);

        try {
            redisTemplate.opsForZSet().add(key, sessionId, expiresAt);
            redisTemplate.opsForZSet().removeRangeByScore(key, 0, now);
            redisTemplate.expire(key, Duration.ofSeconds(heartbeatTtlSeconds * 2));
        } catch (Exception ex) {
            log.warn("Redis unavailable during viewer heartbeat for {}: {}", stream.getStreamId(), ex.getMessage());
        }

        long count = getActiveViewerCount(stream.getStreamId());
        return new ViewerHeartbeat.Response(stream.getStreamId(), count);
    }

    public ViewerHeartbeat.Response removeViewer(String streamIdentifier, String sessionId) {
        LiveStream stream = resolveStream(streamIdentifier);
        String key = Constants.viewerSetKey(stream.getStreamId());

        try {
            if (sessionId != null && !sessionId.isBlank()) {
                redisTemplate.opsForZSet().remove(key, sessionId);
            }
        } catch (Exception ex) {
            log.warn("Redis unavailable during viewer disconnect for {}: {}", stream.getStreamId(), ex.getMessage());
        }

        long count = getActiveViewerCount(stream.getStreamId());
        return new ViewerHeartbeat.Response(stream.getStreamId(), count);
    }

    public long getActiveViewerCount(String streamId) {
        String key = Constants.viewerSetKey(streamId);
        long now = System.currentTimeMillis();
        try {
            redisTemplate.opsForZSet().removeRangeByScore(key, 0, now);
            Long count = redisTemplate.opsForZSet().zCard(key);
            return count != null ? count : 0L;
        } catch (Exception ex) {
            log.warn("Redis unavailable while reading viewer count for {}: {}", streamId, ex.getMessage());
            return 0L;
        }
    }

    public long getTotalActiveViewers(List<LiveStream> streams) {
        long total = 0L;
        for (LiveStream stream : streams) {
            total += getActiveViewerCount(stream.getStreamId());
        }
        return total;
    }

    public void clearStreamViewers(String streamId) {
        try {
            redisTemplate.delete(Constants.viewerSetKey(streamId));
        } catch (Exception ex) {
            log.warn("Redis unavailable while clearing viewers for {}: {}", streamId, ex.getMessage());
        }
    }

    private LiveStream resolveStream(String streamIdentifier) {
        return streamRepository.findByStreamId(streamIdentifier)
                .or(() -> {
                    try {
                        return streamRepository.findById(Long.parseLong(streamIdentifier));
                    } catch (NumberFormatException e) {
                        return java.util.Optional.empty();
                    }
                })
                .orElseThrow(() -> new ResourceNotFoundException("Stream not found: " + streamIdentifier));
    }
}
