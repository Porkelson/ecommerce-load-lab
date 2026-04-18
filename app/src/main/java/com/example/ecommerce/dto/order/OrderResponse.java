package com.example.ecommerce.dto.order;

import com.example.ecommerce.entity.Order;
import com.example.ecommerce.entity.OrderItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
    Long id,
    String status,
    BigDecimal totalAmount,
    Instant createdAt,
    List<OrderItemResponse> items
) {
    public record OrderItemResponse(
        Long productId,
        String productName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
    ) {
        public static OrderItemResponse from(OrderItem oi) {
            return new OrderItemResponse(
                oi.getProduct().getId(),
                oi.getProduct().getName(),
                oi.getQuantity(),
                oi.getUnitPrice(),
                oi.getUnitPrice().multiply(BigDecimal.valueOf(oi.getQuantity()))
            );
        }
    }

    public static OrderResponse from(Order o) {
        return new OrderResponse(
            o.getId(),
            o.getStatus().name(),
            o.getTotalAmount(),
            o.getCreatedAt(),
            o.getItems().stream().map(OrderItemResponse::from).toList()
        );
    }
}
