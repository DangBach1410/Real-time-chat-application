package greenwich.chatapp.authservice.oauth2.service;

import greenwich.chatapp.authservice.enums.Role;
import greenwich.chatapp.authservice.util.UnicodeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import greenwich.chatapp.authservice.entity.UserEntity;
import greenwich.chatapp.authservice.oauth2.common.AuthProvider;
import greenwich.chatapp.authservice.oauth2.user.OAuth2UserInfo;
import greenwich.chatapp.authservice.oauth2.user.OAuth2UserInfoFactory;
import greenwich.chatapp.authservice.oauth2.user.UserPrincipal;
import greenwich.chatapp.authservice.repository.UserRepository;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        try {
            return processOAuth2User(userRequest, oAuth2User);
        } catch (Exception ex) {
            throw new InternalAuthenticationServiceException(ex.getMessage(), ex.getCause());
        }
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest oAuth2UserRequest, OAuth2User oAuth2User) {
        String registrationId = oAuth2UserRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = oAuth2User.getAttributes();
        OAuth2UserInfo oAuth2UserInfo = OAuth2UserInfoFactory.getOAuth2UserInfo(registrationId, attributes);

        Optional<UserEntity> userOptional = userRepository.findByEmail(oAuth2UserInfo.getEmail());

        UserEntity user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            user = updateExistingUser(user, oAuth2UserInfo, oAuth2UserRequest);
        } else {
            user = registerNewUser(oAuth2UserRequest, oAuth2UserInfo);
        }

        return UserPrincipal.create(user);
    }

    private UserEntity registerNewUser(OAuth2UserRequest oAuth2UserRequest, OAuth2UserInfo oAuth2UserInfo) {
        UserEntity user = new UserEntity();
        user.setUsername(oAuth2UserInfo.getEmail());
        user.setProvider(AuthProvider.valueOf(oAuth2UserRequest.getClientRegistration().getRegistrationId()));
        user.setProviderId(oAuth2UserInfo.getId());
        user.setFullName(oAuth2UserInfo.getName());
        user.setEmail(oAuth2UserInfo.getEmail());
        user.setImageUrl(oAuth2UserInfo.getImageUrl());
        user.setSearchFullName(UnicodeUtils.toSearchable(oAuth2UserInfo.getName()));
        user.setRole(Role.USER);
        return userRepository.save(user);
    }

    private UserEntity updateExistingUser(UserEntity existingUser, OAuth2UserInfo oAuth2UserInfo, OAuth2UserRequest oAuth2UserRequest) {
        existingUser.setFullName(oAuth2UserInfo.getName());
        existingUser.setProvider(AuthProvider.valueOf(oAuth2UserRequest.getClientRegistration().getRegistrationId()));
        existingUser.setProviderId(oAuth2UserInfo.getId());
        existingUser.setSearchFullName(UnicodeUtils.toSearchable(oAuth2UserInfo.getName()));
        return userRepository.save(existingUser);
    }
}