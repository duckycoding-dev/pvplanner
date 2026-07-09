export type Lang = "it" | "en";

export interface LandingCopy {
  meta: { title: string; description: string };
  nav: { how: string; features: string; faq: string; cta: string };
  hero: {
    h1: string;
    sub: string;
    cta: string;
    micro: string;
    trust: [string, string, string, string];
    verdictBox: { payback: string; battery: string; selfConsumption: string };
  };
  problem: { h2: string; intro: string; points: { title: string; body: string }[]; closing: string };
  how: { h2: string; steps: { title: string; body: string; privacyNote?: string }[] };
  features: { h2: string; items: { title: string; body: string; shot: string; alt: string }[] };
  notModeled: { h2: string; intro: string; points: { title: string; body: string }[]; closing: string };
  privacy: { h2: string; points: { title: string; body: string }[] };
  faq: { h2: string; items: { q: string; a: string }[] };
  finalCta: { h2: string; body: string; cta: string; micro: string };
  footer: {
    product: { label: string; links: { text: string; href: string }[] };
    project: { label: string; links: { text: string; href: string }[] };
    data: { label: string; links: { text: string; href: string }[] };
    bottom: string;
  };
  /** Solo IT: invito a passare alla versione inglese. */
  langHint?: { text: string; link: string };
}
