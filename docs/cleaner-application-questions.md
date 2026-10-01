# Cleaner application questions — staging

The professional application uses a warmer introduction and six mobile-friendly steps. Weekday availability matches the existing service schedule. New applicants explicitly choose Yes or No for ten experience/work-style questions and select one of three responses to the dishes-in-the-sink scenario: leave them alone, call admin, or wash them. There is no correct answer or automatic score. Nothing is preselected; No does not automatically reject an applicant. An optional context box follows the questions.

Server validation requires all ten booleans and one of the three scenario choices. The ProfessionalProfile.screeningResponses nullable JSONB field stores a versioned snapshot of question wording and answers. Admin applicant detail shows each response plus neutral interview guidance. Existing free-text scenario answers remain readable, and earlier applications without questions display a legacy notice rather than default No answers.

Staging ID and profile uploads failed on September 30 with StorageApiError `Bucket not found`. The private `professional-documents` and `professional-profiles` buckets were created in staging with file limits and MIME rules matching `supabase/migrations/20260923010000_prepare_replacement_security.sql`. On iPhone, ID photos are resized and converted to JPEG in the browser before upload; PDFs remain limited to 2 MB. The applicant sees the server's upload error if an upload fails.

Schema applied only to oaarnwczslhbpfxchygu (replacement staging). Prisma migration 20260930195223_cleaner_application_questions is saved for the future production rollout. RLS and browser grants were unchanged; Security Advisor still has no errors/warnings.

Validation: six focused tests cover No vs missing answers, invalid values, historical/legacy records, API persistence and incomplete-application rejection. TypeScript and focused ESLint passed. Tests mock phone verification, data writes and notifications; no real applicant, ID upload, email or text was created.
