export const CLEANER_APPLICATION_QUESTIONS = [
  { id: "paidHomeCleaning", question: "Have you been paid to clean someone's home or apartment?" },
  { id: "cleaningTeam", question: "Have you worked for a cleaning company or as part of a cleaning team?" },
  { id: "regularClients", question: "Have you cleaned for the same client or employer regularly for at least six months?" },
  { id: "deepCleaning", question: "Have you performed deep cleans or move-in / move-out cleans?" },
  { id: "surfaceCare", question: "Do you have experience choosing safe products for delicate surfaces, such as marble, stone, or wood?" },
  { id: "checklists", question: "Are you comfortable following a cleaning checklist and checking your work before leaving?" },
  { id: "punctuality", question: "Can you arrive on time for scheduled jobs and let us know promptly if you are delayed?" },
  { id: "feedback", question: "Are you comfortable receiving feedback and revisiting an area that needs more attention?" },
  { id: "privacy", question: "Will you respect clients' privacy and ask permission before taking photos or sharing anything from their home?" },
  { id: "references", question: "Could you provide a work reference from a previous employer or client if we ask later?" },
] as const;

export type CleanerQuestionId = typeof CLEANER_APPLICATION_QUESTIONS[number]["id"];

export const KITCHEN_SCENARIO_QUESTION = "You arrive at a job and notice a small number of dishes left in the sink, even though dishes were not included in the service booked. What would you most likely do?";

export const KITCHEN_SCENARIO_CHOICES = [
  "Leave the dishes alone.",
  "Call the admin and ask what to do.",
  "Wash the dishes.",
] as const;

export const KITCHEN_SCENARIO_REVIEW_GUIDANCE = "There is no correct answer. Ask the applicant about their choice during the interview.";
