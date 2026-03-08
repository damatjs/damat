/**
 * Migration Logger
 *
 * Colored console output utilities for migration commands.
 */

import { MigrationLogLevel } from '../../types';


/** Icons for each log level */
const LOG_ICONS: Record<MigrationLogLevel, string> = {
  info: "○",
  success: "✓",
  warn: "⚠",
  error: "✗",
  skip: "→",
};

/** ANSI color codes for each log level */
const LOG_COLORS: Record<MigrationLogLevel, string> = {
  info: "\x1b[36m", // cyan
  success: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  skip: "\x1b[90m", // gray
};

/** ANSI reset code */
const RESET = "\x1b[0m";

/**
 * Log a message with colored icon.
 *
 * @param level - Log level (info, success, warn, error, skip)
 * @param message - Main message text
 * @param details - Optional additional details (shown in gray)
 */
export function log(
  level: MigrationLogLevel,
  message: string,
  details?: string,
): void {
  const icon = LOG_ICONS[level];
  const color = LOG_COLORS[level];
  const detailsText = details ? ` ${LOG_COLORS.skip}${details}${RESET}` : "";

  console.log(`${color}${icon}${RESET} ${message}${detailsText}`);
}

/**
 * Print a horizontal separator line.
 *
 * @param length - Length of the line (default: 50)
 */
export function separator(length: number = 50): void {
  console.log("─".repeat(length));
}

/**
 * Print a success banner.
 *
 * @param message - Success message
 */
export function successBanner(message: string): void {
  separator();
  console.log(`\x1b[32m✓ ${message}\x1b[0m`);
  separator();
}

/**
 * Print an error banner.
 *
 * @param message - Error message
 */
export function errorBanner(message: string): void {
  separator();
  console.log(`\x1b[31m✗ ${message}\x1b[0m`);
  separator();
}
