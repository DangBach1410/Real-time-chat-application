package greenwich.chatapp.chatservice.service;

import greenwich.chatapp.chatservice.dto.request.CallRequest;
import greenwich.chatapp.chatservice.dto.response.MemberResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.http.ResponseEntity;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CallService {

    private final ConversationService conversationService;
    private final SimpMessagingTemplate messagingTemplate;

    public void startCall(CallRequest request) {
        ResponseEntity<List<MemberResponse>> response = conversationService.getMembers(request.getConversationId());
        List<MemberResponse> members = response.getBody();
        if (members == null || members.isEmpty()) return;

        // Lấy tên conversation (ví dụ từ ConversationService)
        String conversationName = conversationService.getConversation(request.getConversationId()).getName();
        request.setConversationName(conversationName);

        // Gửi thông báo tới tất cả thành viên trừ caller
        members.stream()
                .filter(m -> !m.getUserId().equals(request.getCallerId()))
                .forEach(m -> {
                    String destination = "/topic/call/" + m.getUserId();
                    messagingTemplate.convertAndSend(destination, request);
                });
    }
}
