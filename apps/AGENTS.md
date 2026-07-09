---
name: nextjs-project-structure
description: Enforces the Next.js project structure, coding patterns, module system, and conventions used across all projects built from the template-starter
---

# Next.js Project Structure & Conventions

This skill defines the architecture, file organization, coding patterns, and behaviors that every project based on this template must follow.

---

## Directory Structure

```
src/
├── app/                          # Next.js App Router (thin routing layer ONLY)
│   ├── globals.css               # Tailwind v4, CSS variables, custom utilities
│   ├── layout.tsx                # Root layout (RSC, fonts, metadata, analytics)
│   ├── not-found.tsx             # 404 page
│   ├── page.tsx                  # Home page and so one should not have the code tho but call the template starter that has it
│   └── [route]/                  # Route segments
│       └── page.tsx              # Imports template from modules, passes data
│
├── assets/
│   ├── fonts/
│   │   └── index.ts              # Font exports (Geist, Plus Jakarta Sans)
│   └── icons/
│       └── {iconName}.tsx        # SVG icon components (named exports)
│
├── lib/
│   ├── config.ts                 # SDK/service initialization (Medusa, etc.)
│   ├── constants.tsx             # App-wide constants and config maps
│   ├── context/
│   │   └── {name}-context.tsx    # React context providers
│   ├── data/
│   │   └── {service}/            # Server actions grouped by backend service
│   │       ├── {entity}.ts       # CRUD operations for that entity
│   │       └── cookies.ts        # Cookie/auth helpers
│   ├── schema/
│   │   └── {domain}/
│   │       └── index.ts          # Zod schemas + inferred types
│   ├── store/
│   │   ├── index.ts              # Redux store config
│   │   └── slices/
│   │       └── {name}Slice/
│   │           ├── index.ts      # Slice definition (createSlice)
│   │           └── hook.ts       # Typed hook for this slice
│   ├── utils/
│   │   ├── index.ts              # cn() and shared helpers
│   │   └── {utilName}.ts         # Single-purpose utility files
│   └── types/ (or src/types/)
│       ├── global.ts
│       └── {domain}.ts
│
├── modules/
│   ├── ui/
│   │   └── components/           # shadcn/ui primitives (button, card, form, etc.)
│   │       └── {component}.tsx   # kebab-case filenames
│   │
│   ├── common/
│   │   └── components/           # Shared components used across domains
│   │       └── {componentName}/
│   │           └── index.tsx
│   │
│   ├── layout/
│   │   └── components/           # Layout building blocks (titleSection, cards)
│   │       └── {componentName}.tsx
│   │
│   ├── skeletons/
│   │   ├── components/           # Individual skeleton components
│   │   │   └── {name}/index.tsx
│   │   └── templates/            # Full-page skeleton compositions
│   │       └── {name}/index.tsx
│   │
│   └── {domain}/                 # Feature domain (checkout, order, store, cart, etc.)
│       ├── components/
│       │   └── {componentName}/
│       │       ├── index.tsx     # Main component
│       │       ├── loading.tsx   # Loading/skeleton state (optional)
│       │       └── data.tsx      # Data fetching/transforms (optional)
│       └── templates/
│           ├── index.tsx         # Main template (entry point)
│           ├── loading.tsx       # Template-level skeleton (optional)
│           └── {subTemplate}/
│               ├── index.tsx
│               └── loading.tsx
│
├── types/
│   ├── global.ts
│   └── {domain}.ts               # Domain-specific types
│
public/
├── images/
│   └── {category}/               # Organized by category
└── {asset}.svg                   # Static SVG assets
```

---

## Core Architecture: Three-Tier Rendering

Pages are a **thin routing layer**. They fetch data and delegate rendering to module templates. This flow is **mandatory** — never put section markup or business logic in a page, and never let a template grow into a monolith that contains the sections' JSX inline.

```
src/app/[route]/page.tsx          → Calls the template (and any high-level function needed: data, metadata)
  └→ src/modules/{domain}/templates/index.tsx   → ORCHESTRATES components; may hold shared logic
       └→ src/modules/{domain}/components/*     → Domain-specific UI pieces (one section = one component)
           └→ src/modules/ui/components/*       → shadcn/ui primitives
           └→ src/modules/common/components/*   → Cross-domain reusable components
```

This is a **landing-page project** — it is not expected to be complex. Keep every layer simple; resist abstractions that the page does not need yet.

### Page files (`src/app/**/page.tsx`)

- MUST be thin: call the template plus any high-level function needed (data fetching, metadata) — nothing else
- NEVER contain layout markup, business logic, or direct UI composition
- MUST export `metadata` (see "SEO & AEO Requirements" below) — every page is SEO/AEO optimized, not just some

```tsx
// src/app/checkout/[cartId]/page.tsx
import { CheckoutTemplate } from "@/modules/checkout/templates"
import { retrieveCart } from "@/lib/data/medusa/cart"

export default async function CheckoutPage({ params }: { params: { cartId: string } }) {
  const cart = await retrieveCart(params.cartId)
  return <CheckoutTemplate cart={cart} />
}
```

### Template files (`src/modules/{domain}/templates/index.tsx`)

- The template's **whole job is to orchestrate components** — import sections, arrange them, pass data down — and optionally hold logic SHARED by several sections
- Contain NO section markup of their own; every visual section lives in its own component
- Own form setup (react-hook-form + zod), layout structure, submit handlers
- Mark `'use client'` only when the template needs interactivity (forms, state, effects)
- Async server component templates are valid for read-only data display with `<Suspense>`

### Component files (`src/modules/{domain}/components/{name}/index.tsx`)

- Single-responsibility UI pieces scoped to their domain — one page section = one component
- Never fetch data directly (except `data.tsx` pattern for server components)
- Pair with `loading.tsx` for skeleton states where applicable

### Component data: props vs hardcoded (decide per component)

The parent (template) passing data down as a typed prop — with the type kept alongside the component or in `src/types/{domain}.ts` — is the default, but it is **optional, not dogma**. Decide by uniqueness and reusability:

- **Reused or version-varied content** (the same section rendered with different copy/styling across pages or template versions) → data comes from a `data/` file, the template passes it as a typed prop
- **Truly one-off, unique components** (a section that exists exactly once and will never be reused) → its copy MAY be hardcoded inside the component; do not build a data file + prop plumbing nobody will ever use
- When in doubt, start hardcoded in the single component and extract to data/props the moment a second consumer appears

### Component size: hooks and subdivision

A component file must never get long. When one starts growing:

- **Logic getting long** (state machines, listeners, carousel wiring, form handling) → extract it into a hook: co-located `hook.ts` in the component dir, or `src/hooks/use{Name}.ts` if reusable. The component file keeps only markup + the hook call
- **Markup getting long** → subdivide into sibling files in the same component dir (e.g. `card.tsx`, `row.tsx`) with their own typed props
- Guideline: keep component files under ~150 lines; if you cross it, split

---

## shadcn/ui Configuration

**shadcn-first rule:** before building any UI primitive (button, input, select, textarea, card, dialog, accordion, carousel, form, label, badge, etc.) from scratch, check shadcn/ui. If shadcn has it, install and use it (`bunx shadcn@latest add <component>`); only hand-roll when no shadcn equivalent exists or the design genuinely cannot be expressed through one. Domain components compose shadcn primitives — they do not reimplement them.

shadcn components install into `src/modules/ui/components/`, NOT the default `src/components/ui/`.

**`components.json` aliases:**
```json
{
  "aliases": {
    "components": "@/modules/ui/templates",
    "utils": "@/lib/utils",
    "ui": "@/modules/ui/components",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**TSConfig path alias** maps `@/components/ui/*` to `./src/modules/ui/components/*` so standard shadcn imports work:
```tsx
import { Button } from "@/components/ui/button"
// resolves to src/modules/ui/components/button.tsx
```

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Directories (modules, components) | camelCase | `contactInformation/`, `cartSlice/` |
| Component files | `index.tsx` as entry, named variants | `index.tsx`, `loading.tsx`, `data.tsx` |
| shadcn/ui files | kebab-case | `radio-group.tsx`, `button.tsx` |
| Utility files | camelCase | `getProductPrice.ts`, `medusaError.ts` |
| Icon files | camelCase | `logoIcon.tsx`, `eyeOff.tsx` |
| Redux slices | camelCase + `Slice` suffix dir | `regionSlice/`, `cartSlice/` |
| Zod schemas | PascalCase + `Schema` suffix | `CheckoutFormSchema`, `ContactFormSchema` |
| Types | PascalCase + `Type` suffix for inferred | `CheckoutFormType`, `ContactFormType` |
| CSS custom utility classes | kebab-case | `sp-x`, `no-scrollbar` |

---

## Import Path Aliases

Use these aliases consistently. Prefer `@/` for most imports.

```
@/*                → ./src/*                    (primary alias)
@/components/ui/*  → ./src/modules/ui/components/*  (shadcn compat)
@lib/*             → ./src/lib/*                (used in data layer)
@modules/*         → ./src/modules/*            (used in templates)
```

---

## Data Fetching Pattern

All backend data operations live in `src/lib/data/{service}/` as **Next.js Server Actions**.

```tsx
"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders, getCacheOptions, getCacheTag } from "./cookies"
import medusaError from "@/lib/utils/medusaError"

export async function retrieveEntity(id: string) {
  const headers = { ...(await getAuthHeaders()) }
  const next = { ...(await getCacheOptions("entityTag")) }

  return await sdk.client
    .fetch<ResponseType>(`/store/entity/${id}`, {
      method: "GET",
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ data }) => data)
    .catch(medusaError)
}
```

Key rules:
- Always `"use server"` at top of file
- Always spread `getAuthHeaders()` and `getCacheOptions()` for auth and caching
- Always `revalidateTag()` after mutations
- Always `.catch(medusaError)` for centralized error handling
- Group by entity: `cart.ts`, `products.ts`, `orders.ts`, `customer.ts`

---

## Form Handling Pattern

Forms use `react-hook-form` + `zod` + shadcn `<Form>`.

1. **Schemas** defined in `src/lib/schema/{domain}/index.ts`
2. **Form setup** happens in the **template**, not in components
3. **Form context** passed down to components via the `form` prop (`UseFormReturn<T>`)
4. Components use `useFormContext` or receive `form` prop to access fields

```tsx
// Template: owns form setup
const form = useForm<CheckoutFormType>({
  resolver: zodResolver(CheckoutFormSchema),
  defaultValues: { ... },
})

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <DomainComponent form={form} />
    </form>
  </Form>
)
```

---

## State Management

- **Redux Toolkit** for global client state (`src/lib/store/`)
- Each slice in its own directory: `src/lib/store/slices/{name}Slice/`
  - `index.ts` — slice definition with `createSlice`
  - `hook.ts` — custom typed hook
- Store configured in `src/lib/store/index.ts` with `configureStore`
- The consuming project adds `<Provider store={store}>` in the root layout

---

## Client/Server Boundary Rules

- **Root layout** (`src/app/layout.tsx`) is always a Server Component
- **Templates** use `'use client'` ONLY when they need interactivity (forms, hooks, browser APIs)
- **Read-only templates** that fetch data use `async function` (server components) with `<Suspense>`
- **shadcn primitives** that use browser APIs already have `'use client'`
- Components needing `useState`, `useEffect`, `useForm`, event handlers MUST be `'use client'`

---

## Styling

### Hard rules (non-negotiable for new/edited code)

- **NO inline styles**: never use the `style={{...}}` attribute. If a value must be dynamic, drive it through a CSS variable defined in `globals.css` or a class toggle
- **NO raw color values** anywhere in classNames or CSS: no hex (`#181610`), no `rgb()`/`oklch()` literals, no Tailwind arbitrary color classes (`bg-[#0c111d]`, `text-[#94A3B8]`). Colors come ONLY from the design tokens in `globals.css` (`bg-background`, `text-primary`, `text-muted-foreground`, `border-border`, ...). If a design needs a new color, ADD a CSS variable to `globals.css` (`:root` + `@theme inline`) and use the token class
- **NO raw px values**: no arbitrary pixel classes (`w-[450px]`, `text-[11px]`, `top-[64px]`). Use the Tailwind spacing/type scale (rem-based) or define a token/utility in `globals.css`. Sizing that genuinely needs a fixed value gets a named CSS variable or custom utility, not a magic number in JSX
- Pre-existing violations in legacy version templates (v2–v6 hex/px classes) predate these rules — do not copy those patterns into new code, and migrate them to tokens whenever you touch those files

### Stack

- **Tailwind CSS v4** with `@import "tailwindcss"` syntax
- **tw-animate-css** for animation utilities
- **CSS variables** for theming in `globals.css` using `@theme inline` block
- **Custom brand colors** defined as CSS variables: `--primary`, `--subtext`, `--neon`, `--background`, etc.
- **`cn()` utility** from `@/lib/utils` (clsx + tailwind-merge) for conditional classes
- **Custom base utilities**: `sp-x` (responsive horizontal padding), `animate` (transition shorthand)
- **Class Variance Authority (cva)** for component variants (buttons, etc.)

---

## Tooling

| Tool | Purpose | Config File |
|------|---------|-------------|
| **Biome** | Linter + formatter (replaces ESLint/Prettier) | `biome.json` |
| **Tailwind v4** | CSS framework | `postcss.config.mjs` + `globals.css` |
| **React Compiler** | Auto-memoization | `next.config.ts` (`reactCompiler: true`) |
| **Bun** | Package manager | `bun.lock` |
| **TypeScript 5** | Type checking (strict mode) | `tsconfig.json` |

Scripts:
```
bun dev       → next dev
bun build     → next build
bun lint      → biome check
bun format    → biome format --write
```

---

## Root Layout (`src/app/layout.tsx`)

The root layout MUST:
- Import fonts from `@/assets/fonts` and apply as CSS variables on `<body>`
- Build SEO metadata from environment variables (SITE_NAME, SITE_DESCRIPTION, etc.)
- Conditionally inject analytics scripts (Google Analytics, Microsoft Clarity) in production only
- Wrap persistent global components (e.g., referral tracker) in `<Suspense>`
- NOT import or render navigation/footer — those are added by consuming projects

---

## Environment Variables

Template uses `.env.template` as the reference. Required variables:

```
MEDUSA_BACKEND_URL                # Backend API URL
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY # Storefront API key
NEXT_PUBLIC_DEFAULT_REGION        # Default region code
NEXT_PUBLIC_PUBLIC_URL            # Public-facing URL
SITE_NAME                        # Used in metadata
SITE_DESCRIPTION                  # Used in metadata
NEXT_PUBLIC_DOMAIN_URL            # Domain for OG images
NEXT_PUBLIC_DOMAIN_IMAGE          # OG image path
```

---

## SEO & AEO Requirements (every page)

Every page must ship SEO **and AEO** (Answer Engine Optimization — being citable/answerable by AI search engines) ready. When creating or editing a page, set up ALL of the following:

### SEO

- Export `metadata` (or `generateMetadata` for dynamic routes) with: `title`, `description`, `alternates.canonical`, `openGraph` (title, description, url, siteName, images, type), and `twitter` card
- Build URLs/site name from the env vars (`NEXT_PUBLIC_DOMAIN_URL`, `SITE_NAME`, `NEXT_PUBLIC_DOMAIN_IMAGE`) — never hardcode the domain
- Semantic HTML: exactly one `<h1>` per page, heading levels in order, `<main>`/`<section>`/`<article>`/`<nav>` landmarks, descriptive `alt` on every image, descriptive link text
- Maintain `src/app/sitemap.ts` and `src/app/robots.ts`; new routes must be added to the sitemap
- Dynamic routes use `generateStaticParams` where the data set is known

### AEO

- Add JSON-LD structured data per page via a `<script type="application/ld+json">` (rendered from a typed helper, e.g. `src/lib/utils/jsonLd.ts`): `Organization` + `WebSite` on the home page, `Article` (headline, author, datePublished, image) on posts, `BreadcrumbList` on nested routes, `FAQPage` wherever question/answer content exists, `ContactPage`/`LocalBusiness` (with addresses) on contact
- Write copy answer-first: the opening of each section should directly answer the question its heading implies, in plain language an answer engine can quote
- Prefer FAQ/Q&A formatted content where it fits the design, and keep facts (dates, stats, names) in machine-readable text — not only inside images

---

## Storybook (component catalog for reuse)

Storybook (`bun run storybook`, builds with `bun run build-storybook`) is the catalog of every reusable piece in this project. Its purpose is **reusability**: components are written clean enough to be listed, manipulated, and later pulled into other projects straight from the catalog.

Rules:

- **Every section component and every subcomponent gets a story**, co-located with the component (`index.stories.tsx` next to `index.tsx`, `card.stories.tsx` next to `card.tsx`). If a section is composed of multiple pieces, each piece is exported and gets its own story so it can be pulled separately
- **Stories use the real data**: import the module's `data/` files for `args` (the same slices the template passes). Controls then let you manipulate the content to explore the component's best case — never freeze copies of data inside stories
- **Document for sight-unseen reuse**: every story sets `parameters.docs.description.component` with 2–4 sentences covering what the component renders/looks like, which design language it belongs to, what data it needs, and when to use it. Assume someone will later pick components from descriptions alone
- Format: CSF3 with `satisfies Meta<typeof X>`, `tags: ["autodocs"]`, typed `StoryObj`, a `Default` story matching the live page, plus 1–2 genuinely informative variants (each with a one-line JSDoc)
- Title hierarchy: `{Domain}/{Version}/{Section}[/{Subcomponent}]` — e.g. `Home/V4 — The Ledger/Hero`, `Contact/Default/ContactForm/Field`, `Common/V5 Chrome/Reveal`, `UI/Button`
- Dark/tinted designs set the matching canvas via `globals: { backgrounds: { value: "v2Dark" | "v3Cream" | "v4Paper" | "v5Noir" | "v6Ivory" | "light" } }` (presets in `.storybook/preview.tsx`)
- `.storybook/preview.tsx` imports `globals.css` and provides font-variable fallbacks (`.storybook/preview.css`) since stories render outside the root layout
- A component that cannot be storybooked cleanly (hidden data imports, tangled state, copy baked into markup that should be props) is a smell — fix the component, don't skip the story

---

## When Creating New Features

1. Create the module directory: `src/modules/{domain}/`
2. Add `components/` and `templates/` subdirectories
3. Build components first (bottom-up, one section per component; shadcn primitives first), then compose them in a template that ONLY orchestrates
4. Add Zod schemas to `src/lib/schema/{domain}/index.ts` if forms are involved
5. Add server actions to `src/lib/data/{service}/{entity}.ts`
6. Create the thin page in `src/app/{route}/page.tsx` that calls the template and exports `metadata` (+ JSON-LD per the SEO & AEO section)
7. Add loading/skeleton variants for components and templates that fetch data
8. Add types to `src/types/{domain}.ts` if shared across modules; co-locate one-off prop types with the component
9. Extract hooks when component logic grows; subdivide when markup grows (~150-line guideline)
10. Style only with `globals.css` tokens — no inline styles, no raw px, no raw colors
11. Add a Storybook story for every new component and subcomponent (real-data args + reuse-grade description, per the Storybook section)
