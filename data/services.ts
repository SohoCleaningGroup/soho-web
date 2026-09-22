export type Service = {
  slug: string;
  name: string;
  navLabel: string;
  eyebrow: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  intro: string;
  image: string;
  bestFor: string[];
  included: string[];
  highlights: Array<{ title: string; description: string }>;
};

export const services: Service[] = [
  {
    slug: "standard-cleaning",
    name: "Standard Apartment Cleaning",
    navLabel: "Standard Cleaning",
    eyebrow: "Reliable upkeep for Manhattan homes",
    metaTitle: "Standard Apartment Cleaning in Manhattan",
    metaDescription:
      "Book insured standard apartment cleaning in Manhattan with SoHo Cleaning Group's trained, in-house team. Thoughtful care for kitchens, bathrooms and living spaces.",
    summary:
      "A consistent, room-by-room reset for apartments and condos that need dependable upkeep.",
    intro:
      "Our standard cleaning service restores the everyday comfort of your home with careful attention to kitchens, bathrooms, bedrooms and living areas. It is a strong choice for routine maintenance or a professional refresh before guests arrive.",
    image: "/images/home/service-standard.jpg",
    bestFor: [
      "Apartments and condos that are cleaned regularly",
      "Busy households that need dependable upkeep",
      "A polished reset before guests or after a busy week",
    ],
    included: [
      "Dusting accessible surfaces and furnishings",
      "Vacuuming rugs, carpets and floors",
      "Mopping hard flooring",
      "Cleaning and sanitizing bathroom surfaces",
      "Cleaning kitchen counters, sink and appliance exteriors",
      "Making beds and straightening living spaces",
      "Removing household trash",
    ],
    highlights: [
      {
        title: "Consistent standards",
        description:
          "A clear room-by-room process helps deliver the same careful result each visit.",
      },
      {
        title: "In-house professionals",
        description:
          "Your home is cared for by SoHo Cleaning Group team members—not anonymous subcontractors.",
      },
      {
        title: "Manhattan-ready",
        description:
          "Our service is built around apartments, condos, doormen, elevators and city schedules.",
      },
    ],
  },
  {
    slug: "deep-cleaning",
    name: "Deep Apartment Cleaning",
    navLabel: "Deep Cleaning",
    eyebrow: "Detailed care from top to bottom",
    metaTitle: "Deep Cleaning Service in Manhattan",
    metaDescription:
      "Detailed deep cleaning for Manhattan apartments and condos. SoHo Cleaning Group handles built-up dust, kitchen residue and bathroom detail with insured, in-house cleaners.",
    summary:
      "A more intensive clean for built-up dust, overlooked surfaces and homes ready for a true reset.",
    intro:
      "Deep cleaning expands on our standard service with added time and detail for areas that accumulate residue and dust. It is designed to bring the home back to a stronger baseline before recurring service or after a demanding season.",
    image: "/images/home/service-deep.jpg",
    bestFor: [
      "First-time visits and homes without recent professional cleaning",
      "Seasonal resets and post-event recovery",
      "Homes preparing to begin recurring service",
    ],
    included: [
      "Everything included in standard cleaning",
      "Detailed attention to baseboards and trim",
      "Cleaning reachable doors, frames and switch plates",
      "Extra kitchen degreasing and cabinet-front cleaning",
      "Detailed bathroom fixtures, tile and buildup removal",
      "Dusting reachable vents, ledges and overlooked surfaces",
      "Focused cleaning around furniture and high-use areas",
    ],
    highlights: [
      {
        title: "More time for detail",
        description:
          "The visit is planned for buildup and overlooked areas—not rushed like a maintenance clean.",
      },
      {
        title: "A stronger baseline",
        description:
          "Deep cleaning creates a clean starting point that is easier to maintain going forward.",
      },
      {
        title: "Optional add-ons",
        description:
          "Interior oven and refrigerator cleaning can be selected during booking when needed.",
      },
    ],
  },
  {
    slug: "move-in-move-out-cleaning",
    name: "Move-In & Move-Out Cleaning",
    navLabel: "Move-In / Move-Out",
    eyebrow: "A clean handoff for your next chapter",
    metaTitle: "Move-In & Move-Out Cleaning in Manhattan",
    metaDescription:
      "Move-in and move-out cleaning for Manhattan apartments and condos. Prepare an empty home for keys, inspection or arrival with SoHo Cleaning Group's insured team.",
    summary:
      "Detailed cleaning for empty or nearly empty homes before keys change hands.",
    intro:
      "Moving is already demanding. Our move-in and move-out service focuses on the empty-home details that matter during a handoff, helping renters, owners and buyers leave or enter a space with confidence.",
    image: "/images/home/service-move.jpg",
    bestFor: [
      "Renters preparing for a final walkthrough",
      "Buyers and tenants moving into a new home",
      "Owners preparing an apartment for a new resident",
    ],
    included: [
      "Detailed cleaning of empty rooms and closets",
      "Kitchen counters, cabinets, sink and appliance exteriors",
      "Bathroom fixtures, tile and high-touch surfaces",
      "Baseboards, doors, frames and reachable ledges",
      "Vacuuming and mopping throughout",
      "Interior cabinet and drawer cleaning when accessible and empty",
      "Final trash removal and presentation check",
    ],
    highlights: [
      {
        title: "Handoff focused",
        description:
          "The clean is organized around the condition of an empty home and the details noticed at inspection.",
      },
      {
        title: "Clear scheduling",
        description:
          "Choose a date around movers, elevators, keys and building access during booking.",
      },
      {
        title: "Arrival-ready finish",
        description:
          "We focus on delivering a fresh, orderly space before furniture and boxes come in.",
      },
    ],
  },
  {
    slug: "recurring-cleaning",
    name: "Recurring Apartment Cleaning",
    navLabel: "Recurring Cleaning",
    eyebrow: "A consistently clean home, on your schedule",
    metaTitle: "Recurring Apartment Cleaning in Manhattan",
    metaDescription:
      "Weekly, biweekly and monthly apartment cleaning in Manhattan from SoHo Cleaning Group's insured, in-house team. Keep your home consistently clean with dependable care.",
    summary:
      "Weekly, biweekly or monthly care that keeps your home consistently polished.",
    intro:
      "Recurring cleaning removes the work of starting over every time. We maintain the core areas of your apartment on a dependable schedule, with clear standards and attention to the way your household uses the space.",
    image: "/images/home/service-recurring.jpg",
    bestFor: [
      "Households that want a consistently clean home",
      "Busy professionals and families",
      "Clients who value a familiar process and predictable schedule",
    ],
    included: [
      "Weekly, biweekly or monthly scheduling",
      "Standard room-by-room cleaning on every visit",
      "Kitchen and bathroom cleaning and sanitizing",
      "Dusting, vacuuming and mopping throughout",
      "Bed making and general straightening",
      "Visit notes for access and household preferences",
      "Simple online booking and secure payment authorization",
    ],
    highlights: [
      {
        title: "A dependable rhythm",
        description:
          "Choose the frequency that matches your home, schedule and maintenance needs.",
      },
      {
        title: "Preference aware",
        description:
          "Access notes, pets and household details are captured as part of the booking process.",
      },
      {
        title: "Quality accountability",
        description:
          "A clear service standard makes it easier to track consistency from visit to visit.",
      },
    ],
  },
];

export function getService(slug: string) {
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    throw new Error(`Unknown service: ${slug}`);
  }

  return service;
}
