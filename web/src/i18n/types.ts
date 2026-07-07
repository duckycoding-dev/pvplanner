export type Lang = "it" | "en";

/** Dizionario piatto: chiavi gerarchiche "wizard.location.title" → testo tradotto. */
export interface Dict {
  [key: string]: string;
}
