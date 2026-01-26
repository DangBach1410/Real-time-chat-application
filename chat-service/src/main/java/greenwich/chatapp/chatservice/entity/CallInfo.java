package greenwich.chatapp.chatservice.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallInfo {
    private String conversationId;
    private String type; // "audio" or "video"
    private String startedBy;
    private long startedByAgoraUid; // Numeric Agora UID of the caller
    private LocalDateTime startedAt;
    @Builder.Default
    private List<String> participants = new ArrayList<>(); // String user IDs
    @Builder.Default
    private Map<String, Long> participantAgoraUids = new HashMap<>(); // userId -> agoraUid mapping
    private boolean active;
}


