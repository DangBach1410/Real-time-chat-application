package greenwich.chatapp.authservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import greenwich.chatapp.authservice.dto.request.LoginRequest;
import greenwich.chatapp.authservice.dto.response.LoginResponse;
import greenwich.chatapp.authservice.entity.UserEntity;
import greenwich.chatapp.authservice.repository.UserRepository;

import java.util.Optional;

@RequiredArgsConstructor
@Service
public class AuthenticationService {
    private static final int TOKEN_INDEX = 7;

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public LoginResponse login(LoginRequest loginRequest) {
        String username = loginRequest.getUsername();
        String password = loginRequest.getPassword();

        Optional<UserEntity> userEntityByUsername = userRepository.findByUsername(username);
        if (userEntityByUsername.isEmpty()) {
            return LoginResponse.builder()
                    .status(404)
                    .message("User not found")
                    .build();
        }

        UsernamePasswordAuthenticationToken usernamePasswordAuthenticationToken = new UsernamePasswordAuthenticationToken(username, password);
        authenticationManager.authenticate(usernamePasswordAuthenticationToken);

        UserEntity userEntity = userEntityByUsername.get();
        String accessToken = jwtService.generateAccessToken(userEntity);
        String refreshToken = jwtService.generateRefreshToken(userEntity);

        userEntity.setAccessToken(accessToken);
        userEntity.setRefreshToken(refreshToken);

        userRepository.save(userEntity);

        return LoginResponse.builder()
                .status(HttpStatus.OK.value())
                .message("Login successful")
                .userId(userEntity.getId())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    public LoginResponse refreshToken(String authHeader) {
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            return LoginResponse.builder()
                    .status(HttpStatus.UNAUTHORIZED.value())
                    .message("Invalid token")
                    .build();
        }

        String refreshToken = authHeader.substring(TOKEN_INDEX);
        if( !jwtService.validateToken(refreshToken)) {
            return LoginResponse.builder()
                    .status(HttpStatus.UNAUTHORIZED.value())
                    .message("Invalid refresh token")
                    .build();
        }

        String username = jwtService.extractUsername(refreshToken);

        Optional<UserEntity> userFoundByUsername = userRepository.findByUsername(username);
        if (userFoundByUsername.isEmpty()) {
            return LoginResponse.builder()
                    .status(HttpStatus.UNAUTHORIZED.value())
                    .message("Token revoked")
                    .build();
        }

        UserEntity userEntity = userFoundByUsername.get();
        String accessToken = jwtService.generateAccessToken(userEntity);
        String newRefreshToken = jwtService.generateRefreshToken(userEntity);

        userEntity.setAccessToken(accessToken);
        userEntity.setRefreshToken(newRefreshToken);
        userRepository.save(userEntity);

        //Response access token and refresh token to client
        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRefreshToken)
                .userId(userEntity.getId())
                .message("Refresh token successfully")
                .status(HttpStatus.OK.value())
                .build();
    }
}
