import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strip Cyrillic characters from input (all text fields except reviews)
export function noCyrillic(value: string): string {
  return value.replace(/[\u0400-\u04FF]/g, '')
}
