package com.company.livestream.analytics;

import com.company.livestream.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<StreamAnalytics.DashboardStats>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getDashboardStats()));
    }

    @GetMapping("/streams")
    public ResponseEntity<ApiResponse<List<StreamAnalytics.StreamSummaryStats>>> streams() {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getAllStreamStats()));
    }

    @GetMapping("/streams/{id}")
    public ResponseEntity<ApiResponse<StreamAnalytics.StreamDetailAnalytics>> streamDetail(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.ok(analyticsService.getStreamAnalytics(id)));
    }
}
