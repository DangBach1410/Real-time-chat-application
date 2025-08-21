package greenwich.chatapp.authservice.controller;

import greenwich.chatapp.authservice.dto.request.UpdateRequest;
import greenwich.chatapp.authservice.dto.response.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import greenwich.chatapp.authservice.dto.request.RegisterRequest;
import greenwich.chatapp.authservice.dto.response.RegisterResponse;
import greenwich.chatapp.authservice.service.UserService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth/users")
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@RequestBody @Valid RegisterRequest request) {
        RegisterResponse response = userService.registerUser(request);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable String id) {
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable String id, @RequestBody @Valid UpdateRequest request) {
        UserResponse response = userService.updateUser(id, request);
        return ResponseEntity.status(response.getStatus()).body(response);
    }
}
