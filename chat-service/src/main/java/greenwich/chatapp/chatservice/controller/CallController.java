package greenwich.chatapp.chatservice.controller;

import greenwich.chatapp.chatservice.dto.request.CallRequest;
import greenwich.chatapp.chatservice.service.CallService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chat/calls")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;

    private static final String CALL_EVENT_SUCCESS_MESSAGE = "Call event sent successfully";

    @PostMapping("/start-or-join")
    public ResponseEntity<String> startOrJoinCall(@RequestBody CallRequest request) {
        callService.startOrJoinCall(request);
        return ResponseEntity.ok(CALL_EVENT_SUCCESS_MESSAGE);
    }

    @DeleteMapping("/leave/{conversationId}/{userId}")
    public ResponseEntity<String> leaveCall(@PathVariable String conversationId, @PathVariable String userId, @RequestParam String userName) {
        callService.leaveCall(conversationId, userId, userName);
        return ResponseEntity.ok(CALL_EVENT_SUCCESS_MESSAGE);
    }
}

