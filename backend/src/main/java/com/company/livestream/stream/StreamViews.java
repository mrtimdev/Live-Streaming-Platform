package com.company.livestream.stream;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record StreamViews(String directorCameraId, Feed program, List<Feed> cameras) {
    public record Feed(String id, String label, boolean live, String hlsUrl) {
    }

    public record CameraRequest(@NotBlank @Size(max = 100) String label) {
    }

    public record DirectorRequest(@Size(max = 36) String cameraId) {
    }

    public record CameraCredentials(String cameraId, String publishingPath, String obsServerUrl, String obsStreamKey) {
    }

    public Feed directorFeed() {
        return cameras.stream()
                .filter(camera -> camera.live() && camera.id().equals(directorCameraId))
                .findFirst()
                .orElseGet(() -> program.live() ? program : cameras.stream()
                        .filter(Feed::live).findFirst().orElse(program));
    }
}
