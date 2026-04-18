package com.example.ecommerce.service;

import com.example.ecommerce.dto.auth.AuthResponse;
import com.example.ecommerce.dto.auth.LoginRequest;
import com.example.ecommerce.dto.auth.RegisterRequest;
import com.example.ecommerce.entity.User;
import com.example.ecommerce.exception.ConflictException;
import com.example.ecommerce.repository.UserRepository;
import com.example.ecommerce.security.JwtTokenProvider;
import com.example.ecommerce.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsServiceImpl userDetailsService;

    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ConflictException("Email already in use");
        }
        if (userRepository.existsByUsername(req.username())) {
            throw new ConflictException("Username already taken");
        }
        User user = new User(req.username(), req.email(), passwordEncoder.encode(req.password()));
        userRepository.save(user);

        UserDetails details = userDetailsService.loadUserByUsername(req.email());
        String token = jwtTokenProvider.generateToken(details);
        return new AuthResponse(token, user.getUsername(), user.getEmail(),
            jwtTokenProvider.getExpirationMs() / 1000);
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
            .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid credentials");
        }
        UserDetails details = userDetailsService.loadUserByUsername(req.email());
        String token = jwtTokenProvider.generateToken(details);
        return new AuthResponse(token, user.getUsername(), user.getEmail(),
            jwtTokenProvider.getExpirationMs() / 1000);
    }
}
