package com.prepintel.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "problems")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Problem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "leetcode_id", nullable = false, unique = true)
    private Integer leetcodeId;

    @Column(nullable = false)
    private String title;

    @Column(name = "title_slug", nullable = false, unique = true)
    private String titleSlug;

    @Column(nullable = false)
    private String difficulty;

    @Column(name = "acceptance_rate")
    private BigDecimal acceptanceRate;

    @Column
    private String url;

    @Column
    @Builder.Default
    private String topics = "";
}
