package greenwich.chatapp.notificationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ExpoPushClient {

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String EXPO_PUSH_URL =
            "https://exp.host/--/api/v2/push/send";

    public void send(String expoPushToken,
                     String title,
                     String body,
                     Map<String, Object> data) {

        Map<String, Object> message = new HashMap<>();
        message.put("to", expoPushToken);
        message.put("title", title);
        message.put("body", body);
        message.put("data", data);
        message.put("channelId", "incoming_calls_notifications");
        message.put("priority", "high");
        message.put("sound", "call_ringtone.wav");


        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        HttpEntity<Map<String, Object>> request =
                new HttpEntity<>(message, headers);

        restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);
    }
}
