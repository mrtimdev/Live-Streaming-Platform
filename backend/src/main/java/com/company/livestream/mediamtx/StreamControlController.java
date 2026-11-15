package com.company.livestream.mediamtx;

import com.company.livestream.common.ApiResponse;
import com.company.livestream.stream.StreamService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/streams/{id}/control")
public class StreamControlController {
    private final StreamService streams;
    private final StreamControlService controls;

    public StreamControlController(StreamService streams, StreamControlService controls) {
        this.streams = streams;
        this.controls = controls;
    }

    @GetMapping("/health")
    public ApiResponse<StreamControlService.StreamHealthResponse> health(@PathVariable String id) {
        return ApiResponse.ok(controls.getHealth(streams.findStreamByIdOrStreamId(id).getStreamId()));
    }

    @PostMapping("/disconnect")
    public ApiResponse<Void> disconnect(@PathVariable String id, @Valid @RequestBody Disconnect request, Principal actor) {
        controls.disconnect(streams.findStreamByIdOrStreamId(id).getStreamId(), request.cameraId(), request.sourceId(), actor.getName());
        return ApiResponse.ok("Publisher disconnected", null);
    }

    public record Disconnect(
            @Pattern(regexp = "[a-zA-Z0-9-]{1,64}") String cameraId,
            @NotBlank @Pattern(regexp = "[a-zA-Z0-9-]{1,64}") String sourceId) {}
}
