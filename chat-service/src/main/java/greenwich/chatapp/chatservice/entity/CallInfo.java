package greenwich.chatapp.chatservice.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallInfo {
    private String conversationId;
    private String type; // "voice" hoặc "video"
    private String startedBy;
    private LocalDateTime startedAt;
    private List<String> participants = new ArrayList<>();
    private boolean active;
}

