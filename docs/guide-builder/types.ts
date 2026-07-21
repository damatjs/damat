export interface ChapterDefinition {
  id: string;
  title: string;
  summary: string;
  file?: string;
  order?: number;
}

export interface GuideSectionDefinition {
  id: string;
  title: string;
  chapters: ChapterDefinition[];
}

export interface PackageDefinition {
  dir: string;
  group: string;
  description?: string;
}

export interface PackageEntry {
  name: string;
  description: string;
  dir: string;
  readme: string;
  docsIndex: string | null;
  docs: string[];
}

export interface PackageGroup {
  group: string;
  packages: PackageEntry[];
}
