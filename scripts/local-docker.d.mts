import type { SpawnSyncReturns } from "node:child_process";
export const dockerCommand: string;
export function runDocker(args: string[]): SpawnSyncReturns<string>;
export function readDockerEndpoint(): unknown;
export function isLocalDockerEndpoint(endpoint: unknown): boolean;
