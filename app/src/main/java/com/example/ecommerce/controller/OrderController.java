package com.example.ecommerce.controller;

import com.example.ecommerce.dto.order.OrderResponse;
import com.example.ecommerce.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse placeOrder(@AuthenticationPrincipal UserDetails user) {
        return orderService.placeOrder(user.getUsername());
    }

    @GetMapping
    public List<OrderResponse> getOrders(@AuthenticationPrincipal UserDetails user) {
        return orderService.getOrders(user.getUsername());
    }
}
