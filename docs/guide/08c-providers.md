[Damat Guide](../GUIDE.md) › Integration providers

# 8c. Integration providers

A Damat provider is a module service selected for a standardized role. It is
not a second artifact type or lifecycle. Provider modules use `kind: "module"`,
install with `damat module plan/add/update/remove`, initialize through the
module runtime, share the application database pool, and expose routes through
the normal module route mechanism.

[`@damatjs/provider`](../../packages/provider/README.md) exports the generic
`ProviderService` base. [`@damatjs/provider-auth`](../../provider/auth/README.md),
[`@damatjs/provider-payment`](../../provider/payment/README.md), and
[`@damatjs/provider-subscription`](../../provider/subscription/README.md) add strict
role-specific method contracts.

## Write a standard provider service

```ts
import { PaymentProviderService } from "@damatjs/provider-payment";
import { models } from "./models";

const Base = PaymentProviderService({
  models,
  credentialsSchema,
  cache: { prefix: "billing" },
  events: true,
});

export class BillingService extends Base {
  async createPayment(input) {
    const result = await chargeVendor(input, this.credentials);
    await this.payments.create({ data: result });
    return result;
  }

  getPayment(id) {
    return this.payments.findById(id);
  }

  listPayments(input) {
    return listVendorPayments(input, this.credentials);
  }

  capturePayment(input) {
    return captureVendorPayment(input, this.credentials);
  }

  cancelPayment(input) {
    return cancelVendorPayment(input, this.credentials);
  }

  async refundPayment(input) {
    return refundVendor(input, this.credentials);
  }

  getRefund(id) {
    return findVendorRefund(id, this.credentials);
  }

  parseWebhook(input) {
    return verifyAndParseVendorWebhook(input, this.credentials);
  }
}
```

The base is an extension of `ModuleService`, not a wrapper around it. Provider
methods can use generated model accessors, the shared entity manager,
transactions, credentials, caching, and events directly. Put SDK helpers in
small module-local `src/lib/` files.

`ProviderService({ role, ...moduleServiceConfig })` can define another standard.
Its role marker lets framework startup reject accidental cross-role binding.
Structural compatibility remains valid, so existing ordinary module services
can adopt a standard without changing their superclass.

## Bind one module per role

```ts
modules: {
  billing: { resolve: "./src/modules/billing" },
},
providers: {
  payment: { module: "billing" },
},
```

Each role selects exactly one already initialized module service. There is no
discovery, capability ambiguity, source factory, provider-owned database
context, or second instance. Payment and subscription contracts are available
to application code through typed `getProvider(role)`; only the auth standard
has framework HTTP behavior.

Payment's baseline covers creation, listing, capture, cancellation, refunds,
and raw-body webhook verification. Subscription's baseline covers creation,
listing, plan/quantity changes, cancellation, pause, and resume. These are
strict service contracts with raw-body webhook verification; vendor catalogs,
checkout, customer portals, entitlements, and public endpoints remain local
module behavior.

## Install and integrate

Provider modules keep `damat.json` as `kind: "module"` and use normal module
installation:

```bash
damat module plan <registry-ref|path|git-url>
damat module add <registry-ref|path|git-url>
bun run db:migrate
```

Installation notices tell the backend owner to add both `modules.<id>` and
`providers.<role>`. Provider-specific routes, health endpoints, shutdown work,
and middleware are ordinary module/application concerns; the framework has no
provider-only lifecycle. Remote payment and subscription effects should still
receive stable idempotency keys.

---

Prev: [← Authentication](./08b-authentication.md) · [Guide home](../GUIDE.md) · Next: [Workflows →](./09-workflows.md)
