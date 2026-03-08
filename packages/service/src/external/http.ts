/**
 * External API Service - HTTP Base Class
 *
 * Base class for HTTP-based external APIs with convenience methods
 * for common HTTP operations.
 */

import { BaseExternalApiService } from "./base";
import type { HttpApiConfig } from "./types";

/**
 * Base class for HTTP-based external APIs
 */
export abstract class BaseHttpApiService extends BaseExternalApiService<
  typeof fetch,
  HttpApiConfig
> {
  protected createClient(): typeof fetch {
    return fetch;
  }

  /**
   * Make an HTTP request
   */
  protected async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      headers?: Record<string, string>;
      query?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const { baseUrl, headers: defaultHeaders, auth } = this.config.clientConfig;

    // Build URL with query params
    let url = `${baseUrl}${path}`;
    if (options.query) {
      const params = new URLSearchParams(options.query);
      url += `?${params.toString()}`;
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...defaultHeaders,
      ...options.headers,
    };

    // Add auth header
    if (auth) {
      switch (auth.type) {
        case "bearer":
          headers["Authorization"] = `Bearer ${auth.token}`;
          break;
        case "basic":
          const credentials = btoa(`${auth.username}:${auth.password}`);
          headers["Authorization"] = `Basic ${credentials}`;
          break;
        case "api-key":
          headers[auth.headerName ?? "X-API-Key"] = auth.token ?? "";
          break;
      }
    }

    return this.withRetry(`${method} ${path}`, async () => {
      const response = await this.client(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw this.wrapError(
          `${method} ${path}`,
          new Error(errorBody || response.statusText),
          response.status,
        );
      }

      return response.json() as Promise<T>;
    });
  }

  // HTTP method shortcuts
  protected get<T>(path: string, query?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, query ? { query } : undefined);
  }

  protected post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, { body });
  }

  protected put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, { body });
  }

  protected patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, { body });
  }

  protected del<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
