package com.company.livestream.stream;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.time.Instant;

public final class StreamDtos {

    private StreamDtos() {
    }

    public record CreateStreamRequest(
            @NotBlank(message = "Stream title is required")
            @Size(max = 200, message = "Title must be at most 200 characters")
            String title,

            @Size(max = 5000, message = "Description must be at most 5000 characters")
            String description,

            @Size(max = 500, message = "Thumbnail URL must be at most 500 characters")
            String thumbnailUrl,

            @Pattern(regexp = "^[a-zA-Z0-9_-]{3,64}$", message = "Stream ID must be 3-64 alphanumeric, dash, or underscore characters")
            String streamId,
            Instant scheduledStartAt
    ) {
    }

    public record UpdateStreamRequest(
            @NotBlank(message = "Stream title is required")
            @Size(max = 200, message = "Title must be at most 200 characters")
            String title,

            @Size(max = 5000, message = "Description must be at most 5000 characters")
            String description,

            @Size(max = 500, message = "Thumbnail URL must be at most 500 characters")
            String thumbnailUrl,
            Instant scheduledStartAt
    ) {
    }

    public record StreamResponse(
            Long id,
            String streamId,
            String title,
            String description,
            String thumbnailUrl,
            StreamStatus status,
            Long createdBy,
            LocalDateTime createdAt,
            LocalDateTime startedAt,
            LocalDateTime endedAt,
            long viewerCount,
            String rtmpUrl,
            String hlsUrl,
            Instant scheduledStartAt
    ) {
    }

    public record StreamCredentialsResponse(
            StreamResponse stream,
            String streamKey,
            String obsServerUrl,
            String obsStreamKey
    ) {
    }

    public record PublicStreamResponse(
            Long id,
            String streamId,
            String title,
            String description,
            String thumbnailUrl,
            StreamStatus status,
            long viewerCount,
            String hlsUrl,
            LocalDateTime startedAt,
            Instant scheduledStartAt,
            StreamViews views
    ) {
    }

    public record PlaybackResponse(
            String streamId,
            StreamStatus status,
            String hlsUrl,
            long viewerCount,
            StreamViews views
    ) {
    }
}
