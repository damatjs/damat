# External API Service Module

Base classes for integrating with external APIs. Provides retry logic, circuit breaker pattern, and error handling out of the box.

## Directory Structure

```
external/
├── types.ts      # Type definitions (ApiRetryPolicy, CircuitBreakerConfig, etc.)
├── errors.ts     # Error classes (ExternalApiError, CircuitBreakerOpenError, etc.)
├── defaults.ts   # Default configurations for retry and circuit breaker
├── base.ts       # BaseExternalApiService abstract class
├── http.ts       # BaseHttpApiService for HTTP-based APIs
├── index.ts      # Re-exports all public APIs
└── EXTERNAL.md   # This documentation
```

## Usage

### Basic External API Service

```typescript
import { BaseExternalApiService } from "@damatjs/service";
import { getLogger } from "@damatjs/utils";

interface StripeClientConfig {
  apiKey: string;
  apiVersion: string;
}

class StripeService extends BaseExternalApiService<Stripe, StripeClientConfig> {
  constructor(config: StripeClientConfig) {
    super({
      serviceName: "stripe",
      clientConfig: config,
      logger: getLogger(), // Required: pass logger instance
      retry: {
        maxAttempts: 3,
        initialDelayMs: 100,
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeoutMs: 30000,
      },
    });
  }

  protected createClient(config: StripeClientConfig): Stripe {
    return new Stripe(config.apiKey, { apiVersion: config.apiVersion });
  }

  async createCustomer(email: string) {
    return this.withRetry("createCustomer", () =>
      this.client.customers.create({ email }),
    );
  }
}
```

### HTTP-Based API Service

```typescript
import { BaseHttpApiService } from "@damatjs/service";
import { getLogger } from "@damatjs/utils";

class GitHubService extends BaseHttpApiService {
  constructor(token: string) {
    super({
      serviceName: "github",
      clientConfig: {
        baseUrl: "https://api.github.com",
        auth: {
          type: "bearer",
          token,
        },
      },
      logger: getLogger(),
    });
  }

  async getUser(username: string) {
    return this.get<GitHubUser>(`/users/${username}`);
  }

  async createIssue(owner: string, repo: string, data: CreateIssueData) {
    return this.post<GitHubIssue>(`/repos/${owner}/${repo}/issues`, data);
  }
}
```

## Configuration

### ExternalApiConfig

| Property         | Type                            | Required | Default      | Description                                |
| ---------------- | ------------------------------- | -------- | ------------ | ------------------------------------------ |
| `serviceName`    | `string`                        | Yes      | -            | Name used in logs and error messages       |
| `clientConfig`   | `TClientConfig`                 | Yes      | -            | Configuration passed to `createClient()`   |
| `logger`         | `Logger`                        | Yes      | -            | Logger instance from `@damatjs/utils` |
| `retry`          | `Partial<ApiRetryPolicy>`       | No       | See defaults | Retry configuration                        |
| `circuitBreaker` | `Partial<CircuitBreakerConfig>` | No       | See defaults | Circuit breaker configuration              |
| `timeoutMs`      | `number`                        | No       | `30000`      | Default request timeout in milliseconds    |

### ApiRetryPolicy

| Property            | Type                 | Default            | Description                                  |
| ------------------- | -------------------- | ------------------ | -------------------------------------------- |
| `maxAttempts`       | `number`             | `3`                | Maximum retry attempts                       |
| `initialDelayMs`    | `number`             | `100`              | Initial delay between retries                |
| `maxDelayMs`        | `number`             | `5000`             | Maximum delay (caps exponential backoff)     |
| `backoffMultiplier` | `number`             | `2`                | Multiplier for exponential backoff           |
| `isRetryable`       | `(error) => boolean` | Network/5xx errors | Predicate to determine if error is retryable |

### CircuitBreakerConfig

| Property           | Type     | Default | Description                                      |
| ------------------ | -------- | ------- | ------------------------------------------------ |
| `failureThreshold` | `number` | `5`     | Failures before opening circuit                  |
| `resetTimeoutMs`   | `number` | `30000` | Time before attempting to close circuit          |
| `successThreshold` | `number` | `2`     | Successes needed to close circuit from half-open |

## Error Handling

### ExternalApiError

Thrown when an API call fails. Contains service name, operation, and optional status code.

```typescript
try {
  await service.someOperation();
} catch (error) {
  if (error instanceof ExternalApiError) {
    console.log(error.serviceName); // "stripe"
    console.log(error.operation); // "createCustomer"
    console.log(error.statusCode); // 400
  }
}
```

### CircuitBreakerOpenError

Thrown when the circuit breaker is open and the service is temporarily unavailable.

### MaxRetriesExhaustedError

Thrown when all retry attempts have been exhausted.

## Circuit Breaker States

1. **Closed**: Normal operation, requests pass through
2. **Open**: Circuit is tripped, all requests fail immediately
3. **Half-Open**: Testing if service has recovered, limited requests allowed

```
Closed → (failures >= threshold) → Open
Open → (resetTimeout elapsed) → Half-Open
Half-Open → (successes >= threshold) → Closed
Half-Open → (any failure) → Open
```

## Monitoring

```typescript
// Get current circuit breaker state
const state = service.getCircuitState();
console.log(state.state); // "closed" | "open" | "half-open"
console.log(state.failureCount); // number

// Manually reset circuit breaker
service.resetCircuitBreaker();
```
