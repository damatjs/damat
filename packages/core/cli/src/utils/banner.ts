import type { CliConfig, BannerConfig } from "../types";

function padRight(str: string, length: number): string {
  return str + " ".repeat(Math.max(0, length - str.length));
}

function repeat(char: string, count: number): string {
  return char.repeat(count);
}

export function printBanner(
  config: CliConfig,
  bannerConfig: BannerConfig = {}
): void {
  const style = bannerConfig.style ?? "boxed";
  const title =
    bannerConfig.title ?? config.name ?? "CLI";
  const subtitle = bannerConfig.subtitle ?? config.description ?? "";

  if (style === "none") return;

  if (style === "minimal") {
    console.log(`\n${title}\n${subtitle ? subtitle + "\n" : ""}`);
    return;
  }

  const titleLength = Math.max(title.length, subtitle.length);
  const boxWidth = Math.max(titleLength + 4, 60);
  const line = repeat("─", boxWidth);

  console.log(`\n┌${line}┐`);
  console.log(`│${padRight(`  ${title}`, boxWidth)}│`);

  if (subtitle) {
    console.log(`├${line}┤`);
    console.log(`│${padRight(`  ${subtitle}`, boxWidth)}│`);
  }

  console.log(`└${line}┘\n`);
}
