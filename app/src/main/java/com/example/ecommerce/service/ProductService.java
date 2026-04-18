package com.example.ecommerce.service;

import com.example.ecommerce.dto.product.ProductResponse;
import com.example.ecommerce.entity.Product;
import com.example.ecommerce.exception.ResourceNotFoundException;
import com.example.ecommerce.repository.ProductRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    public Page<ProductResponse> search(String search, Long categoryId, int page, int size) {
        String term = (search == null || search.isBlank()) ? null : search.toLowerCase();
        PageRequest pageable = PageRequest.of(page, Math.min(size, 50), Sort.by("id").ascending());

        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (term != null) {
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("name")), "%" + term + "%"),
                    cb.like(cb.lower(root.get("description")), "%" + term + "%")
                ));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return productRepository.findAll(spec, pageable).map(ProductResponse::from);
    }

    public ProductResponse getById(Long id) {
        return productRepository.findById(id)
            .map(ProductResponse::from)
            .orElseThrow(() -> new ResourceNotFoundException("Product " + id + " not found"));
    }
}
