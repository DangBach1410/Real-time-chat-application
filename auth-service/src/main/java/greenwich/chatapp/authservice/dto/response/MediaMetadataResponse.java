package greenwich.chatapp.authservice.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaMetadataResponse {
    private String url;
    private String mediaType;
    private long size;
    private String originalName;
}
