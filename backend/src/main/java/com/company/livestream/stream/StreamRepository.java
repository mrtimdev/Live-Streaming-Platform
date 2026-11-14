package com.company.livestream.stream;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StreamRepository extends JpaRepository<LiveStream, Long> {

    Optional<LiveStream> findByStreamId(String streamId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM LiveStream s WHERE s.id = :id")
    Optional<LiveStream> lockById(@Param("id") Long id);

    boolean existsByStreamId(String streamId);

    List<LiveStream> findByStatusOrderByStartedAtDesc(StreamStatus status);

    long countByStatus(StreamStatus status);

    @Query("""
            SELECT s FROM LiveStream s
            WHERE (:status IS NULL OR s.status = :status)
              AND (:search IS NULL OR LOWER(s.title) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(s.streamId) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<LiveStream> searchStreams(
            @Param("status") StreamStatus status,
            @Param("search") String search,
            Pageable pageable
    );
}
