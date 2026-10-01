import { z } from "zod";

export const PAY_NOTICE_VERSION = "2026-10-01.1";
export const payNoticeInputSchema = z.object({
  professionalId: z.string().min(1).max(100),
  primaryLanguage: z.enum(["en", "es"]),
  reason: z.enum(["hiring", "change"]),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Choose a valid effective date."),
  trainingRate: z.number().min(17).max(200).multipleOf(0.01).nullable(),
  regularRate: z.number().min(17).max(200).multipleOf(0.01),
  leadRate: z.number().min(17).max(200).multipleOf(0.01).nullable(),
  preparerName: z.string().trim().min(2).max(120),
  preparerTitle: z.string().trim().min(2).max(80),
});
export type PayNoticeInput = z.infer<typeof payNoticeInputSchema>;
const money = (value: number) => `$${value.toFixed(2)}`;

export function payNoticeText(input: PayNoticeInput, employeeName: string, language: "en" | "es") {
  const es = language === "es";
  const rates = [
    input.trainingRate === null ? null : es ? `${money(input.trainingRate)} por hora: capacitación supervisada (normalmente 3–5 turnos).` : `${money(input.trainingRate)} per hour: supervised training (normally 3–5 shifts).`,
    es ? `${money(input.regularRate)} por hora: limpieza regular${input.trainingRate === null ? "." : ", a partir del siguiente turno después de completar la capacitación y recibir la confirmación de habilidades."}` : `${money(input.regularRate)} per hour: regular cleaning${input.trainingRate === null ? "." : ", starting with the next shift after training completion and skills sign-off."}`,
    input.leadRate === null ? null : es ? `${money(input.leadRate)} por hora: trabajo como líder de equipo cuando SoHo te asigne esa función.` : `${money(input.leadRate)} per hour: lead cleaner work when SoHo assigns that role.`,
  ].filter(Boolean).join("\n");
  return es ? `SOHO CLEANING GROUP — AVISO INDIVIDUAL DE PAGO
Aviso y reconocimiento de la remuneración y el día de pago conforme al artículo 195.1 de la Ley del Trabajo del Estado de Nueva York
Versión: ${PAY_NOTICE_VERSION}

Empleado/a: ${employeeName}
Idioma principal declarado: ${input.primaryLanguage === "es" ? "Español" : "Inglés"}
Motivo: ${input.reason === "hiring" ? "Al contratar" : "Antes de un cambio de remuneración"}
Fecha de entrada en vigor: ${input.effectiveDate}

EMPLEADOR
Nombre legal: SoHo Cleaning Group LLC
Nombre comercial: SoHo Cleaning Group
Dirección física: 245 Elizabeth St, New York, NY 10012
Dirección postal: 245 Elizabeth St, New York, NY 10012
Teléfono: +1 (646) 530-0590

REMUNERACIÓN
Base de pago: por hora
${rates}
${input.trainingRate === null ? "" : "Si no se completa la capacitación después de cinco turnos, SoHo hablará contigo sobre el siguiente paso."}
Beneficios aplicados al salario mínimo (propinas, comidas, alojamiento u otros): Ninguno.
Semana laboral: de lunes a domingo.
Frecuencia: semanal.
Día de pago habitual: el viernes siguiente a la semana laboral.

HORAS EXTRAS
Las horas trabajadas que excedan de 40 en una semana laboral se pagan, como mínimo, a 1.5 veces la tarifa regular legal de esa semana. Cuando se aplican varias tarifas, la tarifa base es el promedio ponderado: la remuneración ordinaria total dividida por las horas totales trabajadas. La tarifa puede variar según las horas trabajadas a cada tarifa. Los bonos no discrecionales, incluido el bono de calidad, se incluyen en la tarifa regular cuando la ley lo exige; nómina realiza los ajustes de horas extras correspondientes. Sin otras remuneraciones, una semana trabajada exclusivamente a la tarifa regular indicada arriba tiene una tarifa de horas extras de ${money(input.regularRate * 1.5)} por hora.

BONO DE CALIDAD
Bono de $10 por trabajo que cumpla los requisitos, dividido por igual entre los limpiadores asignados. Se requiere completar la lista del servicio y la verificación de SoHo. Si SoHo documenta una tarea incompleta, el bono se paga cuando se corrige y verifica. La ausencia de comentarios del cliente o de una reseña pública no descalifica por sí sola el trabajo. Se paga por nómina el primer día de pago habitual después de la verificación.

Preparado por: ${input.preparerName}, ${input.preparerTitle}

RECONOCIMIENTO
He recibido este aviso con mis tarifas, el cálculo de horas extras, la ausencia de beneficios aplicados al salario mínimo y mi día de pago. He indicado mi idioma principal. Recibí una copia en inglés${input.primaryLanguage === "es" ? " y español" : ""}. Mi firma confirma la recepción de este aviso. Puedo imprimir o guardar una copia. El empleador conserva el registro firmado por al menos seis años. Puedo hablar de mis salarios con mis compañeros de trabajo. Este aviso no limita ningún derecho legal.` : `SOHO CLEANING GROUP — INDIVIDUAL PAY NOTICE
Notice and acknowledgment of pay rate and payday under Section 195.1 of the New York State Labor Law
Version: ${PAY_NOTICE_VERSION}

Employee: ${employeeName}
Declared primary language: ${input.primaryLanguage === "es" ? "Spanish" : "English"}
Reason: ${input.reason === "hiring" ? "At hiring" : "Before a change in pay"}
Effective date: ${input.effectiveDate}

EMPLOYER
Legal name: SoHo Cleaning Group LLC
Business name: SoHo Cleaning Group
Physical address: 245 Elizabeth St, New York, NY 10012
Mailing address: 245 Elizabeth St, New York, NY 10012
Telephone: +1 (646) 530-0590

PAY
Pay basis: hourly
${rates}
${input.trainingRate === null ? "" : "If training is not complete after five shifts, SoHo will discuss the next step with you."}
Allowances claimed toward minimum wage (tips, meals, lodging or other): None.
Workweek: Monday through Sunday.
Pay frequency: weekly.
Regular payday: the following Friday for the preceding workweek.

OVERTIME
Hours worked over 40 in a workweek are paid at least 1.5 times the lawful regular rate for that week. For multiple rates, the base rate is the weighted average: total regular pay divided by total hours worked. The rate may vary with the hours worked at each rate. Nondiscretionary bonuses, including the quality bonus, are included in the regular rate when required by law; payroll makes the corresponding overtime adjustments. Without additional earnings, a week worked entirely at the regular cleaner rate above has an overtime rate of ${money(input.regularRate * 1.5)} per hour.

QUALITY BONUS
$10 per qualifying completed job, divided equally among assigned cleaners. The service checklist must be completed and SoHo must verify it. If SoHo documents an incomplete item, the bonus becomes payable after correction and verification. Missing customer feedback or a public review alone does not disqualify a job. Paid through payroll on the first regular payday after verification.

Prepared by: ${input.preparerName}, ${input.preparerTitle}

ACKNOWLEDGMENT
I received this notice of my pay rates, overtime calculation, no minimum-wage allowances, and designated payday. I told my employer my primary language. I received a copy in English${input.primaryLanguage === "es" ? " and Spanish" : ""}. My signature acknowledges receipt of this notice. I can print or save a copy. My employer retains the signed record for at least six years. I may discuss wages with coworkers. This notice does not limit any legal rights.`;
}

export function payNoticeSnapshot(input: PayNoticeInput, employeeName: string) {
  const english = payNoticeText(input, employeeName, "en");
  return input.primaryLanguage === "es" ? `${english}\n\n--------------------\n\n${payNoticeText(input, employeeName, "es")}` : english;
}
