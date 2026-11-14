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
            long bytesReceived
    ) {
    }
}
