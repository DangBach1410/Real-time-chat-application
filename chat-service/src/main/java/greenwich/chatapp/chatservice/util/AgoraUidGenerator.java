package greenwich.chatapp.chatservice.util;

import org.springframework.stereotype.Component;
import java.nio.ByteBuffer;
import java.util.zip.CRC32;

/**
 * Generates deterministic numeric Agora UIDs from string user IDs.
 * 
 * Uses CRC32 to produce a uint32 (0 to 2^32-1) that is:
 * - Deterministic: Same userId always produces same agoraUid
 * - Collision-resistant: Very low collision rate for practical purposes
 * - Platform-compatible: Works with Agora Web SDK (accepts numeric) and Mobile SDK (requires numeric)
 */
@Component
public class AgoraUidGenerator {
    
    private static final long UINT32_MAX = 0xFFFFFFFFL; // 2^32 - 1
    
    /**
     * Generates a deterministic numeric Agora UID from a string user ID.
     * 
     * @param userId The unique string identifier (UUID, username, email, etc.)
     * @return A numeric UID in range [1, 2^32-1]
     * @throws IllegalArgumentException if userId is null or empty
     */
    public long generateAgoraUid(String userId) {
        if (userId == null || userId.trim().isEmpty()) {
            throw new IllegalArgumentException("userId cannot be null or empty");
        }
        
        // Use CRC32 for deterministic hashing
        CRC32 crc32 = new CRC32();
        crc32.update(userId.getBytes());
        
        // Get the CRC32 value as unsigned 32-bit int
        long crcValue = crc32.getValue() & UINT32_MAX;
        
        // Ensure non-zero (Agora requires uid > 0)
        // If CRC32 happens to be 0 (extremely rare), use a sentinel value
        if (crcValue == 0) {
            crcValue = 1;
        }
        
        return crcValue;
    }
}
