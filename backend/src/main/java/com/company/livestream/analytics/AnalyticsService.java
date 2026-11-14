package com.company.livestream.analytics;

import com.company.livestream.history.HistoryRepository;
import com.company.livestream.history.StreamHistory;
import com.company.livestream.stream.LiveStream;
import com.company.livestream.stream.StreamRepository;
import com.company.livestream.stream.StreamService;
import com.company.livestream.stream.StreamStatus;
import com.company.livestream.viewer.ViewerService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final StreamRepository streamRepository;
    private final HistoryRepository historyRepository;
    private final ViewerService viewerService;
    private final StreamService streamService;

    public AnalyticsService(StreamRepository streamRepository,
                            HistoryRepository historyRepository,
                            ViewerService viewerService,
                            StreamService streamService) {
        this.streamRepository = streamRepository;
        this.historyRepository = historyRepository;
        this.viewerService = viewerService;
        this.streamService = streamService;
    }

    public StreamAnalytics.DashboardStats getDashboardStats() {
        List<LiveStream> allStreams = streamRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        long totalStreams = allStreams.size();
        long liveStreams = allStreams.stream().filter(s -> s.getStatus() == StreamStatus.LIVE).count();
        long offlineStreams = totalStreams - liveStreams;
        long totalActiveViewers = viewerService.getTotalActiveViewers(allStreams);
        long totalSessions = historyRepository.countByEventType("STARTED");
        long totalDuration = historyRepository.sumTotalDurationSeconds();

        Map<Long, LiveStream> streamById = allStreams.stream()
                .collect(Collectors.toMap(LiveStream::getId, Function.identity()));

        List<StreamAnalytics.RecentStreamSummary> recentStreams = allStreams.stream()
                .sorted((a, b) -> {
                    if (a.getStatus() != b.getStatus()) {
                        return a.getStatus() == StreamStatus.LIVE ? -1 : 1;
                    }
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .limit(10)
                .map(s -> new StreamAnalytics.RecentStreamSummary(
                        s.getId(),
                        s.getStreamId(),
                        s.getTitle(),
                        s.getStatus(),
                        viewerService.getActiveViewerCount(s.getStreamId()),
                        s.getStartedAt(),
                        s.getCreatedAt()
                ))
                .toList();

        List<StreamAnalytics.ActivityItem> recentActivity = historyRepository.findTop20ByOrderByEventTimeDesc()
                .stream()
                .map(h -> toActivityItem(h, streamById.get(h.getStreamId())))
                .toList();

        return new StreamAnalytics.DashboardStats(
                totalStreams,
                liveStreams,
                offlineStreams,
                totalActiveViewers,
                totalSessions,
                totalDuration,
                recentStreams,
                recentActivity
        );
    }

    public List<StreamAnalytics.StreamSummaryStats> getAllStreamStats() {
        List<LiveStream> streams = streamRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        return streams.stream().map(this::buildStreamSummary).toList();
    }

    public StreamAnalytics.StreamDetailAnalytics getStreamAnalytics(String idOrStreamId) {
        LiveStream stream = streamService.findStreamByIdOrStreamId(idOrStreamId);
        StreamAnalytics.StreamSummaryStats summary = buildStreamSummary(stream);
        List<StreamAnalytics.ActivityItem> history = historyRepository.findByStreamIdOrderByEventTimeDesc(stream.getId())
                .stream()
                .map(h -> toActivityItem(h, stream))
                .toList();
        return new StreamAnalytics.StreamDetailAnalytics(summary, history);
    }

    private StreamAnalytics.StreamSummaryStats buildStreamSummary(LiveStream stream) {
        List<StreamHistory> events = historyRepository.findByStreamIdOrderByEventTimeDesc(stream.getId());
        long sessions = events.stream().filter(e -> "STARTED".equals(e.getEventType())).count();
        long duration = historyRepository.sumDurationSecondsByStreamId(stream.getId());
        long viewers = viewerService.getActiveViewerCount(stream.getStreamId());
        return new StreamAnalytics.StreamSummaryStats(
                stream.getId(),
                stream.getStreamId(),
                stream.getTitle(),
                stream.getStatus(),
                viewers,
                sessions,
                duration,
                stream.getStartedAt(),
                stream.getEndedAt()
        );
    }

    private StreamAnalytics.ActivityItem toActivityItem(StreamHistory history, LiveStream stream) {
        return new StreamAnalytics.ActivityItem(
                history.getId(),
                history.getStreamId(),
                stream != null ? stream.getStreamId() : "unknown",
                stream != null ? stream.getTitle() : "Deleted Stream",
                history.getEventType(),
                history.getEventTime(),
                history.getDurationSeconds()
        );
    }
}
