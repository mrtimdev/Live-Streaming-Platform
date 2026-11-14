package com.company.livestream.history;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class HistoryService {

    private final HistoryRepository historyRepository;

    public HistoryService(HistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    @Transactional
    public void recordStarted(Long streamId, LocalDateTime eventTime) {
        StreamHistory entry = new StreamHistory();
        entry.setStreamId(streamId);
        entry.setEventType("STARTED");
        entry.setEventTime(eventTime != null ? eventTime : LocalDateTime.now(ZoneOffset.UTC));
        historyRepository.save(entry);
    }

    @Transactional
    public void recordStopped(Long streamId, LocalDateTime eventTime, Long durationSeconds) {
        StreamHistory entry = new StreamHistory();
        entry.setStreamId(streamId);
        entry.setEventType("STOPPED");
        entry.setEventTime(eventTime != null ? eventTime : LocalDateTime.now(ZoneOffset.UTC));
        entry.setDurationSeconds(durationSeconds != null ? Math.max(0L, durationSeconds) : 0L);
        historyRepository.save(entry);
    }

    public List<StreamHistory> getStreamHistory(Long streamId) {
        return historyRepository.findByStreamIdOrderByEventTimeDesc(streamId);
    }

    public List<StreamHistory> getRecentActivity() {
        return historyRepository.findTop20ByOrderByEventTimeDesc();
    }
}
