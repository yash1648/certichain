package com.certchain.certchain.controller;

import com.certchain.certchain.dto.response.AnchorLookupResponse;
import com.certchain.certchain.dto.response.DisclosureInfo;
import com.certchain.certchain.dto.response.VerificationHistoryResponse;
import com.certchain.certchain.dto.response.VerificationResult;
import com.certchain.certchain.model.VerificationStatus;
import com.certchain.certchain.service.VerificationHistoryService;
import com.certchain.certchain.service.VerificationService;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.certchain.certchain.dto.response.BatchVerificationResponse;
import com.certchain.certchain.service.BatchVerificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.util.ArrayList;

@RestController
@RequestMapping("/api/verifier")
public class VerifierController {

    private final VerificationService verificationService;
    private final VerificationHistoryService verificationHistoryService;
    private final BatchVerificationService batchVerificationService;

    public VerifierController(
            VerificationService verificationService,
            VerificationHistoryService verificationHistoryService,
            BatchVerificationService batchVerificationService) {
        this.verificationService = verificationService;
        this.verificationHistoryService = verificationHistoryService;
        this.batchVerificationService = batchVerificationService;
    }

    @PostMapping(
            value = "/verify",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<VerificationResult> verify(
            @RequestPart("credentialFile")
            @NotNull MultipartFile credentialFile)
            throws Exception {

        if (credentialFile.isEmpty()) {
            return ResponseEntity.badRequest().body(
                    new VerificationResult(
                            false,
                            VerificationStatus.TAMPERED,
                            null,
                            "Credential file is empty",
                            null,
                            null,
                            null,
                            false,
                            null,
                            null,
                            null,
                            Instant.now(),
                            null,
                            null,
                            null,
                            false,
                            new DisclosureInfo(0, 0, true)
                    )
            );
        }

        VerificationResult result =
                verificationService.verify(
                        credentialFile.getBytes()
                );

        /*
         * The endpoint is public: the verifier is the authenticated
         * principal when present, null for anonymous attempts.
         */
        verificationHistoryService.record(
                result,
                currentVerifierId()
        );

        return ResponseEntity.ok(result);
    }

    @PostMapping(
            value = "/verify/batch",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<BatchVerificationResponse> verifyBatch(
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            @RequestPart(value = "file", required = false) MultipartFile file,
            HttpServletRequest request) throws Exception {

        List<MultipartFile> allFiles = new ArrayList<>();
        if (files != null) {
            allFiles.addAll(files);
        }
        if (file != null) {
            allFiles.add(file);
        }
        if (request instanceof MultipartHttpServletRequest multipartReq) {
            multipartReq.getMultiFileMap().forEach((paramName, paramFiles) -> {
                for (MultipartFile f : paramFiles) {
                    if (!allFiles.contains(f)) {
                        allFiles.add(f);
                    }
                }
            });
        }

        if (allFiles.isEmpty()) {
            throw new IllegalArgumentException("No files uploaded for batch verification");
        }

        List<BatchVerificationService.CredentialFileEntry> entries =
                batchVerificationService.extractAndValidateFiles(allFiles);

        BatchVerificationResponse response =
                batchVerificationService.processBatch(entries, currentVerifierId());

        return ResponseEntity.ok(response);
    }

    @PostMapping(
            value = "/verify/batch/csv",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = "text/csv"
    )
    public ResponseEntity<String> exportCsv(
            @RequestBody BatchVerificationResponse response) {

        String csv = batchVerificationService.generateCsv(response);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"batch-verification-report.csv\"")
                .body(csv);
    }

    @GetMapping(
            value = "/anchor/{credentialNumber}",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<AnchorLookupResponse> anchor(
            @PathVariable String credentialNumber) {

        AnchorLookupResponse response =
                verificationService.lookupAnchor(
                        credentialNumber
                );

        if (response == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping(
            value = "/history",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<VerificationHistoryResponse>> history(
            Authentication authentication) {

        return ResponseEntity.ok(
                verificationHistoryService.listHistory(
                        currentUserId(authentication)
                )
        );
    }

    private UUID currentVerifierId() {

        Authentication authentication =
                SecurityContextHolder.getContext()
                        .getAuthentication();

        if (authentication != null
                && authentication.getPrincipal()
                instanceof UUID userId) {
            return userId;
        }

        return null;
    }

    private UUID currentUserId(
            Authentication authentication) {

        return (UUID) authentication.getPrincipal();
    }
}