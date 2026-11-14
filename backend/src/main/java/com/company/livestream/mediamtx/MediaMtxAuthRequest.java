package com.company.livestream.mediamtx;

public record MediaMtxAuthRequest(
        String user,
        String password,
        String ip,
        String action,
        String path,
        String protocol,
        String id,
        String query
) {
}
