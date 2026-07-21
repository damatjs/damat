import { SubscriptionProviderService } from "../src";

const Base = SubscriptionProviderService({ models: {} });

// @ts-expect-error A concrete subscription provider must implement all operations.
class IncompleteSubscriptionProvider extends Base {}

void IncompleteSubscriptionProvider;
