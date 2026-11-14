package com.company.livestream.history;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface HistoryRepository extends JpaRepository<StreamHistory, Long> {
    List<StreamHistory> findByStreamIdOrderByEventTimeDesc(Long streamId);
    List<StreamHistory> findTop20ByOrderByEventTimeDesc();
    long countByEventType(String eventType);

    @Query("SELECT COALESCE(SUM(h.durationSeconds), 0) FROM StreamHistory h WHERE h.eventType = 'STOPPED'")
    long sumTotalDurationSeconds();

    @Query("SELECT COALESCE(SUM(h.durationSeconds), 0) FROM StreamHistory h WHERE h.streamId = :streamId AND h.eventType = 'STOPPED'")
    long sumDurationSecondsByStreamId(Long streamId);
}
