// Public editorial content only. Private records and entitlements belong in the later shared backend.
export const academy = {
  name: "HKA Equestrian",
  subtitle: "Online Academy",
  tagline: "Rooted in Horsemanship. Inspired by Learning.",
  founder: "Hollie Zietsman",
  email: "hka.equestrian@gmail.com",
};

export const founderNote = [
  "I created HKA Equestrian to share my passion for horses and make thoughtful, practical learning easier to access. Wherever you live and wherever you are in your riding journey, I want you to feel encouraged, supported and able to keep progressing.",
  "My approach centres on confidence, understanding and the partnership between horse and rider. Whether you are learning the basics, caring for your horse or preparing for an event, my aim is to give you clear guidance and meaningful next steps, with horse welfare at the heart of everything we do.",
];

// Stable photo slots for future founder-managed original assets. No remote or generated images.
export const photoSlots = {
  hero: { label: "Horse & rider", description: "An original moment of connection", tone: "sage" },
  founder: { label: "Meet Hollie", description: "Hollie’s original portrait", tone: "sand" },
  riding: { label: "Rider development", description: "Hollie’s riding photograph", tone: "sage" },
  care: { label: "Care & connection", description: "Hollie’s horse-care photograph", tone: "sand" },
  knowledge: { label: "Always learning", description: "Hollie’s equestrian photograph", tone: "stone" },
  young: { label: "Little steps, big discoveries", description: "Hollie’s pony-learning photograph", tone: "clay" },
  competition: { label: "Ready for the next step", description: "Hollie’s competition photograph", tone: "olive" },
} as const;
export type PhotoSlot = keyof typeof photoSlots;

export const pathways: { id: string; title: string; description: string; audience: string; photo: PhotoSlot }[] = [
  { id: "riding", title: "Riding & Rider Development", description: "Explore confidence, understanding and the partnership between horse and rider.", audience: "For riders finding their feet or taking their next step.", photo: "riding" },
  { id: "horse-care", title: "Horse Care & Ownership", description: "Make thoughtful care and horse welfare part of your everyday understanding.", audience: "For horse owners, carers and those preparing for ownership.", photo: "care" },
  { id: "knowledge", title: "Equestrian Knowledge", description: "Make room for curiosity and a deeper understanding of the equestrian world.", audience: "For curious learners at every stage, including future teaching interests.", photo: "knowledge" },
  { id: "young-riders", title: "Young Riders & Pony Learning", description: "A welcoming pathway for younger learners discovering horses and ponies.", audience: "For young riders and the parents supporting their learning.", photo: "young" },
  { id: "competition", title: "Competition Preparation", description: "Approach your next event with thoughtful preparation and horse welfare in mind.", audience: "For riders and owners looking towards their next event.", photo: "competition" },
];

export const memberships = [
  { name: "Free", amount: 0, intro: "A place to begin.", features: [
    "Your account and profile",
    "One free introductory lesson per pathway, when published",
    "One horse profile with basic private records",
    "Access to your own retained history",
  ], note: "Introductory lessons will be available once Hollie publishes them." },
  { name: "HKA Basic", amount: 20, intro: "Learn at your own pace.", features: [
    "Everything in Free",
    "Published self-paced learning",
    "Lesson materials and quizzes",
    "Practice assignments",
    "Progress tracking",
  ], note: "Personal marking and unlimited coaching are not included." },
  { name: "HKA Premium", amount: 100, intro: "A more personal way forward.", features: [
    "Everything in HKA Basic",
    "One personalised monthly plan",
    "Two coach reviews per paid month: video up to five minutes each, or a written/practical submission",
    "Two private coaching question threads per paid month, one topic each",
    "One 30-minute online consultation per paid month",
  ], note: "Use support for riding, learning, horse care or event preparation. Course enrolment is not required for owner advice." },
];

export const membershipQuestions = [
  { question: "Can I join the academy now?", answer: "Not yet. You can explore the pathways and planned packages here. Account registration, published learning and membership enrolment will open after the academy’s next stages are ready. No payment is being collected." },
  { question: "Are in-person riding lessons included?", answer: "No. These are online academy memberships. In-person coaching is separately arranged where Hollie operates and is not automatically included in any package." },
  { question: "How do Premium allowances work?", answer: "The published allowances apply to each paid calendar-month billing period, with no automatic rollover. They cover riding, learning, ownership and care, or event preparation. Additional horse profiles and uploads will be subject to configured limits." },
  { question: "Is online learning limited to a country?", answer: "No. HKA welcomes riders, horse owners and learners internationally. Online learning is intended to be available worldwide." },
  { question: "Are courses and introductory lessons available?", answer: "Lessons have not been published yet. Each pathway will offer one free introductory lesson when Hollie supplies and publishes it. No sample lessons or completed course content are being presented in this preview." },
];
