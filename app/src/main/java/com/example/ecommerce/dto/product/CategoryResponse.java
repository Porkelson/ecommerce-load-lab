package com.example.ecommerce.dto.product;

import com.example.ecommerce.entity.Category;

public record CategoryResponse(Long id, String name, String slug) {
    public static CategoryResponse from(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getSlug());
    }
}
