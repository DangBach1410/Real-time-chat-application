package greenwich.chatapp.authservice.feignclient;

import greenwich.chatapp.authservice.dto.response.MediaMetadataResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@FeignClient(name = "media-service", url = "${media.service.url}")
public interface MediaServiceClient {

    @PostMapping(value = "/api/v1/media/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    List<MediaMetadataResponse> uploadFiles(@RequestPart("files") List<MultipartFile> files);
}