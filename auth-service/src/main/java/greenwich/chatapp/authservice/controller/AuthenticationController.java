package greenwich.chatapp.authservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import greenwich.chatapp.authservice.dto.request.LoginRequest;
import greenwich.chatapp.authservice.dto.response.LoginResponse;
import greenwich.chatapp.authservice.service.AuthenticationService;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/auth")
public class AuthenticationController {

    private final AuthenticationService authenticationService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest loginRequest) {
        LoginResponse loginResponse = authenticationService.login(loginRequest);
        return ResponseEntity
                .status(loginResponse.getStatus())
                .body(loginResponse);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<LoginResponse> refreshToken(@RequestHeader("Authorization") String authHeader) {
        LoginResponse response = authenticationService.refreshToken(authHeader);
        return ResponseEntity
                .status(response.getStatus())
                .body(response);
    }
}

