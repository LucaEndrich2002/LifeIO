import {
  isLocalDockerEndpoint,
  readDockerEndpoint,
  runDocker,
} from "./local-docker.mjs";

const networkName = "lifeos-local";
const bindingOption = "com.docker.network.bridge.host_binding_ipv4";

try {
  if (!isLocalDockerEndpoint(readDockerEndpoint())) {
    throw new Error("Select a local Docker context. No daemon was contacted.");
  }

  let inspection = runDocker(["network", "inspect", networkName]);
  if (inspection.status !== 0) {
    const creation = runDocker([
      "network",
      "create",
      "--driver",
      "bridge",
      "--opt",
      `${bindingOption}=127.0.0.1`,
      networkName,
    ]);
    if (creation.status !== 0) {
      throw new Error(
        "Cannot create the LifeOS network. Check Docker Desktop.",
      );
    }
    inspection = runDocker(["network", "inspect", networkName]);
  }

  let network;
  try {
    network = JSON.parse(inspection.stdout)?.[0];
  } catch {
    // Keep daemon output out of the error message.
  }
  if (
    inspection.status !== 0 ||
    network?.Driver !== "bridge" ||
    network?.Options?.[bindingOption] !== "127.0.0.1"
  ) {
    throw new Error(
      "The lifeos-local network must use the bridge driver and bind published ports to 127.0.0.1. No existing network was modified.",
    );
  }
  console.log(
    "LifeOS Docker network verified: default binding is 127.0.0.1. Verify host ports after the first start.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
