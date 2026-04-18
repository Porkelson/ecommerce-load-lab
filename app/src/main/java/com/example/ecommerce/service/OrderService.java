package com.example.ecommerce.service;

import com.example.ecommerce.dto.order.OrderResponse;
import com.example.ecommerce.entity.*;
import com.example.ecommerce.exception.InsufficientStockException;
import com.example.ecommerce.exception.ResourceNotFoundException;
import com.example.ecommerce.repository.CartItemRepository;
import com.example.ecommerce.repository.OrderRepository;
import com.example.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;

    /**
     * Converts the current cart to a confirmed order.
     *
     * Runs in a single transaction: stock validation → stock decrement → order creation
     * → cart cleared. Under concurrent load, @Version on Product causes
     * OptimisticLockException when two VUs buy the last unit simultaneously,
     * surfacing as a 409 in k6 metrics rather than silently over-selling stock.
     */
    @Transactional
    public OrderResponse placeOrder(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        List<CartItem> cartItems = cartItemRepository.findByUserIdWithProduct(user.getId());
        if (cartItems.isEmpty()) {
            throw new ResourceNotFoundException("Cart is empty");
        }

        // Validate all stock before touching any row
        for (CartItem ci : cartItems) {
            if (ci.getProduct().getStockQuantity() < ci.getQuantity()) {
                throw new InsufficientStockException(
                    "Insufficient stock for: " + ci.getProduct().getName());
            }
        }

        BigDecimal total = BigDecimal.ZERO;
        Order order = new Order(user, BigDecimal.ZERO);
        orderRepository.save(order);

        for (CartItem ci : cartItems) {
            Product product = ci.getProduct();
            product.setStockQuantity(product.getStockQuantity() - ci.getQuantity());

            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(ci.getQuantity()));
            total = total.add(lineTotal);

            order.getItems().add(new OrderItem(order, product, ci.getQuantity(), product.getPrice()));
        }

        order.setTotalAmount(total);
        cartItemRepository.deleteByUserId(user.getId());

        return OrderResponse.from(order);
    }

    public List<OrderResponse> getOrders(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        return orderRepository.findByUserIdWithItems(user.getId()).stream()
            .map(OrderResponse::from)
            .toList();
    }
}
