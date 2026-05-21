
import { defineModule } from "@damatjs/services";
import UserModuleService from "./service";
import credentials from "./config";

export const USER_MODULE = "user";

const definition = defineModule(USER_MODULE, {
    service: UserModuleService,
    credentials,
});


export default definition;
