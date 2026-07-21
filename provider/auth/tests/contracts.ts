import { AuthProviderService } from "../src";

const Base = AuthProviderService({ models: {} });

// @ts-expect-error A concrete auth provider must implement every operation.
class IncompleteAuthProvider extends Base {}

void IncompleteAuthProvider;
