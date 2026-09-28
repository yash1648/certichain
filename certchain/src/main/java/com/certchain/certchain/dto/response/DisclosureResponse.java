package com.certchain.certchain.dto.response;

import java.util.List;
import java.util.Map;

/**
 * The holder's own record of a credential: every claim, plus which
 * of them are withheld from verifiers. The full claim map is required
 * because the holder cannot choose what to hide without seeing it.
 */
public record DisclosureResponse(
        Map<String, Object> claims,
        List<String> hiddenClaims
) {
}
