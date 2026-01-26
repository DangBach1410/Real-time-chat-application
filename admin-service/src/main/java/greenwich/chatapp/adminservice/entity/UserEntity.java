package greenwich.chatapp.adminservice.entity;

import greenwich.chatapp.adminservice.enums.Role;
import greenwich.chatapp.adminservice.enums.AuthProvider;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "users")
public class UserEntity implements UserDetails {
    @Id
    private String id;
    private String username;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String password;
    private Role role;
    private AuthProvider provider;
    private String providerId;
    private String imageUrl;
    private String language;
    private String languageCode;

    // 🔹 Chỉ cần cho fullName
    private String searchFullName;

    private List<Friend> friends = new ArrayList<>();
    private List<FriendRequest> friendRequests = new ArrayList<>();
    private boolean banned = false;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Friend {
        private String id;
        private String fullName;
        private String email;
        private String imageUrl;
        private String searchFullName;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FriendRequest {
        private String senderId;
        private String senderFullName;
        private String senderEmail;
        private String senderImageUrl;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(() -> "ROLE_" + role.name());
    }
}


