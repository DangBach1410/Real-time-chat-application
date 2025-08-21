package greenwich.chatapp.authservice.service;

import greenwich.chatapp.authservice.dto.request.UpdateRequest;
import greenwich.chatapp.authservice.dto.response.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import greenwich.chatapp.authservice.dto.request.RegisterRequest;
import greenwich.chatapp.authservice.dto.response.RegisterResponse;
import greenwich.chatapp.authservice.entity.UserEntity;
import greenwich.chatapp.authservice.enums.Role;
import greenwich.chatapp.authservice.repository.UserRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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

        // Create a new UserEntity and set its properties
        UserEntity newUser = UserEntity.builder()
                .username(username)
                .firstName(firstName)
                .lastName(lastName)
                .fullName(firstName + " " + lastName)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(Role.valueOf(role.toUpperCase()))
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
                    .message("User not found")
                    .build();
        }

        UserEntity user = userEntity.get();
        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("User found")
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
                    .message("User not found")
                    .build();
        }

        UserEntity user = userEntity.get();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setFullName(request.getFirstName() + " " + request.getLastName());
        user.setEmail(request.getEmail());
        user.setImageUrl(request.getImageUrl());

        userRepository.save(user);

        return UserResponse.builder()
                .status(HttpStatus.OK.value())
                .message("User updated successfully")
                .fullName(user.getFullName())
                .email(user.getEmail())
                .imageUrl(user.getImageUrl())
                .build();
    }
}

