package greenwich.chatapp.translationservice.service;

import greenwich.chatapp.translationservice.dto.MessageResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Service
public class TranslationService {

    @Value("${google.translate.api-key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public MessageResponse translateMessage(MessageResponse message, String targetLang) {
        if (!"text".equalsIgnoreCase(message.getType())) {
            return message;
        }

        String url = UriComponentsBuilder
                .fromUriString("https://translation.googleapis.com/language/translate/v2")
                .queryParam("key", apiKey)
                .build()
                .toUriString();

        Map<String, Object> requestBody = Map.of(
                "q", message.getContent(),
                "target", targetLang
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<>() {}
        );
        
        Map<String, Object> body = response.getBody();
        if (body == null || !body.containsKey("data")) {
            throw new IllegalStateException("Invalid response from Google Translate API");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) body.get("data");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> translations = (List<Map<String, Object>>) data.get("translations");

        Map<String, Object> first = translations.get(0);
        String translatedText = (String) first.get("translatedText");
        
        // Tạo message mới
        return MessageResponse.builder()
                .id(message.getId() + "-translated")
                .conversationId(message.getConversationId())
                .sender(message.getSender())
                .type(message.getType() + "-translation")
                .content(translatedText)
                .createdAt(message.getCreatedAt())
                .build();
    }
}

