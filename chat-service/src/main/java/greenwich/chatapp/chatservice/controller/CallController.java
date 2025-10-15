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

    @PostMapping("/start")
    public ResponseEntity<String> startCallEvent(@RequestBody CallRequest callRequest) {
        callService.startCall(callRequest);
        return ResponseEntity.ok(CALL_EVENT_SUCCESS_MESSAGE);
    }
}

