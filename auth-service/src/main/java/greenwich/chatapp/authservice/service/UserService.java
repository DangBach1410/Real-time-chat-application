package greenwich.chatapp.authservice.service;

import greenwich.chatapp.authservice.dto.request.ChangePasswordRequest;
import greenwich.chatapp.authservice.dto.request.ConversationCreateRequest;
import greenwich.chatapp.authservice.dto.request.UpdateRequest;
import greenwich.chatapp.authservice.dto.response.*;
import greenwich.chatapp.authservice.feignclient.ChatServiceClient;
import greenwich.chatapp.authservice.feignclient.MediaServiceClient;
import greenwich.chatapp.authservice.util.UnicodeUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import greenwich.chatapp.authservice.dto.request.RegisterRequest;
import greenwich.chatapp.authservice.entity.UserEntity;
import greenwich.chatapp.authservice.enums.Role;
import greenwich.chatapp.authservice.repository.UserRepository;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Update;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private static final String USER_NOT_FOUND = "User not found";
    private final UserRepository userRepository;
    private final ChatServiceClient chatServiceClient;
    private final MediaServiceClient mediaServiceClient;
    private final PasswordEncoder passwordEncoder;
    private final FriendAsyncService friendAsyncService;

    @Value("${default.avatar.url}")
    String defaultAvatarUrl;

    public RegisterResponse registerUser(RegisterRequest request) {
        String email = request.getEmail();
        String username = request.getUsername();
        String password = request.getPassword();
        String firstName = request.getFirstName();
        String lastName = request.getLastName();
        String role = request.getRole();

        Optional<UserEntity> userEntityByEmail = userRepository.findByEmail(email);
        Optional<UserEntity> userEntityByUsername = userRepository.findByUsername(username);

        if (userEntityByEmail.isPresent() || userEntityByUsername.isPresent()) {
            return RegisterResponse.builder()
                    .status(HttpStatus.BAD_REQUEST.value())
                    .message("User already exists!")
                    .build();
        }

        String fullName = firstName + " " + lastName;

        UserEntity newUser = UserEntity.builder()
                .username(username)
                .firstName(firstName)
                .lastName(lastName)
                .fullName(fullName)
                .email(email)
                .imageUrl(defaultAvatarUrl)
                .password(passwordEncoder.encode(password))
                .role(Role.valueOf(role.toUpperCase()))
                .searchFullName(UnicodeUtils.toSearchable(fullName))
                .build();

        userRepository.save(newUser);

        return RegisterResponse.builder()
                .status(HttpStatus.CREATED.value())
                .message("User registered successfully")
                .build();
    }

    public UserResponse getUserById(String id) {
        Optional<UserEntity> userEntity = userRepository.findById(id);

        if (userEntity.isEmpty()) {
            return UserResponse.builder()
                    .status(HttpStatus.NOT_FOUND.value())
                    .message(USER_NOT_FOUND)
                    .build();
        }

        UserEntity user = userEntity.get();
        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("User found")
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .imageUrl(user.getImageUrl())
                .build();
    }

        public UserResponse updateUser(String id, @Valid UpdateRequest request) {
            Optional<UserEntity> userEntity = userRepository.findById(id);

            if (userEntity.isEmpty()) {
                return UserResponse.builder()
                        .status(HttpStatus.NOT_FOUND.value())
                        .message(USER_NOT_FOUND)
                        .build();
            }

            Optional<UserEntity> userEntityByEmail = userRepository.findByEmail(request.getEmail());
            if (userEntityByEmail.isPresent() && !userEntityByEmail.get().getId().equals(id)) {
                return UserResponse.builder()
                        .status(HttpStatus.BAD_REQUEST.value())
                        .message("Email is already in use")
                        .build();
            }

            UserEntity user = userEntity.get();
            String fullName = request.getFirstName() + " " + request.getLastName();

            user.setFirstName(request.getFirstName());
            user.setLastName(request.getLastName());
            user.setFullName(fullName);
            user.setEmail(request.getEmail());
            user.setSearchFullName(UnicodeUtils.toSearchable(fullName));

            userRepository.save(user);
            friendAsyncService.updateFriendsAndRequestsInBackground(id, fullName, user.getImageUrl());
            chatServiceClient.updateConversations(id, fullName, user.getImageUrl());
            chatServiceClient.updateMessages(id, fullName, user.getImageUrl());

            return UserResponse.builder()
                    .status(HttpStatus.OK.value())
                    .message("User updated successfully")
                    .fullName(user.getFullName())
                    .email(user.getEmail())
                    .build();
        }

    public FriendRequestResponse sendFriendRequest(String senderId, String receiverId) {
        Optional<UserEntity> senderOpt = userRepository.findById(senderId);
        Optional<UserEntity> receiverOpt = userRepository.findById(receiverId);

        if (senderOpt.isEmpty() || receiverOpt.isEmpty()) {
            return FriendRequestResponse.builder()
                    .status(HttpStatus.NOT_FOUND.value())
                    .message("Sender or receiver not found")
                    .build();
        }

        UserEntity sender = senderOpt.get();
        UserEntity receiver = receiverOpt.get();

        boolean exists = receiver.getFriendRequests().stream()
                .anyMatch(req -> req.getSenderId().equals(sender.getId()));
        if (exists) {
            return FriendRequestResponse.builder()
                    .status(HttpStatus.BAD_REQUEST.value())
                    .message("Friend request already sent")
                    .build();
        }

        UserEntity.FriendRequest newRequest = UserEntity.FriendRequest.builder()
                .senderId(sender.getId())
                .senderFullName(sender.getFullName())
                .senderEmail(sender.getEmail())
                .senderImageUrl(sender.getImageUrl())
                .build();

        receiver.getFriendRequests().add(newRequest);
        userRepository.save(receiver);

        return FriendRequestResponse.builder()
                .status(HttpStatus.OK.value())
                .message("Friend request sent successfully")
                .senderId(sender.getId())
                .receiverId(receiver.getId())
                .build();
    }

    public AddFriendResponse acceptFriendRequest(String receiverId, String senderId) {
        Optional<UserEntity> receiverOpt = userRepository.findById(receiverId);
        Optional<UserEntity> senderOpt = userRepository.findById(senderId);

        if (receiverOpt.isEmpty() || senderOpt.isEmpty()) {
            return AddFriendResponse.builder()
                    .status(HttpStatus.NOT_FOUND.value())
                    .message("Sender or receiver not found")
                    .build();
        }

        UserEntity receiver = receiverOpt.get();
        UserEntity sender = senderOpt.get();

        // remove request from receiver side
        receiver.getFriendRequests().removeIf(req -> req.getSenderId().equals(senderId));

        // add each other as friends
        UserEntity.Friend f1 = UserEntity.Friend.builder()
                .id(sender.getId())
                .fullName(sender.getFullName())
                .email(sender.getEmail())
                .imageUrl(sender.getImageUrl())
                .searchFullName(sender.getSearchFullName())
                .build();

        UserEntity.Friend f2 = UserEntity.Friend.builder()
                .id(receiver.getId())
                .fullName(receiver.getFullName())
                .email(receiver.getEmail())
                .imageUrl(receiver.getImageUrl())
                .searchFullName(receiver.getSearchFullName())
                .build();

        receiver.getFriends().add(f1);
        sender.getFriends().add(f2);

        userRepository.save(receiver);
        userRepository.save(sender);

        ConversationCreateRequest conversation = ConversationCreateRequest.builder()
                .type("private")
                .members(List.of(
                        ConversationCreateRequest.MemberRequest.builder()
                                .userId(receiver.getId())
                                .fullName(receiver.getFullName())
                                .imageUrl(receiver.getImageUrl())
                                .role("member")
                                .build(),
                        ConversationCreateRequest.MemberRequest.builder()
                                .userId(sender.getId())
                                .fullName(sender.getFullName())
                                .imageUrl(sender.getImageUrl())
                                .role("member")
                                .build()
                ))
                .build();

        chatServiceClient.createConversation(conversation);

        return AddFriendResponse.builder()
                .status(HttpStatus.OK.value())
                .message("Friend request accepted & private conversation created")
                .friendId(sender.getId())
                .friendFullName(sender.getFullName())
                .friendEmail(sender.getEmail())
                .friendImageUrl(sender.getImageUrl())
                .build();
    }

    public FriendRequestResponse deleteFriendRequest(String receiverId, String senderId) {
        Optional<UserEntity> receiverOpt = userRepository.findById(receiverId);
        if (receiverOpt.isEmpty()) {
            return FriendRequestResponse.builder()
                    .status(HttpStatus.NOT_FOUND.value())
                    .message("Receiver not found")
                    .build();
        }

        UserEntity receiver = receiverOpt.get();
        boolean removed = receiver.getFriendRequests().removeIf(req -> req.getSenderId().equals(senderId));
        userRepository.save(receiver);

        if (!removed) {
            return FriendRequestResponse.builder()
                    .status(HttpStatus.BAD_REQUEST.value())
                    .message("No such friend request")
                    .build();
        }

        return FriendRequestResponse.builder()
                .status(HttpStatus.OK.value())
                .message("Friend request deleted")
                .senderId(senderId)
                .receiverId(receiverId)
                .build();
    }

    public List<GetFriendResponse> getFriends(String userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException(USER_NOT_FOUND));

        return user.getFriends().stream()
                .map(f -> new GetFriendResponse(
                        f.getId(),
                        f.getFullName(),
                        f.getEmail(),
                        f.getImageUrl()
                ))
                .toList();
    }

    public List<GetFriendRequestResponse> getFriendRequests(String userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException(USER_NOT_FOUND));

        return user.getFriendRequests().stream()
                .map(fr -> new GetFriendRequestResponse(
                        fr.getSenderId(),
                        fr.getSenderFullName(),
                        fr.getSenderEmail(),
                        fr.getSenderImageUrl()
                ))
                .toList();
    }

    public void unfriend(String userId, String friendId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        UserEntity friend = userRepository.findById(friendId)
                .orElseThrow(() -> new RuntimeException("User not found: " + friendId));

        // Xoá friendId khỏi user.friends
        user.setFriends(
                user.getFriends().stream()
                        .filter(f -> !f.getId().equals(friendId))
                        .toList()
        );

        // Xoá userId khỏi friend.friends
        friend.setFriends(
                friend.getFriends().stream()
                        .filter(f -> !f.getId().equals(userId))
                        .toList()
        );

        // Lưu lại
        userRepository.save(user);
        userRepository.save(friend);
    }

    public List<SearchUserResponse> searchUsers(String currentUserId, String keyword, Pageable pageable) {
        Optional<UserEntity> currentUserOpt = userRepository.findById(currentUserId);
        if (currentUserOpt.isEmpty()) {
            return List.of();
        }

        UserEntity currentUser = currentUserOpt.get();

        Set<String> friendIds = currentUser.getFriends().stream()
                .map(UserEntity.Friend::getId)
                .collect(Collectors.toSet());

        Set<String> incomingRequestIds = currentUser.getFriendRequests().stream()
                .map(UserEntity.FriendRequest::getSenderId)
                .collect(Collectors.toSet());

        List<SearchUserResponse> combined = new ArrayList<>();

        if (pageable.getPageNumber() == 0) {
            List<SearchUserResponse> friendMatches = currentUser.getFriends().stream()
                    .filter(f -> f.getSearchFullName().contains(UnicodeUtils.toSearchable(keyword))
                            || f.getEmail().contains(UnicodeUtils.toSearchable(keyword)))
                    .map(f -> new SearchUserResponse(f.getId(), f.getFullName(), f.getImageUrl(), f.getEmail(), "FRIEND"))
                    .toList();
            combined.addAll(friendMatches);
        }

        String normalizedKeyword = UnicodeUtils.toSearchable(keyword);

        Page<UserEntity> userPage = userRepository
                .findDistinctByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrSearchFullNameContainingIgnoreCase(
                        keyword, keyword, normalizedKeyword, pageable);

        List<SearchUserResponse> userMatches = userPage.getContent().stream()
                .filter(u -> !u.getId().equals(currentUserId))
                .filter(u -> !friendIds.contains(u.getId()))
                .map(u -> {
                    String status;
                    boolean sent = u.getFriendRequests().stream()
                            .anyMatch(req -> req.getSenderId().equals(currentUserId));

                    if (sent) {
                        status = "PENDING";
                    } else if (incomingRequestIds.contains(u.getId())) {
                        status = "REQUESTED";
                    } else {
                        status = "NONE";
                    }

                    return new SearchUserResponse(u.getId(), u.getFullName(), u.getImageUrl(), u.getEmail(), status);
                })
                .toList();

        combined.addAll(userMatches);
        return combined;
    }

    public UserResponse changePassword(String id, @Valid ChangePasswordRequest request) {
        Optional<UserEntity> userEntity = userRepository.findById(id);

        if (userEntity.isEmpty()) {
            return UserResponse.builder()
                    .status(HttpStatus.NOT_FOUND.value())
                    .message(USER_NOT_FOUND)
                    .build();
        }

        UserEntity user = userEntity.get();

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            return UserResponse.builder()
                    .status(HttpStatus.BAD_REQUEST.value())
                    .message("Old password is incorrect")
                    .build();
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return UserResponse.builder()
                    .status(HttpStatus.BAD_REQUEST.value())
                    .message("New password and confirm password do not match")
                    .build();
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("Password changed successfully")
                .build();
    }

    public UserResponse updateImage(String id, MultipartFile file) {
        Optional<UserEntity> userEntity = userRepository.findById(id);

        if (userEntity.isEmpty()) {
            return UserResponse.builder()
                    .status(HttpStatus.NOT_FOUND.value())
                    .message(USER_NOT_FOUND)
                    .build();
        }

        UserEntity user = userEntity.get();

        String imageUrl = mediaServiceClient.uploadFiles(List.of(file)).get(0).getUrl();
        if (imageUrl == null) {
            return UserResponse.builder()
                    .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                    .message("Failed to upload image")
                    .build();
        }

        user.setImageUrl(imageUrl);
        userRepository.save(user);
        friendAsyncService.updateFriendsAndRequestsInBackground(id, user.getFullName(), imageUrl);
        chatServiceClient.updateConversations(id, user.getFullName(), imageUrl);
        chatServiceClient.updateMessages(id, user.getFullName(), imageUrl);

        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("Image updated successfully")
                .imageUrl(imageUrl)
                .build();
    }
}
