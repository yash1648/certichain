package com.certchain.certchain.controller;

import com.certchain.certchain.dto.response.AdminIssuerResponse;
import com.certchain.certchain.dto.response.AdminUserResponse;
import com.certchain.certchain.dto.response.AdminVerificationResponse;
import com.certchain.certchain.service.AdminService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping(
            value = "/issuers",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<AdminIssuerResponse>> issuers() {

        return ResponseEntity.ok(
                adminService.listIssuers()
        );
    }

    @PostMapping(
            value = "/issuers/{id}/verify",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<AdminIssuerResponse> verifyIssuer(
            @PathVariable UUID id) {

        return ResponseEntity.ok(
                adminService.verifyIssuer(id)
        );
    }

    @GetMapping(
            value = "/users",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<AdminUserResponse>> users() {

        return ResponseEntity.ok(
                adminService.listUsers()
        );
    }

    @GetMapping(
            value = "/verifications",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<AdminVerificationResponse>> verifications() {

        return ResponseEntity.ok(
                adminService.listVerifications()
        );
    }
}