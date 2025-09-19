package greenwich.chatapp.authservice.controller;

import greenwich.chatapp.authservice.dto.request.ChangePasswordRequest;
import greenwich.chatapp.authservice.dto.request.UpdateRequest;
import greenwich.chatapp.authservice.dto.response.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import greenwich.chatapp.authservice.dto.request.RegisterRequest;
import greenwich.chatapp.authservice.service.UserService;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

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

    @PutMapping ("/{id}/change-password")
    public ResponseEntity<UserResponse> changePassword(@PathVariable String id, @RequestBody @Valid ChangePasswordRequest request) {
        UserResponse response = userService.changePassword(id, request);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PutMapping(value = "{id}/update-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> updateImage(
            @PathVariable String id,
            @RequestPart("file") MultipartFile file) {

        UserResponse response = userService.updateImage(id, file);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PostMapping("/{receiverId}/friend-requests")
    public ResponseEntity<FriendRequestResponse> sendFriendRequest(
            @PathVariable String receiverId,
            @RequestParam String senderId
    ) {
        FriendRequestResponse response = userService.sendFriendRequest(senderId, receiverId);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @PostMapping("/{receiverId}/friend-requests/{senderId}/accept")
    public ResponseEntity<AddFriendResponse> acceptFriendRequest(
            @PathVariable String receiverId,
            @PathVariable String senderId
    ) {
        AddFriendResponse response = userService.acceptFriendRequest(receiverId, senderId);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @DeleteMapping("/{receiverId}/friend-requests/{senderId}")
    public ResponseEntity<FriendRequestResponse> deleteFriendRequest(
            @PathVariable String receiverId,
            @PathVariable String senderId
    ) {
        FriendRequestResponse response = userService.deleteFriendRequest(receiverId, senderId);
        return ResponseEntity.status(response.getStatus()).body(response);
    }

    @GetMapping("/{id}/friends")
    public ResponseEntity<List<GetFriendResponse>> getFriends(@PathVariable String id) {
        return ResponseEntity.ok(userService.getFriends(id));
    }

    @GetMapping("/{id}/friend-requests")
    public ResponseEntity<List<GetFriendRequestResponse>> getFriendRequests(@PathVariable String id) {
        return ResponseEntity.ok(userService.getFriendRequests(id));
    }

    @DeleteMapping("/{userId}/friends/{friendId}")
    public ResponseEntity<Void> unfriend(
            @PathVariable String userId,
            @PathVariable String friendId
    ) {
        userService.unfriend(userId, friendId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<SearchUserResponse>> searchUsers(
            @RequestParam String currentUserId,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        List<SearchUserResponse> response = userService.searchUsers(currentUserId, keyword, pageable);
        return ResponseEntity.ok(response);
    }
}
