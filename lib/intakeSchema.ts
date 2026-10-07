import { z } from "zod";

/**
 * The rules a new draft must meet. The intake form holds them on the screen and the
 * client API holds them again, from this one definition, so a draft made by anything
 * but the form is refused the same way. The messages are the form's own.
 */
export const intakeSchema = z.object({
  title: z.string().min(3, "Give this deal a short name."),
  type: z.enum(["nda", "vendor", "msa", "employment"], {
    required_error: "Choose a contract type.",
  }),
  clientName: z.string().min(2, "Enter your company name."),
  counterpartyName: z.string().min(2, "Enter the counterparty's name."),
  counterpartyIsMsme: z.boolean(),
  transactionValue: z.coerce.number().min(0, "Transaction value cannot be negative."),
  durationMonths: z.coerce.number().min(1, "Enter the contract duration."),
  stateOfExecution: z.string().min(1, "Choose the state of execution."),
  governingLaw: z.string().min(2, "Enter the governing law."),
  keyTerms: z.string().optional(),
});

export type IntakeFormValues = z.infer<typeof intakeSchema>;
