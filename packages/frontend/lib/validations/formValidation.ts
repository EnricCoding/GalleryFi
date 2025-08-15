// lib/validation.ts
export const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
export const MAX_MB = 15;

export function validateFile(file: File | null): string | undefined {
  if (!file) return 'Image is required';
  if (!ALLOWED_TYPES.has(file.type)) return 'Only PNG, JPEG, WEBP, or GIF files are allowed';
  if (file.size > MAX_MB * 1024 * 1024) return `File size must be less than ${MAX_MB}MB`;
  return undefined;
}

export function validateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required';
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  if (trimmed.length > 80) return 'Name must be 80 characters or less';
  if (!/^[a-zA-Z0-9\s\-_.()]+$/.test(trimmed)) return 'Name contains invalid characters';
  return undefined;
}

export function validateDescription(desc: string): string | undefined {
  if (desc.trim().length > 1000) return 'Description must be 1000 characters or less';
  return undefined;
}

export function validateRoyalty(bps: number): string | undefined {
  if (!Number.isInteger(bps)) return 'Royalty must be a whole number';
  if (bps < 0) return 'Royalty cannot be negative';
  if (bps > 1000) return 'Royalty cannot exceed 10% (1000 bps)';
  return undefined;
}

export function validatePrice(price: string): string | undefined {
  if (!price.trim()) return 'Price is required';
  const num = Number(price);
  if (!Number.isFinite(num)) return 'Invalid price format';
  if (num <= 0) return 'Price must be greater than 0';
  if (num > 1000) return 'Price seems unreasonably high';
  if (!/^\d*\.?\d{0,6}$/.test(price)) return 'Price can have at most 6 decimal places';
  return undefined;
}

export function validateAll(
  file: File | null,
  name: string,
  desc: string,
  royaltyBps: number,
  priceEth: string,
): string | null {
  return (
    validateFile(file) ||
    validateName(name) ||
    validateDescription(desc) ||
    validateRoyalty(royaltyBps) ||
    validatePrice(priceEth) ||
    null
  );
}
