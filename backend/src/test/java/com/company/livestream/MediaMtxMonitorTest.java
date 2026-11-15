package com.company.livestream;

import com.company.livestream.history.HistoryRepository;
import com.company.livestream.mediamtx.MediaMtxClient;
import com.company.livestream.mediamtx.MediaMtxMonitor;
import com.company.livestream.mediamtx.MediaMtxPathResponse;
import com.company.livestream.stream.LiveStream;
import com.company.livestream.stream.StreamRepository;
import com.company.livestream.stream.StreamCameraService;
import com.company.livestream.stream.StreamStatus;
import com.company.livestream.stream.StreamViews;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class MediaMtxMonitorTest {

    @Autowired
    private MediaMtxMonitor mediaMtxMonitor;

    @Autowired
    private StreamRepository streamRepository;

    @Autowired
    private HistoryRepository historyRepository;

    @Autowired
    private StreamCameraService cameraService;

    @MockitoBean
    private MediaMtxClient mediaMtxClient;

    @MockitoBean
    private StringRedisTemplate redisTemplate;

    @SuppressWarnings("unchecked")
    @Test
    void streamTransitionsLiveAndOfflineWithoutDuplicateHistoryEvents() {
        when(redisTemplate.opsForValue()).thenReturn(mock(ValueOperations.class));

        LiveStream stream = new LiveStream();
        stream.setTitle("Monitor Test");
        stream.setStreamId("monitor-test-stream");
        stream.setStreamKeyHash("hashed");
        stream.setStatus(StreamStatus.OFFLINE);
        stream.setCreatedBy(1L);
        stream = streamRepository.save(stream);

        // Poll 1 & 2: MediaMTX reports stream is ready -> transitions LIVE once
        List<MediaMtxPathResponse.PathItem> livePaths = List.of(
                new MediaMtxPathResponse.PathItem("live/monitor-test-stream", true, "2026-11-14T00:00:00Z", 1024L, 0L, null, List.of(), List.of())
        );
        when(mediaMtxClient.listPaths()).thenReturn(Optional.of(livePaths));

        mediaMtxMonitor.pollMediaMtx();
        mediaMtxMonitor.pollMediaMtx();

        LiveStream updatedLive = streamRepository.findById(stream.getId()).orElseThrow();
        assertThat(updatedLive.getStatus()).isEqualTo(StreamStatus.LIVE);
        assertThat(updatedLive.getStartedAt()).isNotNull();
        assertThat(historyRepository.findByStreamIdOrderByEventTimeDesc(stream.getId())).hasSize(1);

        // Poll 3 & 4: OBS disconnects -> transitions OFFLINE once
        when(mediaMtxClient.listPaths()).thenReturn(Optional.of(List.of()));

        mediaMtxMonitor.pollMediaMtx();
        mediaMtxMonitor.pollMediaMtx();

        LiveStream updatedOffline = streamRepository.findById(stream.getId()).orElseThrow();
        assertThat(updatedOffline.getStatus()).isEqualTo(StreamStatus.OFFLINE);
        assertThat(updatedOffline.getEndedAt()).isNotNull();
        assertThat(historyRepository.findByStreamIdOrderByEventTimeDesc(stream.getId())).hasSize(2);
    }

    @SuppressWarnings("unchecked")
    @Test
    void cameraOnlyBroadcastStaysLiveWhenAnAngleDisconnects() {
        when(redisTemplate.opsForValue()).thenReturn(mock(ValueOperations.class));

        LiveStream stream = new LiveStream();
        stream.setTitle("Camera broadcasts");
        stream.setStreamId("monitor-cameras");
        stream.setStreamKeyHash("hashed");
        stream.setCreatedBy(1L);
        Long id = streamRepository.save(stream).getId();
        var wide = cameraService.add(id, new StreamViews.CameraRequest("Wide"));
        var close = cameraService.add(id, new StreamViews.CameraRequest("Close"));
        cameraService.selectDirector(id, wide.cameraId());
        var widePath = new MediaMtxPathResponse.PathItem("live/" + wide.publishingPath(), true, null, 0L, 0L, null, List.of(), List.of());
        var closePath = new MediaMtxPathResponse.PathItem("live/" + close.publishingPath(), true, null, 0L, 0L, null, List.of(), List.of());

        when(mediaMtxClient.listPaths()).thenReturn(Optional.of(List.of(widePath, closePath)));
        mediaMtxMonitor.pollMediaMtx();
        LiveStream live = streamRepository.findById(id).orElseThrow();
        assertThat(live.getStatus()).isEqualTo(StreamStatus.LIVE);
        assertThat(cameraService.getViews(live).directorFeed().id()).isEqualTo(wide.cameraId());

        when(mediaMtxClient.listPaths()).thenReturn(Optional.of(List.of(closePath)));
        mediaMtxMonitor.pollMediaMtx();
        live = streamRepository.findById(id).orElseThrow();
        assertThat(live.getStatus()).isEqualTo(StreamStatus.LIVE);
        assertThat(cameraService.getViews(live).directorFeed().id()).isEqualTo(close.cameraId());
        assertThat(historyRepository.findByStreamIdOrderByEventTimeDesc(id)).hasSize(1);

        when(mediaMtxClient.listPaths()).thenReturn(Optional.of(List.of()));
        mediaMtxMonitor.pollMediaMtx();
        assertThat(streamRepository.findById(id).orElseThrow().getStatus()).isEqualTo(StreamStatus.OFFLINE);
        assertThat(historyRepository.findByStreamIdOrderByEventTimeDesc(id)).hasSize(2);
    }
}
