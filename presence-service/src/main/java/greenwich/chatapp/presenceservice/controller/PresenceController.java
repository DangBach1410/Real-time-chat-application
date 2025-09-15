package greenwich.chatapp.presenceservice.controller;

import greenwich.chatapp.presenceservice.service.PresenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("api/v1/presence")
public class PresenceController {

    private final PresenceService presenceService;

    public PresenceController(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @PostMapping("/update")
    public ResponseEntity<String> update(@RequestParam String userId) {
        presenceService.updatePresence(userId);
        return ResponseEntity.ok("ok");
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String userId) {
        Long lastSeen = presenceService.getLastSeen(userId);
        Map<String, Object> response = new HashMap<>();
        response.put("userId", userId);
        response.put("lastSeen", lastSeen);
        return ResponseEntity.ok(response);
    }
}
