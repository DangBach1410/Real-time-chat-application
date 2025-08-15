package greenwich.chatapp.mediaservice.service.impl;

import greenwich.chatapp.mediaservice.dto.MediaMetadataResponse;
import greenwich.chatapp.mediaservice.service.MediaService;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MediaServiceImpl implements MediaService {

    private final MinioClient minioClient;

    @Value("${minio.bucket}")
    private String bucketName;

    @Value("${minio.publicEndpoint}")
    private String minioUrl;

    @Override
    public List<MediaMetadataResponse> uploadFiles(List<MultipartFile> files) {
        ensureBucketExists();
        List<MediaMetadataResponse> responses = new ArrayList<>();

        for (MultipartFile file : files) {
            String objectName = UUID.randomUUID() + "-" + file.getOriginalFilename();
            String contentType = file.getContentType();
            long size = file.getSize();

            try (InputStream inputStream = file.getInputStream()) {
                // Upload file
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(objectName)
                                .stream(inputStream, size, -1)
                                .contentType(contentType)
                                .build()
                );

                // Public URL
                String fileUrl = String.format("%s/%s/%s", minioUrl, bucketName, objectName);

                responses.add(MediaMetadataResponse.builder()
                        .url(fileUrl)
                        .mediaType(detectMediaType(contentType))
                        .size(size)
                        .originalName(file.getOriginalFilename())
                        .build());

            } catch (Exception e) {
                throw new RuntimeException("Upload to MinIO failed: " + file.getOriginalFilename(), e);
            }
        }
        return responses;
    }

    private void ensureBucketExists() {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to ensure bucket exists: " + bucketName, e);
        }
    }

    private String detectMediaType(String contentType) {
        if (contentType == null) return "file";
        if (contentType.startsWith("image/")) return "image";
        if (contentType.startsWith("video/")) return "video";
        if (contentType.startsWith("audio/")) return "audio";
        return "file";
    }
}
