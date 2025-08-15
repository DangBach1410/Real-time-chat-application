package greenwich.chatapp.mediaservice.service;

import greenwich.chatapp.mediaservice.dto.MediaMetadataResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface MediaService {
    List<MediaMetadataResponse> uploadFiles(List<MultipartFile> files);
}

