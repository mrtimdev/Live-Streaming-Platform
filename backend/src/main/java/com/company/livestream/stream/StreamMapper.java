package com.company.livestream.stream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

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
                normalizeBase(rtmpPublicUrl),
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
        return normalizeBase(rtmpPublicUrl);
    }

    private String normalizeBase(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
