package com.company.livestream.analytics;

import com.company.livestream.stream.StreamStatus;

import java.time.LocalDateTime;
import java.util.List;

public final class StreamAnalytics {

    private StreamAnalytics() {
    }

    public record DashboardStats(
            long totalStreams,
            long liveStreams,
            long offlineStreams,
            long totalActiveViewers,
            long totalBroadcastSessions,
            long totalBroadcastDurationSeconds,
            List<RecentStreamSummary> recentStreams,
            List<ActivityItem> recentActivity
    ) {
    }

    public record RecentStreamSummary(
            Long id,
            String streamId,
            String title,
            StreamStatus status,
            long viewerCount,
            LocalDateTime startedAt,
            LocalDateTime createdAt
    ) {
    }

    public record ActivityItem(
            Long id,
            Long streamId,
            String streamCode,
            String streamTitle,
            String eventType,
            LocalDateTime eventTime,
            Long durationSeconds
    ) {
    }

    public record StreamSummaryStats(
            Long id,
            String streamId,
            String title,
            StreamStatus status,
            long activeViewers,
            long totalSessions,
            long totalDurationSeconds,
            LocalDateTime lastStartedAt,
            LocalDateTime lastEndedAt
    ) {
    }

    public record StreamDetailAnalytics(
            StreamSummaryStats summary,
            List<ActivityItem> history
    ) {
    }
}
