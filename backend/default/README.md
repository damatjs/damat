# Damatjs API - Backend Developer Guide

A production-ready backend for the Damatjs design inspiration platform. Built with Hono, Prisma, PostgreSQL, Redis, and Stripe.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [Authentication System](#authentication-system)
- [Team & Organization Model](#team--organization-model)
- [API Keys & Usage Tracking](#api-keys--usage-tracking)
- [Billing & Credits](#billing--credits)
- [Rate Limiting](#rate-limiting)
- [Webhooks](#webhooks)
- [Caching Strategy](#caching-strategy)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Reference](#api-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
├──────────────┬──────────────┬──────────────┬───────────────────────┤
│   Frontend   │     MCP      │    Figma     │    External APIs      │
│   (React)    │   (Claude)   │   Plugin     │                       │
└──────┬───────┴──────┬───────┴──────┬───────┴───────────┬───────────┘
       │              │              │                   │
       │   Session    │         API Key Auth             │
       │   Cookie     │                                  │
       ▼              ▼              ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         HONO API SERVER                              │
├─────────────────────────────────────────────────────────────────────┤
│  Middleware Stack:                                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ CORS    │→│ Auth    │→│ Rate    │→│ Credit  │→│ Logging │       │
│  │         │ │         │ │ Limit   │ │ Check   │ │         │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│  Routes:                                                             │
│  /api/v1/auth/*        - User authentication                        │
│  /api/v1/teams/*       - Team management                            │
│  /api/v1/api-keys/*    - API key management                         │
│  /api/v1/billing/*     - Billing & credits                          │
│  /api/v1/webhooks/*    - Webhook configuration                      │
│  /api/v1/sections/*    - Core API (search, embed, images)           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis     │  │   Stripe     │
│  + pgvector  │  │              │  │              │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ • Users      │  │ • Sessions   │  │ • Customers  │
│ • Teams      │  │ • Rate Limits│  │ • Subscrip.  │
│ • API Keys   │  │ • Cache      │  │ • Invoices   │
│ • Usage Logs │  │ • Locks      │  │ • Webhooks   │
│ • Sections   │  │              │  │              │
│ • Embeddings │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Key Design Decisions

1. **Team-Centric Model**: All billing and API keys belong to teams, not users. Users can be members of multiple teams.

2. **Dual Authentication**: 
   - Session-based auth for web dashboard (cookie)
   - API key auth for programmatic access (MCP, Figma, external)

3. **Credit-Based Billing**: Operations consume credits. Teams purchase credits or get them via subscriptions.

4. **Redis for Performance**: Sessions, rate limits, and frequently accessed data cached in Redis.

5. **Comprehensive Logging**: Every API request logged with timing, cost, and metadata for billing and debugging.

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- Stripe account (for billing)

### Quick Start

```bash
# Clone and install
cd backend
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Start dependencies (Docker)
docker-compose up -d db redis

# Setup database
npm run db:push
npm run db:generate

# Start development server
npm run dev
```

### Environment Variables

```bash
# Required
DATABASE_URL="postgresql://user:pass@localhost:5432/damatjs"
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY="sk-..."
CDN_BASE_URL="https://your-cdn.cloudfront.net"
AUTH_SECRET="min-32-character-secret-key-here"

# Stripe (required for billing)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Optional
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

---

## Project Structure

```
src/
├── config/
│   └── index.ts              # Centralized configuration with validation
│
├── generated/
│   └── prisma/               # Auto-generated Prisma client
│
├── middleware/
│   ├── auth.ts               # Authentication middlewares
│   └── error.ts              # Global error handling
│
├── routes/
│   ├── auth.ts               # POST /auth/login, /register, etc.
│   ├── teams.ts              # Team CRUD & member management
│   ├── apiKeys.ts            # API key management (dashboard)
│   ├── billing.ts            # Stripe integration & credits
│   ├── webhooks.ts           # Webhook configuration
│   └── sections.ts           # Core search/embed API
│
├── services/
│   ├── auth.ts               # User auth, sessions, passwords
│   ├── team.ts               # Team & membership logic
│   ├── apiKey.ts             # API key validation, usage logging
│   ├── billing.ts            # Stripe operations
│   ├── webhook.ts            # Webhook delivery
│   └── search.ts             # Vector similarity search
│
├── types/
│   └── index.ts              # TypeScript interfaces & errors
│
├── utils/
│   ├── db.ts                 # Prisma client singleton
│   ├── redis.ts              # Redis client & helpers
│   ├── logger.ts             # Structured logging
│   ├── embedding.ts          # OpenAI embeddings
│   └── image.ts              # Image processing
│
└── index.ts                  # App entry point
```

---

## Database Schema

### Core Entities

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────<│ TeamMember  │>────│    Team     │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id          │     │ userId      │     │ id          │
│ email       │     │ teamId      │     │ name        │
│ name        │     │ role        │     │ slug        │
│ image       │     │ invitedAt   │     │ plan        │
│ emailVerif. │     │ acceptedAt  │     │ credits     │
└─────────────┘     └─────────────┘     │ creditsUsed │
       │                                 │ stripeId    │
       │                                 └──────┬──────┘
       ▼                                        │
┌─────────────┐                                 │
│   Session   │                    ┌────────────┼────────────┐
├─────────────┤                    ▼            ▼            ▼
│ token       │             ┌──────────┐ ┌──────────┐ ┌──────────┐
│ userId      │             │  ApiKey  │ │ UsageLog │ │ Invoice  │
│ expiresAt   │             ├──────────┤ ├──────────┤ ├──────────┤
└─────────────┘             │ teamId   │ │ teamId   │ │ teamId   │
                            │ keyHash  │ │ apiKeyId │ │ stripeId │
                            │ scopes   │ │ action   │ │ status   │
                            │ rateLimit│ │ credits  │ │ total    │
                            └──────────┘ │ timing   │ └──────────┘
                                         └──────────┘
```

### Team Roles

| Role | Permissions |
|------|-------------|
| `owner` | Full access, can delete team, transfer ownership |
| `admin` | Manage members, API keys, webhooks |
| `billing` | View billing, purchase credits, manage subscription |
| `member` | Use API keys, view team info |
| `viewer` | Read-only access |

### API Key Scopes

| Scope | Access |
|-------|--------|
| `all` | Full API access |
| `sections_read` | GET /sections/* |
| `sections_search` | POST /sections/search |
| `embed` | POST /sections/embed |
| `images` | GET /sections/:id/image |
| `team_read` | Read team info via API |

---

## Authentication System

### Session Auth (Web Dashboard)

```typescript
// Login flow
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response sets cookie: session=<token>
// Cookie is httpOnly, secure, sameSite=Lax

// Subsequent requests include cookie automatically
GET /api/v1/teams
Cookie: session=abc123...
```

### API Key Auth (Programmatic)

```typescript
// Two ways to authenticate:

// 1. Authorization header (preferred)
GET /api/v1/sections/search
Authorization: Bearer ag_k3j4h5k6j7h8g9f0...

// 2. X-API-Key header
GET /api/v1/sections/search
X-API-Key: ag_k3j4h5k6j7h8g9f0...
```

### Session Management

```typescript
// Sessions stored in both PostgreSQL and Redis
// Redis for fast lookups, PostgreSQL for persistence

// Session refresh: If session > 1 day old, expiry extended
// Default session lifetime: 7 days
// All sessions invalidated on password change
```

---

## Team & Organization Model

### Creating a Team

```typescript
// When user registers, a default team is created
// Users can create additional teams

POST /api/v1/teams
Authorization: Bearer <session>
{
  "name": "My Agency",
  "slug": "my-agency"  // optional, auto-generated if not provided
}
```

### Member Invitation Flow

```typescript
// 1. Admin invites member
POST /api/v1/teams/:teamId/members/invite
{
  "email": "newmember@example.com",
  "role": "member"
}
// Returns: { token, expiresAt }

// 2. Email sent with invitation link (implement in your email service)
// Link: https://app.example.com/invite?token=xxx

// 3. Invited user accepts (must be logged in with matching email)
POST /api/v1/teams/invitations/accept
{
  "token": "invitation-token"
}
```

---

## API Keys & Usage Tracking

### API Key Lifecycle

```typescript
// 1. Create key (returns full key ONCE)
POST /api/v1/api-keys/:teamId
{
  "name": "Production Key",
  "scopes": ["sections_search", "embed"],
  "rateLimit": 100  // optional, requests per minute
}
// Response: { key: "ag_xxx...", apiKey: { id, keyPrefix: "ag_xxx..." } }

// 2. Key is hashed and stored
// Only keyPrefix (first 12 chars) stored for display

// 3. On each request, key is validated:
//    - Hash lookup in cache/database
//    - Check: isActive, not expired, team active
//    - Check: has required scope
//    - Check: rate limit not exceeded
//    - Check: team has sufficient credits

// 4. Usage logged with full details
```

### Usage Log Entry

```typescript
interface UsageLog {
  requestId: string;      // Unique request identifier
  teamId: string;         // For billing
  apiKeyId: string;       // Which key was used
  
  // Request info
  endpoint: string;       // "/api/v1/sections/search"
  method: string;         // "POST"
  action: UsageAction;    // "SEARCH_SECTIONS"
  
  // Results
  responseStatus: number; // 200
  resultCount: number;    // 5
  creditsCharged: number; // 2
  responseTimeMs: number; // 234
  
  // Client info
  ipAddress: string;
  userAgent: string;
  
  // Timestamp
  createdAt: Date;
}
```

---

## Billing & Credits

### Credit Costs

| Operation | Credits |
|-----------|---------|
| `SEARCH_SECTIONS` | 2 |
| `EMBED_TEXT` | 1 |
| `FETCH_IMAGE` | 1 |
| `GET_SECTION` | 1 |
| `LIST_SECTIONS` | 1 |

### Plan Tiers

| Plan | Credits | Rate Limit (per min) | API Keys | Members |
|------|---------|---------------------|----------|---------|
| Free | 1,000 | 20 | 2 | 1 |
| Starter | 10,000 | 60 | 5 | 5 |
| Pro | 100,000 | 120 | 20 | 20 |
| Enterprise | Unlimited | 500 | Unlimited | Unlimited |

### Stripe Integration

```typescript
// 1. Subscribe to a plan
POST /api/v1/billing/:teamId/subscribe
{
  "plan": "pro",
  "successUrl": "https://app.example.com/billing?success=true",
  "cancelUrl": "https://app.example.com/billing"
}
// Returns: { checkoutUrl: "https://checkout.stripe.com/..." }

// 2. Purchase credits (one-time)
POST /api/v1/billing/:teamId/purchase-credits
{
  "packageId": "credits_5000",
  "successUrl": "...",
  "cancelUrl": "..."
}

// 3. Stripe webhook processes payment
POST /api/v1/billing/webhook
// Handles: checkout.session.completed, invoice.paid, subscription.updated, etc.
```

---

## Rate Limiting

### Implementation

```typescript
// Sliding window algorithm using Redis sorted sets
// Checks multiple windows: minute, hour, day

// Rate limit headers included in every response:
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 2024-01-15T10:30:00Z

// When limit exceeded:
HTTP 429 Too Many Requests
Retry-After: 45
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": { "retryAfter": 45 }
  }
}
```

### Rate Limit Hierarchy

1. **Plan default** - Base limit from team's plan
2. **API key override** - Can set custom limit per key (lower only)
3. **Endpoint specific** - Some endpoints may have additional limits

---

## Webhooks

### Available Events

| Event | Trigger |
|-------|---------|
| `credits_low` | Credits below threshold (default: 100) |
| `credits_depleted` | Credits exhausted |
| `credits_purchased` | Credits added via purchase |
| `invoice_paid` | Stripe invoice paid |
| `invoice_failed` | Payment failed |
| `subscription_created` | New subscription |
| `subscription_cancelled` | Subscription cancelled |
| `member_joined` | New member accepted invite |
| `member_removed` | Member removed from team |
| `api_key_created` | New API key created |
| `api_key_revoked` | API key revoked |

### Webhook Payload

```typescript
// All webhooks signed with HMAC-SHA256
// Header: X-Webhook-Signature: <signature>

{
  "event": "credits_low",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "remaining": 50,
    "threshold": 100
  }
}

// Verify signature:
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

### Delivery & Retries

- Timeout: 30 seconds
- Max retries: 3
- Backoff: 2^attempt seconds (2s, 4s, 8s)
- Delivery history retained for debugging

---

## Caching Strategy

### What's Cached

| Data | TTL | Invalidation |
|------|-----|--------------|
| Sessions | Until expiry | On logout, password change |
| API key validation | 5 min | On key update/revoke |
| Team info | 5 min | On team update |
| Rate limit counters | Window duration | Automatic |

### Cache Keys

```
session:<token>           - Session data
apikey:hash:<hash>        - Validated API key info
team:<teamId>             - Team details
ratelimit:<keyId>:minute  - Rate limit counter
cache:<custom>            - Application cache
lock:<resource>           - Distributed locks
```

---

## Error Handling

### Error Response Format

```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "path": "email", "message": "Invalid email format" }
    ]
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid auth |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/auth.test.ts

# Watch mode
npm test -- --watch
```

### Test Structure

```typescript
// tests/auth.test.ts
describe('Auth Service', () => {
  describe('Password hashing', () => {
    it('should hash and verify passwords', async () => {
      const hash = await hashPassword('test123');
      expect(await verifyPassword('test123', hash)).toBe(true);
      expect(await verifyPassword('wrong', hash)).toBe(false);
    });
  });
});
```

---

## Deployment

### Docker

```bash
# Build image
docker build -t asset-gallery-api .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f api
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `AUTH_SECRET` (32+ random chars)
- [ ] Configure Stripe webhook endpoint
- [ ] Set up SSL termination (nginx/cloudflare)
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Set up monitoring (health check endpoint)
- [ ] Configure log aggregation
- [ ] Set up database backups
- [ ] Configure Redis persistence

### Health Check

```bash
curl http://localhost:3000/health

{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "2.0.0",
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "redis": { "status": "healthy", "latency": 1 }
  }
}
```

---

## API Reference

See [API_FRONTEND.md](./docs/API_FRONTEND.md) for frontend integration guide.
See [API_MCP.md](./docs/API_MCP.md) for MCP server integration.
See [API_FIGMA.md](./docs/API_FIGMA.md) for Figma plugin integration.

---

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Write tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit pull request

## License

MIT
