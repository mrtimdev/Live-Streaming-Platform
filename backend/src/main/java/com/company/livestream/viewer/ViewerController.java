package com.company.livestream.viewer;

import com.company.livestream.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/streams")
public class ViewerController {

    private final ViewerService viewerService;

    public ViewerController(ViewerService viewerService) {
        this.viewerService = viewerService;
    }

    @PostMapping("/{id}/heartbeat")
    public ResponseEntity<ApiResponse<ViewerHeartbeat.Response>> heartbeat(
            @PathVariable String id,
            @Valid @RequestBody ViewerHeartbeat.Request request) {
        return ResponseEntity.ok(ApiResponse.ok(viewerService.recordHeartbeat(id, request.sessionId())));
    }

    @DeleteMapping("/{id}/heartbeat")
    public ResponseEntity<ApiResponse<ViewerHeartbeat.Response>> disconnect(
            @PathVariable String id,
            @RequestParam(required = false) String sessionId,
            @RequestBody(required = false) ViewerHeartbeat.Request body) {
        String resolvedSessionId = sessionId != null ? sessionId : (body != null ? body.sessionId() : null);
        return ResponseEntity.ok(ApiResponse.ok(viewerService.removeViewer(id, resolvedSessionId)));
    }
}
