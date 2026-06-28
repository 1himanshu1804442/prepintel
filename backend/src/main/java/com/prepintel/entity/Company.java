package com.prepintel.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "oa_pattern")
    @Builder.Default
    private String oaPattern = "Unknown";

    @Column(name = "has_limited_data")
    @Builder.Default
    private boolean hasLimitedData = false;
}
