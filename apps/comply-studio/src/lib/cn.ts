import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names and lets the last one win.
 *
 * What the vendored components are written against (ADR-0018). Plain `clsx`
 * would keep both of two conflicting utilities and leave which applies to
 * source order, so a caller could not override a component's own padding
 * without editing the component.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
