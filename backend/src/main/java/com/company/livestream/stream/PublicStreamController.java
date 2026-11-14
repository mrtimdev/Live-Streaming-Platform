package com.company.livestream.stream;

import com.company.livestream.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/streams")
public class PublicStreamController {

    private final StreamService streamService;

    public PublicStreamController(StreamService streamService) {
        this.streamService = streamService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StreamDtos.PublicStreamResponse>>> listLiveStreams() {
        return ResponseEntity.ok(ApiResponse.ok(streamService.listPublicLiveStreams()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StreamDtos.PublicStreamResponse>> getPublicStream(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(streamService.getPublicStream(id)));
    }

    @GetMapping("/{id}/playback")
    public ResponseEntity<ApiResponse<StreamDtos.PlaybackResponse>> getPlayback(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(streamService.getPublicPlayback(id)));
    }
}
