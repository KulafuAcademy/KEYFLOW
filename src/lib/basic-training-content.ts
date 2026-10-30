export type BasicTrainingMode =
  "keyboard" | "words" | "sentences" | "speed" | "free";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export const difficulties: Difficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export const keyboardLessons = [
  {
    title: "Home row",
    level: "1 / 8",
    text: "asdf jkl; asdf jkl; fj dk sl a;",
  },
  {
    title: "Home-row patterns",
    level: "2 / 8",
    text: "fall ask dad; all glad; flask;",
  },
  { title: "Top row", level: "3 / 8", text: "qwer tyui op query quiet power" },
  { title: "Bottom row", level: "4 / 8", text: "zxcv bnm zebra moves by noon" },
  {
    title: "All alphabet keys",
    level: "5 / 8",
    text: "the quick brown fox jumps over a lazy dog",
  },
  {
    title: "Uppercase and Shift",
    level: "6 / 8",
    text: "The Library Opens At Nine.",
  },
  {
    title: "Numbers",
    level: "7 / 8",
    text: "In 2025, 18 students read 240 pages.",
  },
  {
    title: "Punctuation",
    level: "8 / 8",
    text: "Good writing is clear, careful, and easy to follow!",
  },
] as const;

export const wordLists: Record<Difficulty, string[]> = {
  beginner: [
    "and",
    "book",
    "calm",
    "day",
    "easy",
    "family",
    "good",
    "help",
    "learn",
    "music",
    "people",
    "school",
    "small",
    "water",
    "write",
  ],
  intermediate: [
    "ability",
    "benefit",
    "community",
    "develop",
    "environment",
    "frequent",
    "improve",
    "journey",
    "measure",
    "opinion",
    "reliable",
    "resource",
    "similar",
    "support",
    "valuable",
  ],
  advanced: [
    "accessible",
    "consequently",
    "distribute",
    "emphasis",
    "inevitable",
    "nevertheless",
    "perspective",
    "preliminary",
    "significant",
    "sustainable",
    "transition",
    "unprecedented",
    "widespread",
  ],
};

export const sentenceLists: Record<Difficulty, string[]> = {
  beginner: [
    "The bus arrives at eight.",
    "We study English every day.",
    "My family lives near the park.",
    "Fresh water is important for everyone.",
    "She reads a short book after lunch.",
  ],
  intermediate: [
    "The library extended its opening hours to serve more students.",
    "Regular exercise can improve both physical health and concentration.",
    "Many residents prefer public transport when roads are busy.",
    "A clear plan helps a team complete complex work on time.",
    "Students learn new vocabulary when they use it in context.",
  ],
  advanced: [
    "Although digital services are convenient, reliable access remains unequal across communities.",
    "The survey indicates a gradual shift toward renewable sources of household energy.",
    "Investment in public transport can reduce congestion while improving regional access.",
    "Researchers should distinguish measurable evidence from assumptions about cause and effect.",
    "A sustainable policy balances immediate needs with long-term environmental costs.",
  ],
};

export const speedPassage = [
  "Clear communication grows through practice. A steady pace allows the hands to move with less tension, while careful attention helps each sentence remain accurate. Learners can build confidence by working in short sessions and reviewing their progress over time.",
  "A useful routine combines familiar words with new challenges. Begin with a comfortable rhythm, notice which keys need more attention, and keep the shoulders relaxed. Small improvements in accuracy often make later increases in speed easier to maintain.",
  "Writing is a process of selecting and arranging ideas. Strong paragraphs present one main point, explain why it matters, and connect it to relevant evidence. Readers can follow an argument more easily when transitions are clear and examples are specific.",
  "Communities change as people travel, study, and work in new ways. Public services can respond to these changes by gathering reliable information and listening to a range of residents. Decisions are more useful when they consider both current conditions and future needs.",
]
  .join(" ")
  .repeat(3);

export const starterPracticeText =
  "Choose a passage that interests you, paste it here, and practise reproducing it below. Your speed and accuracy are measured against this reference text.";
