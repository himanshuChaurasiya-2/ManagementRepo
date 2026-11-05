import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

/**
 * Remove MongoDB query operator keys ($gt, $ne, etc.) and dots from an object
 * to protect against NoSQL injection.
 */
export const cleanNoSqlOperators = (data: any): any => {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map((item) => cleanNoSqlOperators(item));
  }

  if (typeof data === "object" && data.constructor === Object) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      // Reject or sanitize keys that start with '$' or contain '.'
      if (key.startsWith("$") || key.includes(".")) {
        continue;
      }
      cleaned[key] = cleanNoSqlOperators(data[key]);
    }
    return cleaned;
  }

  return data;
};

/**
 * Strip dangerous control characters and malicious script payloads from strings
 */
export const cleanStringInput = (val: string): string => {
  if (typeof val !== "string") return val;

  // Remove null bytes and dangerous control characters
  let cleaned = val.replace(/\0/g, "");

  // Remove dangerous script tags and inline event handlers
  cleaned = cleaned
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/onload\s*=/gi, "")
    .replace(/onerror\s*=/gi, "")
    .replace(/onclick\s*=/gi, "");

  return cleaned;
};

/**
 * Deep sanitize an entire payload for NoSQL injection and dangerous scripts
 */
export const deepSanitize = (data: any): any => {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return cleanStringInput(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => deepSanitize(item));
  }

  if (typeof data === "object" && data.constructor === Object) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (key.startsWith("$") || key.includes(".")) {
        continue;
      }
      cleaned[key] = deepSanitize(data[key]);
    }
    return cleaned;
  }

  return data;
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate standard email format
 */
export const isValidEmail = (email: any): boolean => {
  if (typeof email !== "string") return false;
  if (email.length > 254) return false;
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate MongoDB ObjectId
 */
export const isValidObjectId = (id: any): boolean => {
  if (!id || typeof id !== "string") return false;
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Enforce clean string with optional max length
 */
export const sanitizeString = (
  val: any,
  maxLength: number = 500,
  fallback: string = ""
): string => {
  if (typeof val !== "string") return fallback;
  const sanitized = cleanStringInput(val).trim();
  return sanitized.slice(0, maxLength);
};

/**
 * Escape special characters in string for safe use in MongoDB $regex queries
 */
export const escapeRegex = (str: string): string => {
  if (typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Sanitize website / redirect URLs to prevent javascript: or data: URIs
 */
export const sanitizeUrl = (url: any): string => {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  if (!trimmed.includes("://") && trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return "";
};

/**
 * Escape HTML special characters for safe email template interpolation
 */
export const escapeHtml = (unsafe: string = ""): string => {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ============================================================================
// EXPRESS MIDDLEWARES
// ============================================================================

/**
 * Safely sanitize properties of an object in-place without reassigning getter properties
 * (Compatible with Express 5 where req.query and req.params are getters)
 */
export const sanitizeObjectInPlace = (obj: any): void => {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else {
      obj[key] = deepSanitize(obj[key]);
    }
  }
};

/**
 * Middleware: Sanitize all inputs across body, query, and params in-place
 */
export const sanitizeInputs = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    if (req.body && typeof req.body === "object") {
      sanitizeObjectInPlace(req.body);
    }
    if (req.query && typeof req.query === "object") {
      sanitizeObjectInPlace(req.query);
    }
    if (req.params && typeof req.params === "object") {
      sanitizeObjectInPlace(req.params);
    }
  } catch (err) {
    console.error("Input sanitization warning:", err);
  }
  next();
};

/**
 * Middleware: Set modern security headers on all responses
 */
export const securityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
};

