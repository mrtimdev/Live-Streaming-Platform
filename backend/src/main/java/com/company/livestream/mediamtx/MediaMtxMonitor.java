package com.company.livestream.mediamtx;

import com.company.livestream.stream.LiveStream;
import com.company.livestream.stream.StreamCameraRepository;
import com.company.livestream.stream.StreamRepository;
import com.company.livestream.stream.StreamService;
import com.company.livestream.stream.StreamStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class MediaMtxMonitor {

    private static final Logger log = LoggerFactory.getLogger(MediaMtxMonitor.class);

    private final MediaMtxClient mediaMtxClient;
    private final StreamRepository streamRepository;
    private final StreamService streamService;
    private final PublishingPaths publishingPaths;
    private final StreamCameraRepository cameraRepository;

    public MediaMtxMonitor(MediaMtxClient mediaMtxClient,
                           StreamRepository streamRepository,
                           StreamService streamService,
                           PublishingPaths publishingPaths,
                           StreamCameraRepository cameraRepository) {
        this.mediaMtxClient = mediaMtxClient;
        this.streamRepository = streamRepository;
        this.streamService = streamService;
        this.publishingPaths = publishingPaths;
        this.cameraRepository = cameraRepository;
    }

    @Scheduled(fixedDelayString = "${app.mediamtx.monitor-interval-ms:3000}")
    public void pollMediaMtx() {
        Optional<List<MediaMtxPathResponse.PathItem>> pathsOpt = mediaMtxClient.listPaths();
        if (pathsOpt.isEmpty()) {
            return;
        }

        Set<String> activeStreamIds = new HashSet<>();
        Set<String> readyPaths = new HashSet<>();
        for (MediaMtxPathResponse.PathItem item : pathsOpt.get()) {
            if (item.ready()) {
                String path = MediaMtxAuthController.normalizePath(item.name());
                if (path != null) {
                    readyPaths.add(path);
                    if (registered(path)) {
                        activeStreamIds.add(path.split("/", 2)[0]);
                    }
                }
            }
        }
        publishingPaths.update(readyPaths);

        List<LiveStream> allStreams = streamRepository.findAll();
        for (LiveStream stream : allStreams) {
            boolean isPublishing = activeStreamIds.contains(stream.getStreamId());
            try {
                if (isPublishing && stream.getStatus() != StreamStatus.LIVE) {
                    streamService.markStreamLive(stream.getId());
                } else if (!isPublishing && stream.getStatus() == StreamStatus.LIVE) {
                    streamService.markStreamOffline(stream.getId());
                }
            } catch (Exception ex) {
                log.error("Error updating stream state for {}: {}", stream.getStreamId(), ex.getMessage());
            }
        }
    }

    private boolean registered(String path) {
        String[] parts = path.split("/", 2);
        return parts.length == 1 || streamRepository.findByStreamId(parts[0])
                .flatMap(stream -> cameraRepository.findByStreamIdAndId(stream.getId(), parts[1]))
                .isPresent();
    }
}
