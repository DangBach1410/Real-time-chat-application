package greenwich.chatapp.presenceservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@EnableDiscoveryClient
@SpringBootApplication
public class PresenceServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PresenceServiceApplication.class, args);
    }

}
