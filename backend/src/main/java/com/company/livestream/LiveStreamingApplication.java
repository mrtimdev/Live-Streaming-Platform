package com.company.livestream;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LiveStreamingApplication {

    public static void main(String[] args) {
        SpringApplication.run(LiveStreamingApplication.class, args);
    }
}
