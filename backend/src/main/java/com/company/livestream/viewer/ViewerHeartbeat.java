package com.company.livestream.viewer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class ViewerHeartbeat {

    private ViewerHeartbeat() {
    }

    public record Request(
            @NotBlank(message = "Session ID is required")
            @Size(max = 100, message = "Session ID must be at most 100 characters")
            String sessionId
    ) {
    }

    public record Response(
            String streamId,
            long activeViewers
    ) {
    }
}
