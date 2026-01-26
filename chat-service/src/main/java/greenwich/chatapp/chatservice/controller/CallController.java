package greenwich.chatapp.chatservice.controller;

import greenwich.chatapp.chatservice.dto.request.CallRequest;
import greenwich.chatapp.chatservice.dto.response.CallResponse;
import greenwich.chatapp.chatservice.service.CallService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Call management controller.
 * 
 * Handles call initiation, joining, and termination.
 * Provides numeric Agora UIDs to both Web and Mobile clients.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/chat/calls")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;

    /**
     * Starts a new call or joins an existing one.
     * 
     * Returns CallResponse with:
     * - channel: Agora channel name
     * - agoraUid: Numeric Agora UID (uint32) for this user
     * - token: Agora authentication token (if enabled)
     * - Call metadata (type, caller info, etc.)
     * 
     * @param request Contains caller info and call details
     * @return CallResponse with Agora connection details
     */
    @PostMapping("/start-or-join")
    public ResponseEntity<CallResponse> startOrJoinCall(@RequestBody CallRequest request) {
        try {
            log.info("[CallController] Received start-or-join request: conversationId={}, callerId={}, type={}", 
                request.getConversationId(), request.getCallerId(), request.getType());
            
            callService.startOrJoinCall(request);
            CallResponse response = callService.generateCallResponse(request);
            
            log.info("[CallController] start-or-join successful: agoraUid={}, channel={}", 
                response.getAgoraUid(), response.getChannel());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("[CallController] Error in start-or-join: conversationId={}, callerId={}", 
                request.getConversationId(), request.getCallerId(), e);
            throw e;
        }
    }

    /**
     * Leaves a call.
     * 
     * @param conversationId The conversation/channel ID
     * @param userId The user's string ID (business identifier)
     * @param userName The user's display name
     * @return Success message
     */
    @DeleteMapping("/leave/{conversationId}/{userId}")
    public ResponseEntity<String> leaveCall(
            @PathVariable String conversationId,
            @PathVariable String userId,
            @RequestParam String userName) {
        try {
            log.info("[CallController] User leaving call: conversationId={}, userId={}, userName={}", 
                conversationId, userId, userName);
            callService.leaveCall(conversationId, userId, userName);
            log.info("[CallController] User successfully left call: conversationId={}, userId={}", 
                conversationId, userId);
            return ResponseEntity.ok("Call ended successfully");
        } catch (Exception e) {
            log.error("[CallController] Error leaving call: conversationId={}, userId={}", 
                conversationId, userId, e);
            throw e;
        }
    }

    /**
     * Retrieves the user ID for a given Agora UID.
     * Used by frontends to map remote Agora UID back to string userId.
     * 
     * @param conversationId The conversation/channel ID
     * @param agoraUid The numeric Agora UID
     * @return The string user ID, or 404 if not found
     */
    @GetMapping("/{conversationId}/agora-uid/{agoraUid}/user-id")
    public ResponseEntity<String> getUserIdFromAgoraUid(
            @PathVariable String conversationId,
            @PathVariable long agoraUid) {
        try {
            log.debug("[CallController] Mapping agoraUid to userId: conversationId={}, agoraUid={}", 
                conversationId, agoraUid);
            String userId = callService.getUserIdFromAgoraUid(conversationId, agoraUid);
            if (userId == null) {
                log.warn("[CallController] No userId found for agoraUid: conversationId={}, agoraUid={}", 
                    conversationId, agoraUid);
                return ResponseEntity.notFound().build();
            }
            log.debug("[CallController] Successfully mapped agoraUid to userId: agoraUid={}, userId={}", 
                agoraUid, userId);
            return ResponseEntity.ok(userId);
        } catch (Exception e) {
            log.error("[CallController] Error mapping agoraUid to userId: conversationId={}, agoraUid={}", 
                conversationId, agoraUid, e);
            throw e;
        }
    }
}

