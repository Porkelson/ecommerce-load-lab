package com.example.ecommerce.dto.cart;

import com.example.ecommerce.entity.CartItem;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(List<CartItemResponse> items, BigDecimal total) {

    public record CartItemResponse(
        Long cartItemId,
        Long productId,
        String productName,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal
    ) {
        public static CartItemResponse from(CartItem ci) {
            BigDecimal lineTotal = ci.getProduct().getPrice()
                .multiply(BigDecimal.valueOf(ci.getQuantity()));
            return new CartItemResponse(
                ci.getId(),
                ci.getProduct().getId(),
                ci.getProduct().getName(),
                ci.getProduct().getPrice(),
                ci.getQuantity(),
                lineTotal
            );
        }
    }

    public static CartResponse from(List<CartItem> items) {
        List<CartItemResponse> itemResponses = items.stream()
            .map(CartItemResponse::from)
            .toList();
        BigDecimal total = itemResponses.stream()
            .map(CartItemResponse::lineTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartResponse(itemResponses, total);
    }
}
