import { adminHandlers } from "./handlers-admin";
import { userHandlers } from "./handlers-user";

export const handlers = [...userHandlers, ...adminHandlers];
