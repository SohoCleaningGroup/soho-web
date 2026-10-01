import { z } from "zod";
import { CLEANER_APPLICATION_QUESTIONS, KITCHEN_SCENARIO_CHOICES, KITCHEN_SCENARIO_QUESTION } from "./cleaner-application-questions";

export const cleanerScreeningSchema = z.object({
  screeningAnswers: z.record(z.enum(CLEANER_APPLICATION_QUESTIONS.map(item => item.id)), z.boolean()),
  kitchenScenarioAnswer: z.enum(KITCHEN_SCENARIO_CHOICES),
});

export function buildCleanerScreeningSnapshot(data: z.infer<typeof cleanerScreeningSchema>) {
  return {
    version: "2026-10-01",
    responses: CLEANER_APPLICATION_QUESTIONS.map(item => ({ ...item, answer: data.screeningAnswers[item.id] })),
    scenario: { question: KITCHEN_SCENARIO_QUESTION, answer: data.kitchenScenarioAnswer },
  };
}

const snapshotSchema = z.object({
  version: z.string(),
  responses: z.array(z.object({ id: z.string(), question: z.string(), answer: z.boolean() })),
  scenario: z.object({ question: z.string(), answer: z.string() }),
});

export function readCleanerScreeningSnapshot(value: unknown) {
  const result = snapshotSchema.safeParse(value);
  return result.success ? result.data : null;
}
