package greenwich.chatapp.translationservice.service;

import com.google.cloud.translate.v3.*;
import greenwich.chatapp.translationservice.dto.MessageResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TranslationService {

    @Value("${google.project-id}")
    private String projectId;

    public MessageResponse translateMessage(MessageResponse message, String targetLang) {
        if (!"text".equalsIgnoreCase(message.getType())) {
            return message;
        }

        try (TranslationServiceClient client = TranslationServiceClient.create()) {
            // parent = "projects/{project-id}/locations/global"
            LocationName parent = LocationName.of(projectId, "global");

            // Tạo request dịch
            TranslateTextRequest request = TranslateTextRequest.newBuilder()
                    .setParent(parent.toString())
                    .setMimeType("text/plain")
                    .setTargetLanguageCode(targetLang)
                    .addContents(message.getContent())
                    .build();

            // Gọi API v3
            TranslateTextResponse response = client.translateText(request);
            String translatedText = response.getTranslationsList().get(0).getTranslatedText();

            // Tạo message mới với nội dung dịch
            return MessageResponse.builder()
                    .id(message.getId() + "-translated")
                    .conversationId(message.getConversationId())
                    .sender(message.getSender())
                    .type(message.getType() + "-translation")
                    .content(translatedText)
                    .createdAt(message.getCreatedAt())
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Translation failed: " + e.getMessage(), e);
        }
    }
}
