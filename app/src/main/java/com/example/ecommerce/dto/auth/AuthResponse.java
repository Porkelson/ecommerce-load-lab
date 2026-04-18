package com.example.ecommerce.dto.auth;

public record AuthResponse(
    String token,
    String username,
    String email,
    long expiresIn
) {}
