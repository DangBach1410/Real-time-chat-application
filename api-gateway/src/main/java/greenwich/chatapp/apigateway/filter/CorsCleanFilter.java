package greenwich.chatapp.apigateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class CorsCleanFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            HttpHeaders headers = exchange.getResponse().getHeaders();

            // Nếu có nhiều hơn 1 giá trị Access-Control-Allow-Origin
            if (headers.get(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN) != null &&
                    headers.get(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN).size() > 1) {

                String firstOrigin = headers.getFirst(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN);
                headers.remove(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN);
                headers.add(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, firstOrigin);
            }

            // Tương tự cho Allow-Credentials
            if (headers.get(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS) != null &&
                    headers.get(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS).size() > 1) {

                headers.remove(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS);
                headers.add(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
            }
        }));
    }

    @Override
    public int getOrder() {
        // Chạy sau cùng để đảm bảo nó ghi đè lên tất cả các cấu hình khác
        return Ordered.LOWEST_PRECEDENCE;
    }
}