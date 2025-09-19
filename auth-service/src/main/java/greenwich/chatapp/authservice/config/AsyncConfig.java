package greenwich.chatapp.authservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);        // số thread cơ bản
        executor.setMaxPoolSize(10);        // số thread tối đa
        executor.setQueueCapacity(500);     // queue chứa task
        executor.setThreadNamePrefix("Async-");
        executor.initialize();
        return executor;
    }
}
