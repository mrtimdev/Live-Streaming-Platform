package com.company.livestream.stream;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "stream_cameras")
public class StreamCamera {
    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "stream_id", nullable = false)
    private Long streamId;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(name = "stream_key_hash", nullable = false, length = 255)
    private String streamKeyHash;

    protected StreamCamera() {
    }

    StreamCamera(Long streamId, String label, String streamKeyHash) {
        this.id = UUID.randomUUID().toString();
        this.streamId = streamId;
        this.label = label;
        this.streamKeyHash = streamKeyHash;
    }

    public String getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public String getStreamKeyHash() {
        return streamKeyHash;
    }

    void setStreamKeyHash(String streamKeyHash) {
        this.streamKeyHash = streamKeyHash;
    }

    String publishingPath(String streamId) {
        return streamId + "/" + id;
    }
}
