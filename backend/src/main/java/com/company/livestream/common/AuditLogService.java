package com.company.livestream.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private static final Logger auditLogger = LoggerFactory.getLogger("AUDIT");

    public void logAdminAction(String actor, String action, String target, String details) {
        auditLogger.info("AUDIT actor={} action={} target={} details={}",
                actor != null ? actor : "SYSTEM",
                action,
                target,
                details != null ? details : "");
    }
}
