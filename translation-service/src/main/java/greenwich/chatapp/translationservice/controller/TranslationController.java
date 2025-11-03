package greenwich.chatapp.translationservice.controller;

import greenwich.chatapp.translationservice.dto.MessageResponse;
import greenwich.chatapp.translationservice.service.TranslationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/translate")
public class TranslationController {

    private final TranslationService translationService;

    public TranslationController(TranslationService translationService) {
        this.translationService = translationService;
    }

    @PostMapping
    public ResponseEntity<MessageResponse> translateMessage(
            @RequestBody MessageResponse message,
            @RequestParam(defaultValue = "en") String targetLang
    ) {
        MessageResponse translated = translationService.translateMessage(message, targetLang);
        return ResponseEntity.ok(translated);
    }
}
