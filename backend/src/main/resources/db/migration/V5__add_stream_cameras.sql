CREATE TABLE stream_cameras (
    id VARCHAR(36) PRIMARY KEY,
    stream_id BIGINT NOT NULL,
    label VARCHAR(100) NOT NULL,
    stream_key_hash VARCHAR(255) NOT NULL,
    CONSTRAINT fk_camera_stream FOREIGN KEY (stream_id) REFERENCES live_streams(id) ON DELETE CASCADE
);

ALTER TABLE live_streams ADD COLUMN director_camera_id VARCHAR(36);
