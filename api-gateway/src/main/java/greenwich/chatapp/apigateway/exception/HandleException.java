package greenwich.chatapp.apigateway.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import greenwich.chatapp.apigateway.response.AuthenticationResponse;

@RestControllerAdvice
public class HandleException {
    public ResponseEntity<Object> handleValidationException(ValidationException ex) {
        AuthenticationResponse authenticationResponse = new AuthenticationResponse(HttpStatus.UNAUTHORIZED.value(), ex.getMessage());
        return new ResponseEntity<>(authenticationResponse, HttpStatus.UNAUTHORIZED);
    }
}
