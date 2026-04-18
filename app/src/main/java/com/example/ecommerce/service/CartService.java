package com.example.ecommerce.service;

import com.example.ecommerce.dto.cart.AddCartItemRequest;
import com.example.ecommerce.dto.cart.CartResponse;
import com.example.ecommerce.entity.CartItem;
import com.example.ecommerce.entity.Product;
import com.example.ecommerce.entity.User;
import com.example.ecommerce.exception.InsufficientStockException;
import com.example.ecommerce.exception.ResourceNotFoundException;
import com.example.ecommerce.repository.CartItemRepository;
import com.example.ecommerce.repository.ProductRepository;
import com.example.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public CartResponse addItem(String email, AddCartItemRequest req) {
        User user = getUser(email);
        Product product = productRepository.findById(req.productId())
            .orElseThrow(() -> new ResourceNotFoundException("Product " + req.productId() + " not found"));

        if (product.getStockQuantity() < req.quantity()) {
            throw new InsufficientStockException("Insufficient stock for product " + product.getId());
        }

        Optional<CartItem> existing = cartItemRepository.findByUserIdAndProductId(user.getId(), product.getId());
        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(item.getQuantity() + req.quantity());
        } else {
            cartItemRepository.save(new CartItem(user, product, req.quantity()));
        }

        return CartResponse.from(cartItemRepository.findByUserIdWithProduct(user.getId()));
    }

    public CartResponse getCart(String email) {
        User user = getUser(email);
        List<CartItem> items = cartItemRepository.findByUserIdWithProduct(user.getId());
        return CartResponse.from(items);
    }

    @Transactional
    public void removeItem(String email, Long cartItemId) {
        User user = getUser(email);
        CartItem item = cartItemRepository.findById(cartItemId)
            .orElseThrow(() -> new ResourceNotFoundException("Cart item " + cartItemId + " not found"));
        if (!item.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Cart item " + cartItemId + " not found");
        }
        cartItemRepository.delete(item);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
}
