package greenwich.chatapp.authservice.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import greenwich.chatapp.authservice.enums.Role;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "users")
public class UserEntity {

    @Id
    private String id;

    private String username;
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String accessToken;
    private String refreshToken;
    private Role role;
}
