import { PaymentProviderService } from "../src";

const Base = PaymentProviderService({ models: {} });

// @ts-expect-error A concrete payment provider must implement every operation.
class IncompletePaymentProvider extends Base {}

void IncompletePaymentProvider;
