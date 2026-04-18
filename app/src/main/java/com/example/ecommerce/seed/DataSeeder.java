package com.example.ecommerce.seed;

import com.example.ecommerce.entity.Category;
import com.example.ecommerce.entity.Product;
import com.example.ecommerce.entity.User;
import com.example.ecommerce.repository.CategoryRepository;
import com.example.ecommerce.repository.ProductRepository;
import com.example.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String TEST_PASSWORD = "Password1!";
    private static final int PRODUCT_COUNT = 500;
    private static final int USER_COUNT = 20;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded — skipping.");
            return;
        }

        List<Category> categories = seedCategories();
        seedProducts(categories);
        seedUsers();

        log.info("Seeded {} categories, {} products, {} test users.",
            categories.size(), PRODUCT_COUNT, USER_COUNT);
    }

    private List<Category> seedCategories() {
        return categoryRepository.saveAll(List.of(
            new Category("Electronics", "electronics"),
            new Category("Books", "books"),
            new Category("Clothing", "clothing"),
            new Category("Sports", "sports"),
            new Category("Home & Garden", "home-garden"),
            new Category("Toys", "toys")
        ));
    }

    private void seedProducts(List<Category> categories) {
        Random rng = new Random(42);
        String[][] templates = {
            {"Laptop", "High-performance laptop with SSD storage and long battery life"},
            {"Wireless Headphones", "Noise-cancelling over-ear headphones with 30h battery"},
            {"Smartphone", "Latest model with OLED display and 5G connectivity"},
            {"Keyboard", "Mechanical keyboard with RGB backlight and tactile switches"},
            {"Monitor", "27-inch 4K IPS monitor with USB-C connectivity"},
            {"Novel", "Bestselling fiction novel with award-winning storytelling"},
            {"Cookbook", "Comprehensive guide to international cuisine with 500 recipes"},
            {"Textbook", "University-level textbook with practice exercises and solutions"},
            {"T-Shirt", "Premium cotton crew-neck t-shirt available in multiple colours"},
            {"Running Shoes", "Lightweight running shoes with responsive foam midsole"},
            {"Jacket", "Waterproof outdoor jacket with breathable membrane technology"},
            {"Yoga Mat", "Non-slip yoga mat with alignment guides and carry strap"},
            {"Dumbbells", "Adjustable dumbbell set with quick-change weight system"},
            {"Tent", "Lightweight 3-season camping tent for two persons"},
            {"Coffee Maker", "Programmable drip coffee maker with thermal carafe"},
            {"Blender", "High-speed blender for smoothies soups and food processing"},
            {"Desk Lamp", "LED desk lamp with adjustable colour temperature and USB port"},
            {"Board Game", "Strategy board game for 2-6 players ages 10 and up"},
            {"Action Figure", "Detailed collectible action figure with multiple accessories"},
            {"Puzzle", "1000-piece jigsaw puzzle featuring scenic landscape photography"}
        };

        List<Product> products = new ArrayList<>(PRODUCT_COUNT);
        for (int i = 1; i <= PRODUCT_COUNT; i++) {
            String[] template = templates[i % templates.length];
            Category category = categories.get(i % categories.size());
            BigDecimal price = BigDecimal.valueOf(9.99 + rng.nextInt(990))
                .setScale(2, RoundingMode.HALF_UP);
            int stock = 10 + rng.nextInt(500);
            products.add(new Product(
                template[0] + " " + i,
                template[1] + ". Product SKU-" + String.format("%04d", i) + ".",
                price,
                stock,
                category
            ));
        }
        productRepository.saveAll(products);
    }

    private void seedUsers() {
        List<User> users = new ArrayList<>(USER_COUNT);
        String encoded = passwordEncoder.encode(TEST_PASSWORD);
        for (int i = 1; i <= USER_COUNT; i++) {
            String num = String.format("%02d", i);
            users.add(new User(
                "testuser" + num,
                "testuser" + num + "@test.com",
                encoded
            ));
        }
        userRepository.saveAll(users);
    }
}
