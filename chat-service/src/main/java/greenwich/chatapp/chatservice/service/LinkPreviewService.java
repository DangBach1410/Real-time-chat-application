package greenwich.chatapp.chatservice.service;

import greenwich.chatapp.chatservice.dto.response.LinkPreviewResponse;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Service;

@Service
public class LinkPreviewService {

    public LinkPreviewResponse fetchMetadata(String url) {
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (compatible; ChatAppBot/1.0)")
                    .timeout(5000)
                    .get();

            String title = doc.select("meta[property=og:title]").attr("content");
            if (title.isEmpty()) title = doc.title();

            String description = doc.select("meta[property=og:description]").attr("content");
            if (description.isEmpty()) {
                description = doc.select("meta[name=description]").attr("content");
            }

            String image = doc.select("meta[property=og:image]").attr("content");

            return LinkPreviewResponse.builder()
                    .url(url)
                    .title(title)
                    .description(description)
                    .image(image)
                    .build();
        } catch (Exception e) {
            // fallback nếu không lấy được metadata
            return LinkPreviewResponse.builder()
                    .url(url)
                    .title(url)
                    .description("")
                    .image(null)
                    .build();
        }
    }
}

