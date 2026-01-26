package greenwich.chatapp.adminservice.util;

import java.text.Normalizer;

public class UnicodeUtils {
    public static String toSearchable(String input) {
        if (input == null) return null;
        String nfd = Normalizer.normalize(input, Normalizer.Form.NFD);
        return nfd.replaceAll("\\p{M}", "").toLowerCase();
    }
}

