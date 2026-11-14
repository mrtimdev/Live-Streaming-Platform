package com.company.livestream.mediamtx;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class PublishingPaths {
    private volatile Set<String> ready = Set.of();

    public Set<String> ready() {
        return ready;
    }

    void update(Set<String> paths) {
        ready = Set.copyOf(paths);
    }
}
