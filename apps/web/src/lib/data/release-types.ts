export interface ReleaseNote {
  pkg: string;
  npmName: string;
  version: string;
  summary: string;
  sourceUrl: string;
}

export interface ReleaseGroup {
  version: string;
  notes: ReleaseNote[];
}
