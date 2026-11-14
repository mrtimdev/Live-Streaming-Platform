package com.company.livestream.stream;

import com.company.livestream.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/streams/{id}")
public class StreamCameraController {
    private final StreamService streamService;
    private final StreamCameraService cameraService;

    public StreamCameraController(StreamService streamService, StreamCameraService cameraService) {
        this.streamService = streamService;
        this.cameraService = cameraService;
    }

    @GetMapping("/views")
    public ApiResponse<StreamViews> views(@PathVariable String id) {
        return ApiResponse.ok(cameraService.getViews(streamService.findStreamByIdOrStreamId(id)));
    }

    @PostMapping("/cameras")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<StreamViews.CameraCredentials> add(@PathVariable String id,
                                                         @Valid @RequestBody StreamViews.CameraRequest request) {
        return ApiResponse.ok(cameraService.add(streamId(id), request));
    }

    @PostMapping("/cameras/{cameraId}/regenerate-key")
    public ApiResponse<StreamViews.CameraCredentials> regenerate(@PathVariable String id, @PathVariable String cameraId) {
        return ApiResponse.ok(cameraService.regenerate(streamId(id), cameraId));
    }

    @DeleteMapping("/cameras/{cameraId}")
    public ApiResponse<Void> remove(@PathVariable String id, @PathVariable String cameraId) {
        cameraService.remove(streamId(id), cameraId);
        return ApiResponse.ok("Camera removed", null);
    }

    @PutMapping("/director")
    public ApiResponse<StreamViews> selectDirector(@PathVariable String id,
                                                   @Valid @RequestBody StreamViews.DirectorRequest request) {
        return ApiResponse.ok(cameraService.selectDirector(streamId(id), request.cameraId()));
    }

    private Long streamId(String id) {
        return streamService.findStreamByIdOrStreamId(id).getId();
    }
}
