package com.company.livestream.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class MediaMtxConfig {

    @Value("${app.mediamtx.api-url}")
    private String apiUrl;

    @Value("${app.mediamtx.connect-timeout-ms:2000}")
    private int connectTimeoutMs;

    @Value("${app.mediamtx.read-timeout-ms:3000}")
    private int readTimeoutMs;

    @Bean
    public RestClient mediaMtxRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);

        return RestClient.builder()
                .baseUrl(apiUrl)
                .requestFactory(factory)
                .build();
    }
}
