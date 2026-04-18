package com.example.ecommerce.service;

import com.example.ecommerce.dto.product.ProductResponse;
import com.example.ecommerce.exception.ResourceNotFoundException;
import com.example.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    public Page<ProductResponse> search(String search, Long categoryId, int page, int size) {
        PageRequest pageable = PageRequest.of(page, Math.min(size, 50), Sort.by("id").ascending());
        return productRepository.search(
            (search != null && search.isBlank()) ? null : search,
            categoryId,
            pageable
        ).map(ProductResponse::from);
    }

    public ProductResponse getById(Long id) {
        return productRepository.findById(id)
            .map(ProductResponse::from)
            .orElseThrow(() -> new ResourceNotFoundException("Product " + id + " not found"));
    }
}
