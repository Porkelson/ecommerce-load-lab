package com.example.ecommerce.dto.product;

import com.example.ecommerce.entity.Product;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
    Long id,
    String name,
    String description,
    BigDecimal price,
    int stockQuantity,
    Long categoryId,
    String categoryName,
    Instant createdAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(
            p.getId(),
            p.getName(),
            p.getDescription(),
            p.getPrice(),
            p.getStockQuantity(),
            p.getCategory().getId(),
            p.getCategory().getName(),
            p.getCreatedAt()
        );
    }
}
