package com.company.livestream.mediamtx;

import com.company.livestream.exception.BadRequestException;
import com.company.livestream.security.JwtTokenProvider;
import com.company.livestream.stream.StreamService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/streams/{id}/browser-broadcast")
public class BrowserBroadcastController {
    private static final MediaType SDP = MediaType.parseMediaType("application/sdp");
    private final StreamService streams;
    private final PublishingPaths publishingPaths;
    private final JwtTokenProvider tokens;
    private final StreamControlService streamControlService;
    private final RestClient whip;

    public BrowserBroadcastController(StreamService streams, PublishingPaths publishingPaths, JwtTokenProvider tokens,
                                      StreamControlService streamControlService,
                                      @Value("${MEDIAMTX_WEBRTC_URL:http://mediamtx:8889}") String whipUrl) {
        this.streams = streams;
        this.publishingPaths = publishingPaths;
        this.tokens = tokens;
        this.streamControlService = streamControlService;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2_000);
        factory.setReadTimeout(10_000);
        this.whip = RestClient.builder().baseUrl(whipUrl).requestFactory(factory).build();
    }

    @PostMapping(consumes = "application/sdp", produces = "application/sdp")
    public ResponseEntity<String> start(@PathVariable String id, @RequestBody String offer) {
        String streamId = streams.findStreamByIdOrStreamId(id).getStreamId();
        if (offer.length() > 65_536 || !offer.startsWith("v=0")) {
            throw new BadRequestException("Invalid WebRTC offer");
        }
        if (streamControlService.isLocked(streamId)) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Publishing is locked by an administrator");
        }
        if (publishingPaths.ready().contains(streamId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The main feed already has a publisher");
        }

        try {
            var result = whip.post()
                    .uri("/live/{id}/whip", streamId)
                    .headers(headers -> headers.setBasicAuth("browser", tokens.generateBrowserPublishToken(streamId)))
                    .contentType(SDP)
                    .body(offer)
                    .retrieve()
                    .toEntity(String.class);
            URI location = result.getHeaders().getLocation();
            String prefix = "/live/" + streamId + "/whip/";
            if (location == null || !location.getPath().startsWith(prefix) || result.getBody() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Invalid response from the streaming server");
            }
            UUID session = UUID.fromString(location.getPath().substring(prefix.length()));
            return ResponseEntity.created(URI.create("/api/streams/" + streamId + "/browser-broadcast/" + session))
                    .contentType(SDP)
                    .body(result.getBody());
        } catch (RestClientResponseException ex) {
            HttpStatus status = ex.getStatusCode().is4xxClientError() ? HttpStatus.BAD_REQUEST : HttpStatus.BAD_GATEWAY;
            throw new ResponseStatusException(status, "The streaming server could not start the camera feed");
        } catch (RestClientException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The streaming server could not start the camera feed");
        }
    }

    @DeleteMapping("/{session}")
    public ResponseEntity<Void> stop(@PathVariable String id, @PathVariable UUID session) {
        String streamId = streams.findStreamByIdOrStreamId(id).getStreamId();
        try {
            whip.delete().uri("/live/{id}/whip/{session}", streamId, session).retrieve().toBodilessEntity();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() != 404) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not close the camera session");
            }
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not close the camera session");
        }
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Void> handlePublishError(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).build();
    }
}
