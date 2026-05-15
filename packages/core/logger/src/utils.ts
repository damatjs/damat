import { COLORS } from "./colors";

export function separator(length: number = 50): void {
  console.log("─".repeat(length));
}

export function successBanner(message: string): void {
  separator();
  console.log(`${COLORS.green}✓ ${message}${COLORS.reset}`);
  separator();
}

export function errorBanner(message: string): void {
  separator();
  console.log(`${COLORS.red}✗ ${message}${COLORS.reset}`);
  separator();
}
