package com.company.livestream.stream;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StreamCameraRepository extends JpaRepository<StreamCamera, String> {
    List<StreamCamera> findByStreamIdOrderByLabelAscIdAsc(Long streamId);
    Optional<StreamCamera> findByStreamIdAndId(Long streamId, String id);
}
