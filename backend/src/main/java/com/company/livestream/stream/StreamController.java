package com.company.livestream.stream;

import com.company.livestream.common.ApiResponse;
import com.company.livestream.history.StreamHistory;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/streams")
@PreAuthorize("hasRole('ADMIN')")
public class StreamController {

    private final StreamService streamService;

    public StreamController(StreamService streamService) {
        this.streamService = streamService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StreamDtos.StreamCredentialsResponse>> createStream(
            @Valid @RequestBody StreamDtos.CreateStreamRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        StreamDtos.StreamCredentialsResponse created = streamService.createStream(request, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Stream created", created));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<StreamDtos.StreamResponse>>> listStreams(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) StreamStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(ApiResponse.ok(streamService.listStreams(search, status, page, size, sortBy, sortDir)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StreamDtos.StreamResponse>> getStream(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(streamService.getStream(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StreamDtos.StreamResponse>> updateStream(
            @PathVariable String id,
            @Valid @RequestBody StreamDtos.UpdateStreamRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Stream updated",
                streamService.updateStream(id, request, principal.getUsername())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStream(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails principal) {
        streamService.deleteStream(id, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Stream deleted", null));
    }

    @PostMapping("/{id}/regenerate-key")
    public ResponseEntity<ApiResponse<StreamDtos.StreamCredentialsResponse>> regenerateKey(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Stream key regenerated",
                streamService.regenerateKey(id, principal.getUsername())));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<ApiResponse<List<StreamHistory>>> getStreamHistory(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(streamService.getStreamHistory(id)));
    }
}
