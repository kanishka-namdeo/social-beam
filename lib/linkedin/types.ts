import { launch } from "cloakbrowser";

export type PlaywrightBrowser = Awaited<ReturnType<typeof launch>>;
export type PlaywrightPage = Awaited<ReturnType<Awaited<ReturnType<PlaywrightBrowser["newContext"]>>["newPage"]>>;
