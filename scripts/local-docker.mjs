import { spawnSync } from "node:child_process";

export const dockerCommand =
  process.platform === "win32" ? "docker.exe" : "docker";

export function runDocker(args) {
  return spawnSync(dockerCommand, args, {
    timeout: 15_000,
    windowsHide: true,
    encoding: "utf8",
  });
}

export function readDockerEndpoint() {
  // DOCKER_CONTEXT takes precedence over DOCKER_HOST in Docker CLI.
  if (!process.env.DOCKER_CONTEXT && process.env.DOCKER_HOST) {
    return process.env.DOCKER_HOST;
  }
  const result = runDocker([
    "context",
    "inspect",
    ...(process.env.DOCKER_CONTEXT ? [process.env.DOCKER_CONTEXT] : []),
    "--format",
    "{{json .Endpoints.docker.Host}}",
  ]);
  try {
    return result.status === 0 ? JSON.parse(result.stdout) : undefined;
  } catch {
    return undefined;
  }
}

export function isLocalDockerEndpoint(endpoint) {
  return (
    typeof endpoint === "string" &&
    (endpoint.startsWith("unix:///") ||
      /^npipe:\/\/\/\/(?:\.|localhost)\/pipe\//i.test(endpoint) ||
      /^tcp:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d+\/?$/i.test(endpoint))
  );
}
