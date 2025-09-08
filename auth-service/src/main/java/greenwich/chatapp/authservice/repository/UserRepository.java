package greenwich.chatapp.authservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import greenwich.chatapp.authservice.entity.UserEntity;

import java.util.Optional;

public interface UserRepository extends MongoRepository<UserEntity, String> {
    Optional<UserEntity> findByEmail(String email);
    Optional<UserEntity> findByUsername(String username);

    Page<UserEntity> findDistinctByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrSearchFullNameContainingIgnoreCase(
            String fullName, String email, String searchFullName, Pageable pageable);

}
