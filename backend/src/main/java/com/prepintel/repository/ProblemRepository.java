package com.prepintel.repository;

import com.prepintel.entity.Problem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProblemRepository extends JpaRepository<Problem, Long> {
    Optional<Problem> findByTitleSlug(String titleSlug);
    Optional<Problem> findByLeetcodeId(Integer leetcodeId);
}
