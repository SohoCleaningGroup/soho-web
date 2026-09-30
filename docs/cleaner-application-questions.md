# Cleaner application questions — staging

The professional application uses a warmer introduction and six mobile-friendly steps. Weekday availability matches the existing service schedule. New applicants explicitly choose Yes or No for ten experience/work-style questions and write a short response to the existing small-number-of-dishes scenario. Nothing is preselected; No does not automatically reject an applicant. An optional context box follows the questions.

Server validation requires all ten booleans and a scenario response of 10–1500 characters. The ProfessionalProfile.screeningResponses nullable JSONB field stores a versioned snapshot of question wording and answers. Admin applicant detail shows each response plus private scenario-review guidance. Existing applications remain readable and display a legacy notice rather than default No answers.

Schema applied only to oaarnwczslhbpfxchygu (replacement staging). Prisma migration 20260930195223_cleaner_application_questions is saved for the future production rollout. RLS and browser grants were unchanged; Security Advisor still has no errors/warnings.

Validation: six focused tests cover No vs missing answers, invalid values, historical/legacy records, API persistence and incomplete-application rejection. TypeScript and focused ESLint passed. Tests mock phone verification, data writes and notifications; no real applicant, ID upload, email or text was created.
