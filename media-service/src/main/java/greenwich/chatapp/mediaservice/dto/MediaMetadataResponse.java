package greenwich.chatapp.mediaservice.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaMetadataResponse {
    private String url;
    private String mediaType; // image, video, audio, file
    private long size;
    private String originalName;
}
