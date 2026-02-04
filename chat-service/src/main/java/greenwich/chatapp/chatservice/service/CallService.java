package greenwich.chatapp.chatservice.service;

import greenwich.chatapp.chatservice.dto.request.CallRequest;
import greenwich.chatapp.chatservice.dto.request.MessageCreateRequest;
import greenwich.chatapp.chatservice.dto.request.SendNotificationRequest;
import greenwich.chatapp.chatservice.dto.response.CallResponse;
import greenwich.chatapp.chatservice.dto.response.MemberResponse;
import greenwich.chatapp.chatservice.entity.CallInfo;
import greenwich.chatapp.chatservice.feignclient.NotificationServiceClient;
import greenwich.chatapp.chatservice.util.AgoraUidGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CallService {

    private final MessageService messageService;
    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final AgoraUidGenerator agoraUidGenerator;
    private final NotificationServiceClient notificationServiceClient;
    private final Map<String, CallInfo> activeCalls = new ConcurrentHashMap<>();

    /**
     * Generates call response with Agora UID information.
     * Returns the call details that frontend needs to join the Agora channel.
     */
    public CallResponse generateCallResponse(CallRequest request) {
        long agoraUid = agoraUidGenerator.generateAgoraUid(request.getCallerId());
        
        return CallResponse.builder()
                .channel(request.getConversationId())
                .agoraUid(agoraUid)
                .token("") // Token will be generated server-side if authentication is enabled
                .type(request.getType())
                .callerId(request.getCallerId())
                .callerName(request.getCallerName())
                .callerImage(request.getCallerImage())
                .build();
    }

    public void startOrJoinCall(CallRequest request) {
        try {
            log.info("[CallService] Processing start-or-join: conversationId={}, callerId={}", 
                request.getConversationId(), request.getCallerId());
            
            long agoraUid = agoraUidGenerator.generateAgoraUid(request.getCallerId());
            log.debug("[CallService] Generated agoraUid={} for userId={}", agoraUid, request.getCallerId());
            
            CallInfo call = activeCalls.get(request.getConversationId());

            if (call == null) {
                log.info("[CallService] Creating new call: conversationId={}, initiator={}", 
                    request.getConversationId(), request.getCallerId());
                // Start new call
                call = CallInfo.builder()
                        .conversationId(request.getConversationId())
                        .type(request.getType())
                        .startedBy(request.getCallerId())
                        .startedByAgoraUid(agoraUid)
                        .startedAt(LocalDateTime.now())
                        .active(true)
                        .participants(new ArrayList<>(List.of(request.getCallerId())))
                        .build();
                
                log.debug("[CallService] CallInfo created: participantAgoraUids initialized = {}", 
                    call.getParticipantAgoraUids() != null);
                
                call.getParticipantAgoraUids().put(request.getCallerId(), agoraUid);
                activeCalls.put(request.getConversationId(), call);
                log.info("[CallService] Call created successfully: conversationId={}", request.getConversationId());

                // Create notification message
                try {
                    log.debug("[CallService] Creating notification messages for new call");
                    MessageCreateRequest startMsg = MessageCreateRequest.builder()
                            .conversationId(request.getConversationId())
                            .senderId(request.getCallerId())
                            .senderFullName(request.getCallerName())
                            .senderImageUrl(request.getCallerImage())
                            .type("notification")
                            .content("started a " + request.getType() + " call")
                            .build();
                    messageService.createNotificationMessage(startMsg);

                    messageService.createCallMessage(
                            request.getConversationId(),
                            request.getCallerId(),
                            request.getCallerName(),
                            request.getCallerImage(),
                            request.getType()
                    );
                    log.debug("[CallService] Notification messages created successfully");
                } catch (Exception e) {
                    log.error("[CallService] Error creating notification messages: conversationId={}", 
                        request.getConversationId(), e);
                }

                // Send call event to all members except caller
                try {
                    ResponseEntity<List<MemberResponse>> response = conversationService.getMembers(request.getConversationId());
                    // Logic định dạng tin nhắn tiếng Anh
                    String notificationBody = (request.getConversationName() != null && !request.getConversationName().isEmpty())
                            ? String.format("Incoming %s call to %s...", request.getType(), request.getConversationName())
                            : String.format("Incoming %s call to you...", request.getType());
                    List<MemberResponse> members = response.getBody();

                    if (members != null) {
                        List<String> targetUserIds = members.stream()
                                .map(MemberResponse::getUserId)
                                .filter(id -> !id.equals(request.getCallerId()))
                                .toList();

                        // --- LOGIC GỬI WEBSOCKET ---
                        targetUserIds.forEach(userId -> {
                            String destination = "/topic/call/" + userId;
                            messagingTemplate.convertAndSend(destination, request);
                        });

                        // --- LOGIC GỬI PUSH NOTIFICATION QUA FEIGN CLIENT ---
                        if (!targetUserIds.isEmpty()) {
                            SendNotificationRequest pushRequest = SendNotificationRequest.builder()
                                    .userIds(targetUserIds)
                                    .title(request.getCallerName())
                                    .body(notificationBody)
                                    .data(Map.of(
                                            "type", Objects.requireNonNullElse(request.getType(), ""),
                                            "conversationId", Objects.requireNonNullElse(request.getConversationId(), ""),
                                            "conversationName", Objects.requireNonNullElse(request.getConversationName(), ""),
                                            "callerId", Objects.requireNonNullElse(request.getCallerId(), ""),
                                            "callerName", Objects.requireNonNullElse(request.getCallerName(), ""),
                                            "callerImage", Objects.requireNonNullElse(request.getCallerImage(), "")
                                    ))
                                    .build();

                            // Gọi Notification Service
                            notificationServiceClient.sendNotification(pushRequest);
                            log.info("[CallService] Push notification sent to {} users", targetUserIds.size());
                        }
                    }
                } catch (Exception e) {
                    log.error("[CallService] Error in broadcasting/pushing call event", e);
                }
            } else {
                log.info("[CallService] User joining existing call: conversationId={}, userId={}", 
                    request.getConversationId(), request.getCallerId());
                // Join existing call
                if (!call.getParticipants().contains(request.getCallerId())) {
                    call.getParticipants().add(request.getCallerId());
                    call.getParticipantAgoraUids().put(request.getCallerId(), agoraUid);
                    log.info("[CallService] User added to call: userId={}, agoraUid={}", 
                        request.getCallerId(), agoraUid);

                    // Create notification message
                    try {
                        MessageCreateRequest joinMsg = MessageCreateRequest.builder()
                                .conversationId(request.getConversationId())
                                .senderId(request.getCallerId())
                                .senderFullName(request.getCallerName())
                                .senderImageUrl(request.getCallerImage())
                                .type("notification")
                                .content("joined the call")
                                .build();

                        messageService.createNotificationMessage(joinMsg);
                        log.debug("[CallService] Join notification created");
                    } catch (Exception e) {
                        log.error("[CallService] Error creating join notification: conversationId={}, userId={}", 
                            request.getConversationId(), request.getCallerId(), e);
                    }
                } else {
                    log.debug("[CallService] User already in call: userId={}, conversationId={}", 
                        request.getCallerId(), request.getConversationId());
                }
            }
        } catch (Exception e) {
            log.error("[CallService] Critical error in startOrJoinCall: conversationId={}, callerId={}", 
                request.getConversationId(), request.getCallerId(), e);
            throw e;
        }
    }

    public void leaveCall(String conversationId, String userId, String userName) {
        try {
            log.info("[CallService] Processing leaveCall: conversationId={}, userId={}", conversationId, userId);
            
            CallInfo call = activeCalls.get(conversationId);
            if (call == null) {
                log.warn("[CallService] Call not found for conversationId={}", conversationId);
                return;
            }

            call.getParticipants().remove(userId);
            call.getParticipantAgoraUids().remove(userId);
            log.debug("[CallService] User removed from call: userId={}, remainingParticipants={}", 
                userId, call.getParticipants().size());

            // Create notification message
            try {
                MessageCreateRequest leaveMsg = MessageCreateRequest.builder()
                        .conversationId(conversationId)
                        .senderId(userId)
                        .senderFullName(userName)
                        .senderImageUrl(null)
                        .type("notification")
                        .content("left the call")
                        .build();
                messageService.createNotificationMessage(leaveMsg);
                log.debug("[CallService] Leave notification created");
            } catch (Exception e) {
                log.error("[CallService] Error creating leave notification: conversationId={}, userId={}", 
                    conversationId, userId, e);
            }

            if (call.getParticipants().isEmpty()) {
                log.info("[CallService] Call ended - no remaining participants: conversationId={}", conversationId);
                call.setActive(false);
                activeCalls.remove(conversationId);

                // Create notification message
                try {
                    MessageCreateRequest endMsg = MessageCreateRequest.builder()
                            .conversationId(conversationId)
                            .senderId(null)
                            .senderFullName(null)
                            .senderImageUrl(null)
                            .type("notification")
                            .content("Call ended")
                            .build();

                    messageService.createNotificationMessage(endMsg);
                    log.debug("[CallService] Call ended notification created");
                } catch (Exception e) {
                    log.error("[CallService] Error creating call end notification: conversationId={}", 
                        conversationId, e);
                }
            }
        } catch (Exception e) {
            log.error("[CallService] Error in leaveCall: conversationId={}, userId={}", 
                conversationId, userId, e);
            throw e;
        }
    }

    /**
     * Retrieves the user ID for a given Agora UID.
     * Used for mapping remote Agora UID back to string userId.
     */
    public String getUserIdFromAgoraUid(String conversationId, long agoraUid) {
        try {
            log.debug("[CallService] Mapping agoraUid to userId: conversationId={}, agoraUid={}", 
                conversationId, agoraUid);
            
            CallInfo call = activeCalls.get(conversationId);
            if (call == null) {
                log.warn("[CallService] Call not found for conversationId={}", conversationId);
                return null;
            }
            
            String userId = call.getParticipantAgoraUids().entrySet().stream()
                    .filter(e -> e.getValue() == agoraUid)
                    .map(Map.Entry::getKey)
                    .findFirst()
                    .orElse(null);
            
            if (userId == null) {
                log.warn("[CallService] No userId found for agoraUid={} in conversationId={}", 
                    agoraUid, conversationId);
            } else {
                log.debug("[CallService] Successfully mapped agoraUid to userId: agoraUid={}, userId={}", 
                    agoraUid, userId);
            }
            
            return userId;
        } catch (Exception e) {
            log.error("[CallService] Error mapping agoraUid to userId: conversationId={}, agoraUid={}", 
                conversationId, agoraUid, e);
            throw e;
        }
    }
}

