package greenwich.chatapp.chatservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API response for call initialization.
 * 
 * Contains all information needed for frontends (Web & Mobile) to:
 * 1. Join the Agora channel with numeric UID
 * 2. Identify the caller
 * 3. Establish WebSocket connection if needed
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallResponse {
    
    /** Agora channel name to join */
    private String channel;
    
    /** Numeric Agora UID (uint32) - same for all platforms */
    private long agoraUid;
    
    /** Optional: Agora token (if authentication enabled) */
    private String token;
    
    /** Call type: "audio" or "video" */
    private String type;
    
    /** Caller's user ID (string) - for UI/logging */
    private String callerId;
    
    /** Caller's full name */
    private String callerName;
    
    /** Caller's avatar URL */
    private String callerImage;
}
