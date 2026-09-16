package com.certchain.certchain.controller;

import com.certchain.certchain.dto.response.WalletCredentialResponse;
import com.certchain.certchain.service.HolderService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/holder")
public class HolderController {

    private final HolderService holderService;

    public HolderController(HolderService holderService) {
        this.holderService = holderService;
    }

    @GetMapping("/wallet")
    public ResponseEntity<List<WalletCredentialResponse>> wallet(
            Authentication authentication) {

        return ResponseEntity.ok(
                holderService.listWallet(
                        currentUserId(authentication)
                )
        );
    }

    @PostMapping("/wallet/{credentialId}")
    public ResponseEntity<WalletCredentialResponse> add(
            Authentication authentication,
            @PathVariable UUID credentialId) {

        WalletCredentialResponse response =
                holderService.addToWallet(
                        currentUserId(authentication),
                        credentialId
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @DeleteMapping("/wallet/{credentialId}")
    public ResponseEntity<Void> remove(
            Authentication authentication,
            @PathVariable UUID credentialId) {

        holderService.removeFromWallet(
                currentUserId(authentication),
                credentialId
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/credentials/{id}/download")
    public ResponseEntity<byte[]> download(
            Authentication authentication,
            @PathVariable UUID id)
            throws Exception {

        byte[] envelope =
                holderService.downloadCredential(
                        currentUserId(authentication),
                        id
                );

        String filename =
                holderService.credentialFilename(
                        currentUserId(authentication),
                        id
                );

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\""
                                + filename
                                + "\""
                )
                .body(envelope);
    }

    private UUID currentUserId(
            Authentication authentication) {

        return (UUID) authentication.getPrincipal();
    }
}