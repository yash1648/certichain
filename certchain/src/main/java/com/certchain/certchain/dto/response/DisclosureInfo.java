package com.certchain.certchain.dto.response;

/**
 * Tells a verifier how much of the credential they were shown, so a
 * partial view is never mistaken for the whole record.
 */
public record DisclosureInfo(
        int disclosed,
        int total,
        boolean complete
) {
}
