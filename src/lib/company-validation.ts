/**
 * Validation rules and utilities for Company contact information in ScrapFlow.
 * Used across both frontend form validation and backend API validation.
 */

// Known typos of common email domains
export const TYPO_DOMAINS = new Set([
  "gamail.com",
  "gamil.com",
  "gmial.com",
  "gmai.com",
  "gmaill.com",
  "gmaild.com",
  "gemail.com",
  "gmaul.com",
  "gamil.co",
  "gmail.co",
  "yaho.com",
  "yahooo.com",
  "yahu.com",
  "yaho.co.in",
  "outlok.com",
  "outllok.com",
  "hotmial.com",
  "hotmaill.com",
  "redifmail.com",
  "rediffmial.com",
]);

// Known typos of Top-Level Domains (TLDs)
export const TYPO_TLDS = new Set([
  "con",
  "cpm",
  "comm",
  "coom",
  "cm",
  "ocm",
  "xom",
  "cmo",
  "vom",
]);

export type ValidationResult = {
  valid: boolean;
  error?: string;
  normalized?: string | null;
};

/**
 * Validates an Indian 10-digit mobile number.
 * Rules:
 * - Exactly 10 digits
 * - Only numbers 0-9
 * - Must start with 6, 7, 8, or 9
 * - No spaces, letters, +91, hyphens, or other special characters
 */
export function validatePhoneNumber(phone?: string | null): ValidationResult {
  if (phone === undefined || phone === null || phone === "") {
    return {
      valid: false,
      error: "Phone number is required. Enter a 10-digit Indian mobile number.",
    };
  }

  // Spaces check
  if (phone.includes(" ")) {
    return {
      valid: false,
      error: "Spaces are not allowed in the phone number.",
    };
  }

  // Country code / prefix check
  if (phone.startsWith("+") || phone.startsWith("+91")) {
    return {
      valid: false,
      error: "Do not include country code (+91). Enter only 10 digits.",
    };
  }

  // Hyphen / dash check
  if (phone.includes("-")) {
    return {
      valid: false,
      error: "Hyphens are not allowed in the phone number.",
    };
  }

  // Digits only check
  if (/[^\d]/.test(phone)) {
    return {
      valid: false,
      error: "Only numbers 0–9 are allowed. Letters and special characters are rejected.",
    };
  }

  // Length check
  if (phone.length !== 10) {
    return {
      valid: false,
      error: `Phone number must be exactly 10 digits (currently ${phone.length}).`,
    };
  }

  // Starting digit check (6, 7, 8, or 9)
  if (!/^[6-9]/.test(phone)) {
    return {
      valid: false,
      error: "Phone number must start with 6, 7, 8, or 9.",
    };
  }

  return { valid: true, normalized: phone };
}

/**
 * Validates email address format.
 * - Optional if blank/empty.
 * - If entered, must follow standard email syntax and reject obvious typos (.con, @gamail.com, etc.).
 * - Allows custom business domains (e.g. accounts@abcindustries.in).
 */
export function validateEmail(email?: string | null): ValidationResult {
  if (email === undefined || email === null || email.trim() === "") {
    return { valid: true, normalized: null };
  }

  const trimmed = email.trim();

  // No spaces
  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      error: "Email address cannot contain spaces.",
    };
  }

  // Exactly one '@' symbol
  const atCount = (trimmed.match(/@/g) || []).length;
  if (atCount === 0) {
    return {
      valid: false,
      error: "Email address must contain an '@' symbol.",
    };
  }
  if (atCount > 1) {
    return {
      valid: false,
      error: "Email address cannot contain multiple '@' symbols.",
    };
  }

  const [localPart, domainPart] = trimmed.split("@");

  // Local part validation
  if (!localPart) {
    return {
      valid: false,
      error: "Email address is missing username before '@'.",
    };
  }
  if (localPart.startsWith(".") || localPart.endsWith(".")) {
    return {
      valid: false,
      error: "Email username cannot start or end with a dot ('.').",
    };
  }
  if (localPart.includes("..")) {
    return {
      valid: false,
      error: "Email username cannot contain consecutive dots ('..').",
    };
  }
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) {
    return {
      valid: false,
      error: "Email username contains invalid characters.",
    };
  }

  // Domain part validation
  if (!domainPart) {
    return {
      valid: false,
      error: "Email address is missing domain after '@'.",
    };
  }
  if (domainPart.startsWith(".") || domainPart.endsWith(".")) {
    return {
      valid: false,
      error: "Email domain cannot start or end with a dot ('.').",
    };
  }
  if (domainPart.includes("..")) {
    return {
      valid: false,
      error: "Email domain cannot contain consecutive dots ('..').",
    };
  }
  if (!domainPart.includes(".")) {
    return {
      valid: false,
      error: "Email domain must include an extension (e.g., .com, .in).",
    };
  }

  const domainLower = domainPart.toLowerCase();

  // Typo domain check
  if (TYPO_DOMAINS.has(domainLower)) {
    return {
      valid: false,
      error: `Invalid email domain "${domainPart}". Did you mean @gmail.com or @yahoo.com?`,
    };
  }

  const labels = domainLower.split(".");
  for (const label of labels) {
    if (!label) {
      return {
        valid: false,
        error: "Email domain contains empty segment (e.g. company@.com).",
      };
    }
    if (label.startsWith("-") || label.endsWith("-")) {
      return {
        valid: false,
        error: "Email domain segment cannot start or end with a hyphen ('-').",
      };
    }
    if (!/^[a-z0-9-]+$/.test(label)) {
      return {
        valid: false,
        error: "Email domain contains invalid characters.",
      };
    }
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2) {
    return {
      valid: false,
      error: "Domain extension (TLD) must be at least 2 characters.",
    };
  }
  if (!/^[a-z]+$/.test(tld)) {
    return {
      valid: false,
      error: "Domain extension (TLD) must contain only letters.",
    };
  }
  if (TYPO_TLDS.has(tld)) {
    return {
      valid: false,
      error: `Invalid domain extension ".${tld}". Did you mean ".com"?`,
    };
  }

  return { valid: true, normalized: trimmed.toLowerCase() };
}

/**
 * Validates Indian Goods and Services Tax Identification Number (GSTIN).
 * - GSTIN is OPTIONAL (empty allowed).
 * - If entered:
 *   - Exactly 15 characters
 *   - Uppercase alphanumeric
 *   - Format: 2-digit state code (01-38, 97, 99) + 10-char PAN + 1 entity digit + 'Z' + check digit
 */
export function validateGstin(gstin?: string | null): ValidationResult {
  if (gstin === undefined || gstin === null || gstin.trim() === "") {
    return { valid: true, normalized: null };
  }

  const normalized = gstin.trim().toUpperCase();

  if (normalized.length !== 15) {
    return {
      valid: false,
      error: `GSTIN must be exactly 15 characters (currently ${normalized.length}).`,
      normalized,
    };
  }

  if (/[^A-Z0-9]/.test(normalized)) {
    return {
      valid: false,
      error: "GSTIN must contain only alphanumeric characters (A-Z, 0-9).",
      normalized,
    };
  }

  const stateCode = parseInt(normalized.slice(0, 2), 10);
  if (isNaN(stateCode) || stateCode < 1 || (stateCode > 38 && stateCode !== 97 && stateCode !== 99)) {
    return {
      valid: false,
      error: `Invalid GSTIN state code "${normalized.slice(0, 2)}". Indian state codes range from 01 to 38, 97, or 99.`,
      normalized,
    };
  }

  // Standard Indian GSTIN Regex: 2 digits state code + 5 letters PAN + 4 digits PAN + 1 letter PAN + 1 entity char + 'Z' + 1 check digit
  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
  if (!gstinPattern.test(normalized)) {
    return {
      valid: false,
      error: "Invalid GSTIN format (Expected: 2-digit state code + 10-char PAN + 1 entity digit + 'Z' + check digit).",
      normalized,
    };
  }

  return { valid: true, normalized };
}
