package greenwich.chatapp.chatservice.dto.request;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationAddMemberRequest {
    private List<MemberRequest> members;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberRequest {
        private String userId;
        private String displayName;
        private String avatar;
        private String role;
    }
}

