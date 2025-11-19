package greenwich.chatapp.authservice.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;

@AllArgsConstructor
public class RegisterRequest {
    @NotBlank(message = "Username must not be blank")
    @Pattern(regexp = "^[^@]*$", message = "Username cannot be an email address")
    private String username;

    @NotBlank(message = "First name must not be blank")
    private String firstName;

    @NotBlank(message = "Last name must not be blank")
    private String lastName;

    @Email(message = "Malformed email")
    @NotBlank(message = "Email must not be blank")
    private String email;

    @NotBlank(message = "Password must not be blank")
    private String password;

    @NotBlank(message = "Role cannot be blank")
    @Pattern(regexp = "ADMIN|MANAGER|USER", message = "The role must be ADMIN, MANAGER or USER")
    private String role;

    public String getEmail() { return email != null ? email.trim() : null; }
    public String getUsername() { return username != null ? username.trim() : null; }
    public String getPassword() { return password != null ? password.trim() : null; }
    public String getFirstName() { return firstName != null ? firstName.trim() : null; }
    public String getLastName() { return lastName != null ? lastName.trim() : null; }
    public String getRole() { return role != null ? role.trim() : null; }
}

