package greenwich.chatapp.authservice.oauth2.handler;

import greenwich.chatapp.authservice.entity.UserEntity;
import greenwich.chatapp.authservice.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import greenwich.chatapp.authservice.oauth2.repository.HttpCookieOAuthorizationRequestRepository;
import greenwich.chatapp.authservice.oauth2.user.UserPrincipal;
import greenwich.chatapp.authservice.oauth2.util.CookieUtils;
import greenwich.chatapp.authservice.service.JwtService;

import java.io.IOException;
import java.net.URI;
import java.util.Arrays;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    @Value("${app.oauth2.authorizedRedirectUris}")
    private String authorizedRedirectUris;

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final HttpCookieOAuthorizationRequestRepository httpCookieOAuthorizationRequestRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        String targetUrl = determineTargetUrl(request, response, authentication);

        if (response.isCommitted()) {
            return;
        }
        clearAuthenticationAttributes(request, response);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    @Override
    protected String determineTargetUrl(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        Optional<String> redirectUri = CookieUtils.getCookie(request, HttpCookieOAuthorizationRequestRepository.REDIRECT_URI_PARAM_COOKIE_NAME)
                .map(Cookie::getValue);
        // Validate that the requested redirect URI is in our whitelist
        if (redirectUri.isPresent() && !isAuthorizedRedirectUri(redirectUri.get())) {
            throw new RuntimeException("Unauthorized Redirect URI");
        }
        String targetUrl = redirectUri.orElse(getDefaultTargetUrl());

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        String accessToken = jwtService.generateAccessToken(userPrincipal);
        String refreshToken = jwtService.generateRefreshToken(userPrincipal);

        Optional<UserEntity> user = userRepository.findByEmail(userPrincipal.getEmail());
        String userId = user.map(UserEntity::getId).orElse("");

        return UriComponentsBuilder.fromUriString(targetUrl)
                .queryParam("accessToken", accessToken)
                .queryParam("refreshToken", refreshToken)
                .queryParam("userId", userId)
                .build().toString();
    }
    private boolean isAuthorizedRedirectUri(String uri) {
        // Split the comma-separated list from properties and check if the URI matches
        return Arrays.stream(authorizedRedirectUris.split(","))
                .anyMatch(authorizedUri -> {
                    // Only validate host and port to allow dynamic sub-paths if necessary
                    URI authorizedURI = URI.create(authorizedUri);
                    URI clientRedirectURI = URI.create(uri);
                    return authorizedURI.getScheme().equalsIgnoreCase(clientRedirectURI.getScheme())
                            && authorizedURI.getHost().equalsIgnoreCase(clientRedirectURI.getHost())
                            && authorizedURI.getPort() == clientRedirectURI.getPort();
                });
    }

    protected void clearAuthenticationAttributes(HttpServletRequest request, HttpServletResponse response) {
        super.clearAuthenticationAttributes(request);
        httpCookieOAuthorizationRequestRepository.removeAuthorizationRequest(request, response);
    }
}
