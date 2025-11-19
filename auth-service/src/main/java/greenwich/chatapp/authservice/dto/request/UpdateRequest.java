package greenwich.chatapp.authservice.dto.request;

public class UpdateRequest {
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String language;
    private String languageCode;

    public String getFirstName() {
        return firstName != null ? firstName.trim() : null;
    }

    public String getLastName() {
        return lastName != null ? lastName.trim() : null;
    }

    public String getFullName() {
        return fullName != null ? fullName.trim() : null;
    }

    public String getEmail() {
        return email != null ? email.trim() : null;
    }

    public String getLanguage() {
        return language != null ? language.trim() : null;
    }

    public String getLanguageCode() {
        return languageCode != null ? languageCode.trim() : null;
    }
}
