package com.company.livestream.viewer;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ViewerSessionRepository extends JpaRepository<ViewerSession, Long> {
    Optional<ViewerSession> findByStreamIdAndSessionId(Long streamId, String sessionId);
    long countByStreamId(Long streamId);
}
