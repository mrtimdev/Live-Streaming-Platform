package com.company.livestream.mediamtx;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class MediaMtxClient {

    private static final Logger log = LoggerFactory.getLogger(MediaMtxClient.class);

    private final RestClient mediaMtxRestClient;

    public MediaMtxClient(RestClient mediaMtxRestClient) {
        this.mediaMtxRestClient = mediaMtxRestClient;
    }

    public Optional<List<MediaMtxPathResponse.PathItem>> listPaths() {
        try {
            List<MediaMtxPathResponse.PathItem> paths = new ArrayList<>();
            int page = 0;
            MediaMtxPathResponse response;
            do {
                response = mediaMtxRestClient.get()
                        .uri("/v3/paths/list?page={page}", page++)
                        .retrieve()
                        .body(MediaMtxPathResponse.class);
                if (response == null) {
                    return Optional.empty();
                }
                if (response.items() != null) {
                    paths.addAll(response.items());
                }
            } while (page < response.pageCount());
            return Optional.of(paths);
        } catch (Exception ex) {
            log.warn("Failed to query MediaMTX paths API: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public boolean isHealthy() {
        return listPaths().isPresent();
    }

    public boolean kickPublisher(String sourceType, String sourceId) {
        if (sourceType == null || sourceId == null || sourceId.isBlank()) {
            return false;
        }
        String endpoint = switch (sourceType) {
            case "webRTCSession" -> "/v3/webrtcsessions/kick/{id}";
            case "rtmpConn" -> "/v3/rtmpconns/kick/{id}";
            case "rtspSession" -> "/v3/rtspsessions/kick/{id}";
            case "srtConn" -> "/v3/srtconns/kick/{id}";
            default -> null;
        };
        if (endpoint == null) {
            log.warn("Unsupported MediaMTX source type for kick: {}", sourceType);
            return false;
        }
        try {
            mediaMtxRestClient.post()
                    .uri(endpoint, sourceId)
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception ex) {
            log.warn("Failed to kick MediaMTX publisher type={} id={}: {}", sourceType, sourceId, ex.getMessage());
            return false;
        }
    }
}
