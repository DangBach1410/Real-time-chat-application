package greenwich.chatapp.chatservice.service;

import greenwich.chatapp.chatservice.dto.request.CallRequest;
import greenwich.chatapp.chatservice.dto.request.MessageCreateRequest;
import greenwich.chatapp.chatservice.dto.response.MemberResponse;
import greenwich.chatapp.chatservice.entity.CallInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class CallService {

    private final MessageService messageService;
    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<String, CallInfo> activeCalls = new ConcurrentHashMap<>();

    public void startOrJoinCall(CallRequest request) {
        CallInfo call = activeCalls.get(request.getConversationId());

        if (call == null) {
            // Bắt đầu call mới
            call = CallInfo.builder()
                    .conversationId(request.getConversationId())
                    .type(request.getType())
                    .startedBy(request.getCallerId())
                    .startedAt(LocalDateTime.now())
                    .active(true)
                    .participants(new ArrayList<>(List.of(request.getCallerId())))
                    .build();
            activeCalls.put(request.getConversationId(), call);

            // Tạo notification message thông báo bắt đầu call
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
                    request.getType() // "video" or "audio"
            );

            // Gửi event realtime trực tiếp tới tất cả thành viên trừ caller
            ResponseEntity<List<MemberResponse>> response = conversationService.getMembers(request.getConversationId());
            List<MemberResponse> members = response.getBody();
            if (members != null) {
                members.stream()
                        .filter(m -> !m.getUserId().equals(request.getCallerId()))
                        .forEach(m -> {
                            String destination = "/topic/call/" + m.getUserId();
                            messagingTemplate.convertAndSend(destination, request);
                        });
            }

        } else {
            // Join call nếu đã tồn tại
            if (!call.getParticipants().contains(request.getCallerId())) {
                call.getParticipants().add(request.getCallerId());

                // Tạo notification message thông báo tham gia call
                MessageCreateRequest joinMsg = MessageCreateRequest.builder()
                        .conversationId(request.getConversationId())
                        .senderId(request.getCallerId())
                        .senderFullName(request.getCallerName())
                        .senderImageUrl(request.getCallerImage())
                        .type("notification")
                        .content("joined the call")
                        .build();

                messageService.createNotificationMessage(joinMsg);
            }
        }
    }

    public void leaveCall(String conversationId, String userId, String userName) {
        CallInfo call = activeCalls.get(conversationId);
        if (call == null) return;

        call.getParticipants().remove(userId);

        // Tạo notification message thông báo rời call
        MessageCreateRequest leaveMsg = MessageCreateRequest.builder()
                .conversationId(conversationId)
                .senderId(userId)
                .senderFullName(userName)
                .senderImageUrl(null)
                .type("notification")
                .content("left the call")
                .build();
        messageService.createNotificationMessage(leaveMsg);

        if (call.getParticipants().isEmpty()) {
            call.setActive(false);
            activeCalls.remove(conversationId);

            // Tạo notification message thông báo kết thúc call
            MessageCreateRequest endMsg = MessageCreateRequest.builder()
                    .conversationId(conversationId)
                    .senderId(null)
                    .senderFullName(null)
                    .senderImageUrl(null)
                    .type("notification")
                    .content("Call ended")
                    .build();

            messageService.createNotificationMessage(endMsg);
        }
    }
}
