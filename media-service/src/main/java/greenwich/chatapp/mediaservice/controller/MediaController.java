package greenwich.chatapp.mediaservice.controller;

import greenwich.chatapp.mediaservice.dto.MediaMetadataResponse;
import greenwich.chatapp.mediaservice.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<MediaMetadataResponse>> uploadFiles(
            @RequestPart("files") List<MultipartFile> files) {
        return ResponseEntity.ok(mediaService.uploadFiles(files));
    }
}

