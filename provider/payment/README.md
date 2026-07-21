# `@damatjs/provider-payment`

Payment contracts implemented by ordinary Damat module services.

`PaymentProviderService` extends `ModuleService` and makes the standardized
payment operations mandatory. Provider persistence, routes, workflows,
credentials, migrations, installation, and initialization remain normal module
concerns.

The mandatory lifecycle includes create/get/list, manual capture, cancellation,
refund creation and lookup, and verified webhook parsing. Every remote mutation
accepts an idempotency key. Amounts are integer minor units and currencies are
upper-case ISO 4217 codes. Refunds use their own `RefundRecord`; they are not
misrepresented as payments.

Customer upsert/lookup is optional because guest-payment providers do not
always expose a customer resource. `PaymentWebhookInput` carries raw bytes so a
module can verify the vendor signature before parsing untrusted payload data.
