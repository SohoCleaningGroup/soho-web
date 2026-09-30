import { createHash } from "node:crypto";

export const CLEANER_HIRING_TERMS_VERSION = "2026-09-30-draft-3";

// A stable snapshot is stored with each signature; edits require a new version.
export const CLEANER_HIRING_TERMS = `SoHo Cleaning Group — Hiring Terms & Acknowledgment
Version: ${CLEANER_HIRING_TERMS_VERSION}

1. Role and standards
You will perform the cleaning services assigned by SoHo Cleaning Group using the service checklist and cleaner handbook. Treat each customer's home, belongings, privacy, and access information with care. Work safely, follow product instructions, report hazards or damage promptly, and ask before accepting work outside the booked scope.

2. Scheduling and communication
Review each assignment before accepting it. Arrive on time and tell SoHo promptly if you are delayed or cannot attend. Communicate with customers through approved channels and keep customer information confidential. Use only approved job links and photo procedures.

3. First 90 days
Your first 90 days are an introductory period. SoHo will assess work quality, reliability, communication, safety, and care for customer homes, and provide feedback. Coaching or warnings may be given when appropriate, but no fixed number of warnings is promised. Completing this period does not guarantee continued employment.

4. Training and pay
Paid training is normally three to five supervised shifts at $25 per hour. SoHo uses a skills checklist to confirm training completion. Starting with the next shift after sign-off, the regular cleaner rate is $30 per hour. If training is not complete after five shifts, SoHo will discuss the next step with you rather than leave the training rate open-ended. Lead cleaners may earn up to $35 per hour; an individual's exact lead rate is stated in their separate offer and pay notice.

5. Workweek, payday, and bonuses
The workweek runs Monday through Sunday. SoHo pays weekly on the following Friday for hours worked during that workweek. Record all time worked accurately, including required training and travel between customer jobs during the workday. Overtime is handled according to applicable law. Your individual pay rate, overtime rate, and required wage information are provided in a separate written pay notice. SoHo offers a $10 quality bonus per qualifying completed job, divided equally among the cleaners assigned to that job. A job qualifies when its service checklist is completed and SoHo verifies the work against that checklist, using finished-job photos and the customer's private approval or attention response when available. Missing customer feedback or a public review alone does not disqualify a job. If SoHo documents an incomplete checklist item, the bonus becomes payable when the issue is corrected and verified. The bonus is paid on the first regular payday after verification through payroll. Never pressure customers for a particular rating or public review.

6. Employment and concerns
Employment is at will unless a separate signed agreement says otherwise. Either you or SoHo may end it at any time, subject to applicable law. Raise safety, pay, scheduling, or workplace concerns promptly with SoHo. Nothing here limits legally protected leave or your right to report concerns without retaliation.

By signing, you acknowledge that you read and received these terms and the cleaner handbook. Your signature records the terms version above. The separate pay notice and legally required employee notices remain separate documents.`;

export const CLEANER_HIRING_TERMS_HASH = createHash("sha256").update(CLEANER_HIRING_TERMS).digest("hex");

export const CLEANER_HIRING_TERMS_ES = `SoHo Cleaning Group — Términos de contratación y acuse de recibo
Versión: ${CLEANER_HIRING_TERMS_VERSION}

1. Función y estándares
Realizarás los servicios de limpieza asignados por SoHo Cleaning Group siguiendo la lista de tareas y el manual para el personal de limpieza. Trata con cuidado el hogar, las pertenencias, la privacidad y la información de acceso de cada cliente. Trabaja de manera segura, sigue las instrucciones de los productos, informa pronto de peligros o daños y consulta antes de aceptar tareas fuera del servicio contratado.

2. Horarios y comunicación
Revisa cada asignación antes de aceptarla. Llega a tiempo y avisa pronto a SoHo si vas a llegar tarde o no puedes asistir. Comunícate con los clientes por los canales aprobados y mantén confidencial su información. Usa solo los enlaces de trabajo y los procedimientos de fotos aprobados.

3. Primeros 90 días
Tus primeros 90 días son un período introductorio. SoHo evaluará la calidad del trabajo, la responsabilidad, la comunicación, la seguridad y el cuidado de los hogares, y te dará comentarios. Puede haber orientación o advertencias cuando corresponda, pero no se promete un número fijo de advertencias. Completar este período no garantiza la continuidad del empleo.

4. Capacitación y pago
La capacitación remunerada normalmente comprende de tres a cinco turnos supervisados a $25 por hora. SoHo usa una lista de habilidades para confirmar que terminaste la capacitación. A partir del siguiente turno después de esa confirmación, la tarifa de limpieza regular es de $30 por hora. Si la capacitación no se completa después de cinco turnos, SoHo hablará contigo sobre el siguiente paso en vez de dejar indefinida la tarifa de capacitación. Quienes lideran el equipo pueden ganar hasta $35 por hora; la tarifa exacta de cada persona se indica en su oferta y aviso de pago separados.

5. Semana laboral, día de pago y bonos
La semana laboral va de lunes a domingo. SoHo paga semanalmente el viernes siguiente por las horas trabajadas durante esa semana. Registra correctamente todo el tiempo trabajado, incluida la capacitación obligatoria y el traslado entre servicios de clientes durante la jornada. Las horas extras se pagan conforme a la ley aplicable. Tu tarifa individual, tarifa de horas extras y demás información salarial obligatoria se proporcionan en un aviso de pago por escrito y por separado. SoHo ofrece un bono de calidad de $10 por cada servicio terminado que cumpla los requisitos, dividido por igual entre las personas asignadas a ese servicio. El servicio cumple los requisitos cuando se completa su lista de tareas y SoHo verifica el trabajo con esa lista, usando fotos del trabajo terminado y la respuesta privada del cliente sobre si todo está bien o algo necesita atención cuando esté disponible. La falta de comentarios del cliente o de una reseña pública por sí sola no descalifica el servicio. Si SoHo documenta una tarea incompleta de la lista, el bono se paga cuando el problema se corrige y verifica. El bono se paga por nómina el primer día de pago habitual después de la verificación. Nunca presiones a los clientes para que den una calificación determinada o una reseña pública.

6. Empleo y preocupaciones
El empleo es a voluntad de ambas partes, salvo que un acuerdo firmado por separado indique otra cosa. Tú o SoHo pueden terminarlo en cualquier momento, conforme a la ley aplicable. Comunica pronto a SoHo cualquier preocupación sobre seguridad, pago, horarios o el lugar de trabajo. Nada de lo aquí escrito limita el tiempo libre protegido por ley ni tu derecho a informar preocupaciones sin represalias.

Al firmar, confirmas que leíste y recibiste estos términos y el manual para el personal de limpieza. Tu firma registra la versión indicada arriba. El aviso de pago y los avisos laborales exigidos por ley son documentos separados.`;

export function hiringTerms(language: "en" | "es") {
  const text = language === "es" ? CLEANER_HIRING_TERMS_ES : CLEANER_HIRING_TERMS;
  return { text, version: CLEANER_HIRING_TERMS_VERSION, hash: createHash("sha256").update(text).digest("hex") };
}
