package com.company.livestream.stream;

import com.company.livestream.exception.BadRequestException;
import com.company.livestream.exception.ResourceNotFoundException;
import com.company.livestream.mediamtx.PublishingPaths;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class StreamCameraService {
    private final StreamRepository streamRepository;
    private final StreamCameraRepository cameraRepository;
    private final StreamKeyService keys;
    private final StreamMapper mapper;
    private final PublishingPaths publishingPaths;

    public StreamCameraService(StreamRepository streamRepository, StreamCameraRepository cameraRepository,
                               StreamKeyService keys, StreamMapper mapper, PublishingPaths publishingPaths) {
        this.streamRepository = streamRepository;
        this.cameraRepository = cameraRepository;
        this.keys = keys;
        this.mapper = mapper;
        this.publishingPaths = publishingPaths;
    }

    public StreamViews getViews(LiveStream stream) {
        String streamId = stream.getStreamId();
        Set<String> ready = publishingPaths.ready();
        List<StreamViews.Feed> cameras = cameraRepository.findByStreamIdOrderByLabelAscIdAsc(stream.getId())
                .stream()
                .map(camera -> {
                    String path = camera.publishingPath(streamId);
                    return new StreamViews.Feed(camera.getId(), camera.getLabel(), ready.contains(path),
                            mapper.buildHlsUrl(path));
                })
                .toList();
        boolean programLive = ready.contains(streamId);
        StreamViews.Feed program = new StreamViews.Feed(null, "OBS program", programLive, mapper.buildHlsUrl(streamId));
        return new StreamViews(stream.getDirectorCameraId(), program, cameras);
    }

    @Transactional
    public StreamViews.CameraCredentials add(Long streamId, StreamViews.CameraRequest request) {
        LiveStream stream = lockStream(streamId);
        String key = keys.generateRawStreamKey();
        StreamCamera camera = cameraRepository.save(new StreamCamera(streamId, request.label().strip(), keys.hashStreamKey(key)));
        return credentials(stream, camera, key);
    }

    @Transactional
    public StreamViews.CameraCredentials regenerate(Long streamId, String cameraId) {
        LiveStream stream = lockStream(streamId);
        StreamCamera camera = findCamera(streamId, cameraId);
        String key = keys.generateRawStreamKey();
        camera.setStreamKeyHash(keys.hashStreamKey(key));
        return credentials(stream, camera, key);
    }

    @Transactional
    public void remove(Long streamId, String cameraId) {
        LiveStream stream = lockStream(streamId);
        StreamCamera camera = findCamera(streamId, cameraId);
        if (publishingPaths.ready().contains(camera.publishingPath(stream.getStreamId()))) {
            throw new BadRequestException("Stop publishing this camera before removing it");
        }
        if (cameraId.equals(stream.getDirectorCameraId())) {
            stream.setDirectorCameraId(null);
        }
        cameraRepository.delete(camera);
    }

    @Transactional
    public StreamViews selectDirector(Long streamId, String cameraId) {
        LiveStream stream = lockStream(streamId);
        if (cameraId != null) {
            findCamera(streamId, cameraId);
        }
        stream.setDirectorCameraId(cameraId);
        return getViews(stream);
    }

    private LiveStream lockStream(Long streamId) {
        return streamRepository.lockById(streamId)
                .orElseThrow(() -> new ResourceNotFoundException("Stream not found"));
    }

    private StreamCamera findCamera(Long streamId, String cameraId) {
        return cameraRepository.findByStreamIdAndId(streamId, cameraId)
                .orElseThrow(() -> new ResourceNotFoundException("Camera not found"));
    }

    private StreamViews.CameraCredentials credentials(LiveStream stream, StreamCamera camera, String key) {
        String path = camera.publishingPath(stream.getStreamId());
        return new StreamViews.CameraCredentials(camera.getId(), path, mapper.getRtmpPublicUrl(),
                mapper.buildObsStreamKey(path, key));
    }
}
