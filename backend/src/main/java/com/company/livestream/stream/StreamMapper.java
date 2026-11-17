package com.company.livestream.stream;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.net.URI;

@Component
public class StreamMapper {

    @Value("${app.mediamtx.rtmp-public-url}")
    private String rtmpPublicUrl;

    @Value("${app.mediamtx.hls-public-url}")
    private String hlsPublicUrl;

    public StreamDtos.StreamResponse toStreamResponse(LiveStream stream, long viewerCount) {
        return new StreamDtos.StreamResponse(
                stream.getId(),
                stream.getStreamId(),
                stream.getTitle(),
                stream.getDescription(),
                stream.getThumbnailUrl(),
                stream.getStatus(),
                stream.getCreatedBy(),
                stream.getCreatedAt(),
                stream.getStartedAt(),
                stream.getEndedAt(),
                viewerCount,
                getRtmpPublicUrl(),
                buildHlsUrl(stream.getStreamId()),
                stream.getScheduledStartAt()
        );
    }

    public StreamDtos.PublicStreamResponse toPublicStreamResponse(LiveStream stream, long viewerCount, StreamViews views) {
        return new StreamDtos.PublicStreamResponse(
                stream.getId(),
                stream.getStreamId(),
                stream.getTitle(),
                stream.getDescription(),
                stream.getThumbnailUrl(),
                stream.getStatus(),
                viewerCount,
                views.directorFeed().hlsUrl(),
                stream.getStartedAt(),
                stream.getScheduledStartAt(),
                views
        );
    }

    public StreamDtos.PlaybackResponse toPlaybackResponse(LiveStream stream, long viewerCount, StreamViews views) {
        return new StreamDtos.PlaybackResponse(
                stream.getStreamId(),
                stream.getStatus(),
                views.directorFeed().hlsUrl(),
                viewerCount,
                views
        );
    }

    public String buildObsStreamKey(String streamId, String rawKey) {
        return streamId + "?user=publisher&pass=" + rawKey;
    }

    public String buildHlsUrl(String streamId) {
        return normalizeBase(hlsPublicUrl) + "/" + streamId + "/index.m3u8";
    }

    public String getRtmpPublicUrl() {
        String base = normalizeBase(rtmpPublicUrl);
        try {
            URI uri = URI.create(base);
            String configuredHost = uri.getHost();
            if ("localhost".equalsIgnoreCase(configuredHost) || "127.0.0.1".equals(configuredHost)) {
                String requestHost = currentRequestHost();
                if (requestHost != null && !requestHost.isBlank()
                        && !"localhost".equalsIgnoreCase(requestHost)
                        && !"127.0.0.1".equals(requestHost)) {
                    int port = uri.getPort();
                    String portPart = port > 0 ? ":" + port : "";
                    String pathPart = uri.getRawPath() != null ? uri.getRawPath() : "";
                    return uri.getScheme() + "://" + requestHost + portPart + pathPart;
                }
            }
        } catch (Exception ignored) {
            // Fall back to configured RTMP URL
        }
        return base;
    }

    private String currentRequestHost() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest request = attrs.getRequest();
            return request.getServerName();
        }
        return null;
    }

    private String normalizeBase(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
