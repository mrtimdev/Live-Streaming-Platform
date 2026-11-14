package com.company.livestream.common;

public final class Constants {

    private Constants() {
    }

    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_USER = "USER";

    public static final String USER_STATUS_ACTIVE = "ACTIVE";
    public static final String USER_STATUS_DISABLED = "DISABLED";

    public static final String REDIS_STREAM_VIEWERS_KEY_PREFIX = "stream:";
    public static final String REDIS_STREAM_VIEWERS_KEY_SUFFIX = ":viewers";
    public static final String REDIS_STREAM_STATUS_KEY_PREFIX = "stream:status:";
    public static final String REDIS_REFRESH_TOKEN_PREFIX = "auth:refresh:";

    public static String viewerSetKey(String streamId) {
        return REDIS_STREAM_VIEWERS_KEY_PREFIX + streamId + REDIS_STREAM_VIEWERS_KEY_SUFFIX;
    }

    public static String streamStatusKey(String streamId) {
        return REDIS_STREAM_STATUS_KEY_PREFIX + streamId;
    }
}
