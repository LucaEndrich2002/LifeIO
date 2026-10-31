import { z } from "zod";

// Configure before client modules initialize. Zod's caught Function() probe
// still emits a CSP violation; use its interpreter under our strict policy.
z.config({ jitless: true });
