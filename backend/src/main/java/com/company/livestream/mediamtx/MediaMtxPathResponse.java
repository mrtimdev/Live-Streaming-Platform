package com.company.livestream.mediamtx;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MediaMtxPathResponse(
        int itemCount,
        int pageCount,
        List<PathItem> items
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PathItem(
            String name,
            boolean ready,
            String readyTime,
            long bytesReceived,
            long bytesSent,
            Source source,
            List<String> tracks,
            List<Reader> readers
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Source(
            String type,
            String id
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Reader(
            String type,
            String id
    ) {
    }
}
