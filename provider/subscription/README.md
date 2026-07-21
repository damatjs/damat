# `@damatjs/subscription`

Subscription contracts implemented by ordinary Damat module services.

`SubscriptionProviderService` extends `ModuleService` and makes the standard
subscription operations mandatory. All persistence, routes, credentials,
migrations, installation, and initialization remain normal module concerns.

The required lifecycle includes create/get/list, plan or quantity change,
immediate or period-end cancellation, pause, and resume. Mutations carry stable
idempotency keys, and raw webhook bytes support signature-first event parsing.
`SubscriptionRecord` exposes quantity, period dates, and period-end cancellation
state without prescribing a vendor's plan catalog or entitlement model.
