package com.company.livestream;

import com.company.livestream.common.AuditLogService;
import com.company.livestream.mediamtx.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class StreamControlServiceTest {
    final MediaMtxClient client = mock(MediaMtxClient.class);
    final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    final StreamControlService service = new StreamControlService(client, redis, mock(AuditLogService.class));

    MediaMtxPathResponse.PathItem feed(String path, String id) {
        return new MediaMtxPathResponse.PathItem(path, true, "2026-11-15T00:00:00Z", 1024, 2048,
                new MediaMtxPathResponse.Source("rtmpConn", id), List.of("H264", "MPEG4Audio"), List.of());
    }

    @Test void healthAndDisconnectStayWithinExactStreamAndCamera() {
        when(client.listPaths()).thenReturn(Optional.of(List.of(feed("live/show", "main"),
                feed("live/show/angle", "camera"), feed("live/show-other", "other"))));
        assertThat(service.getHealth("show").feeds()).hasSize(2);
        when(client.kickPublisher("rtmpConn", "camera")).thenReturn(true);
        service.disconnect("show", "angle", "camera", "admin");
        verify(client).kickPublisher("rtmpConn", "camera");
        verify(client, never()).kickPublisher("rtmpConn", "main");
        verify(client, never()).kickPublisher("rtmpConn", "other");
    }

    @Test void staleControlsCannotKickReplacementPublisher() {
        when(client.listPaths()).thenReturn(Optional.of(List.of(feed("live/show", "replacement"))));
        assertThatThrownBy(() -> service.disconnect("show", null, "old", "admin"))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> assertThat(ex.getStatusCode().value()).isEqualTo(409));
        verify(client, never()).kickPublisher(any(), any());
    }

    @Test void unavailableServerIsNotReportedAsHealthyOffline() {
        when(client.listPaths()).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getHealth("show"))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> assertThat(ex.getStatusCode().value()).isEqualTo(502));
    }

    @Test void failedKickIsReportedAsUpstreamFailure() {
        when(client.listPaths()).thenReturn(Optional.of(List.of(feed("live/show", "main"))));
        assertThatThrownBy(() -> service.disconnect("show", null, "main", "admin"))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> assertThat(ex.getStatusCode().value()).isEqualTo(502));
    }

    @Test void lockLookupFailsClosedWhenRedisIsUnavailable() {
        when(redis.hasKey(anyString())).thenThrow(new RuntimeException("offline"));
        assertThatThrownBy(() -> service.isLocked("show"))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> assertThat(ex.getStatusCode().value()).isEqualTo(503));
    }
}
