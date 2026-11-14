CREATE TABLE live_streams (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    stream_id VARCHAR(100) NOT NULL UNIQUE,
    stream_key_hash VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OFFLINE',
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME NULL,
    ended_at DATETIME NULL,
    CONSTRAINT fk_live_streams_user FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_live_streams_status (status),
    INDEX idx_live_streams_stream_id (stream_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
