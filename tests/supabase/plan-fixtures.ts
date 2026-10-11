import { createFixture, removeFixture } from "./fixtures";
import type { Json } from "../../src/types/database";

export async function createPlanFixture({
  complete = true,
  skipIncome = false,
  skipFixed = false,
  skipGoal = false,
} = {}) {
  const user = await createFixture();
  try {
    const { error } = await user.client.from("profiles").insert({
      user_id: user.id,
      display_name: "Alex Plans",
      time_zone: "Europe/Berlin",
    });
    if (error) throw new Error("Could not prepare profile.");
    if (complete) {
      const steps: [string, Json][] = [
        [
          "income",
          skipIncome
            ? { decision: "skipped", month: "2026-09" }
            : {
                decision: "saved",
                name: "Gehalt",
                amount: 280000,
                month: "2026-09",
              },
        ],
        [
          "expenses",
          skipFixed
            ? { decision: "skipped" }
            : { decision: "saved", items: [{ name: "Miete", amount: 90000 }] },
        ],
        [
          "goal",
          skipGoal
            ? { decision: "skipped" }
            : {
                decision: "saved",
                name: "Reserve",
                target: 1000000,
                current: 350000,
                monthly: 50000,
              },
        ],
        ["tasks", { decision: "skipped" }],
        ["complete", {}],
      ];
      for (const [revision, [step, payload]] of steps.entries()) {
        const { error } = await user.client.rpc("save_onboarding_step", {
          p_step: step,
          p_payload: payload,
          p_revision: revision,
        });
        if (error) throw new Error("Could not prepare onboarding.");
      }
    }
    return user;
  } catch (error) {
    await removeFixture(user.id);
    throw error;
  }
}
