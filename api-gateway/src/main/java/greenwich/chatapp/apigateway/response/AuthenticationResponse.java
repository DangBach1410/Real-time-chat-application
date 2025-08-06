package greenwich.chatapp.apigateway.response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthenticationResponse {
    private int status;
    private String message;
}
