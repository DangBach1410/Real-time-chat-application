package greenwich.chatapp.authservice.dto.request;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationCreateRequest {
    private String type; // private | group
    private String name; // nếu group
    private List<MemberRequest> members;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MemberRequest {
        private String userId;
        private String fullName;
        private String imageUrl;
        private String role;
    }
}
