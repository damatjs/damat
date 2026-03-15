import { IndexColumnConfig } from '@/types';
import { IndexBuilder } from './base';

/**
 * Create a new index builder
 */
export function index(columns: (string | IndexColumnConfig)[]): IndexBuilder {
  return new IndexBuilder(columns);
}

export * from "./base"
export * from "./convertIndex"