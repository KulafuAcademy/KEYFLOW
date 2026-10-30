export type BasicTrainingMode =
  "keyboard" | "words" | "sentences" | "speed" | "free";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export const difficulties: Difficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

type KeyboardExercise = {
  id: string;
  title: string;
  objective: string;
  difficulty: Difficulty;
  keys: string;
  text: string;
};

export const keyboardStages: {
  id: string;
  title: string;
  exercises: KeyboardExercise[];
}[] = [
  {
    id: "home-row",
    title: "Stage 1 · Home Row",
    exercises: [
      {
        id: "home-01",
        title: "Find the home anchors",
        objective:
          "Place both hands on the home row and reach each anchor key.",
        difficulty: "beginner",
        keys: "A S D F G H J K L ;",
        text: "asdf jkl; asdf jkl;",
      },
      {
        id: "home-02",
        title: "Left-hand reaches",
        objective: "Build an even rhythm across the left-hand home keys.",
        difficulty: "beginner",
        keys: "A S D F G",
        text: "asdfg fdsa asdfg fdsa",
      },
      {
        id: "home-03",
        title: "Right-hand reaches",
        objective: "Build an even rhythm across the right-hand home keys.",
        difficulty: "beginner",
        keys: "H J K L ;",
        text: "hjkl; ;lkjh hjkl; ;lkjh",
      },
      {
        id: "home-04",
        title: "Home-row pairs",
        objective:
          "Move between neighboring fingers without lifting the hands.",
        difficulty: "beginner",
        keys: "A S D F G H J K L ;",
        text: "as df fg hj jk kl l; sa df gh jk",
      },
      {
        id: "home-05",
        title: "Alternating hands",
        objective: "Alternate smoothly between left and right hand keys.",
        difficulty: "beginner",
        keys: "A S D F G H J K L ;",
        text: "aj sk dl f; gh hg fd sa jk l;",
      },
      {
        id: "home-06",
        title: "Short home combinations",
        objective: "Type common home-row patterns with relaxed hands.",
        difficulty: "beginner",
        keys: "A S D F G H J K L ;",
        text: "ask dad; glad lass; had a flask;",
      },
      {
        id: "home-07",
        title: "Home-row words",
        objective: "Use every home-row finger in familiar words.",
        difficulty: "beginner",
        keys: "A S D F G H J K L ;",
        text: "a sad dad adds a salad; a lad asks",
      },
      {
        id: "home-08",
        title: "Random home sequences",
        objective: "Find less predictable home-row keys accurately.",
        difficulty: "intermediate",
        keys: "A S D F G H J K L ;",
        text: "jagh kfsl; dhgj aslk; fgjh dask",
      },
      {
        id: "home-09",
        title: "Home-row accuracy",
        objective: "Keep every character exact while holding a steady pace.",
        difficulty: "intermediate",
        keys: "A S D F G H J K L ;",
        text: "a glass falls; a dash; a flash; dad asks",
      },
      {
        id: "home-10",
        title: "Home-row challenge",
        objective:
          "Combine all ten home-row keys in a longer controlled drill.",
        difficulty: "intermediate",
        keys: "A S D F G H J K L ;",
        text: "a glad lad had a flask; a lad asks dad; a glass falls",
      },
    ],
  },
  {
    id: "top-row",
    title: "Stage 2 · Top Row",
    exercises: [
      {
        id: "top-01",
        title: "Left-hand top reaches",
        objective: "Reach Q W E R T while keeping fingers near home position.",
        difficulty: "beginner",
        keys: "Q W E R T",
        text: "qwert trewq qwert trewq",
      },
      {
        id: "top-02",
        title: "Right-hand top reaches",
        objective: "Reach Y U I O P with a light, controlled touch.",
        difficulty: "beginner",
        keys: "Y U I O P",
        text: "yuiop poiuy yuiop poiuy",
      },
      {
        id: "top-03",
        title: "Left top-row pairs",
        objective: "Practice neighboring left-hand top-row movements.",
        difficulty: "beginner",
        keys: "Q W E R T",
        text: "qw we er rt tq re wt qw er",
      },
      {
        id: "top-04",
        title: "Right top-row pairs",
        objective: "Practice neighboring right-hand top-row movements.",
        difficulty: "beginner",
        keys: "Y U I O P",
        text: "yu ui io op py oi up yu io",
      },
      {
        id: "top-05",
        title: "Top-row alternating hands",
        objective: "Alternate between left and right top-row keys.",
        difficulty: "beginner",
        keys: "Q W E R T Y U I O P",
        text: "qy wu ei ro tp ty ru wi eo",
      },
      {
        id: "top-06",
        title: "Top-row patterns",
        objective:
          "Repeat complete left and right top-row sequences accurately.",
        difficulty: "beginner",
        keys: "Q W E R T Y U I O P",
        text: "qwert yuiop poiuy trewq qwert yuiop",
      },
      {
        id: "top-07",
        title: "Top-row words",
        objective: "Build useful letter patterns from the new row.",
        difficulty: "beginner",
        keys: "Q W E R T Y U I O P",
        text: "type your query you write poetry",
      },
      {
        id: "top-08",
        title: "Random top-row sequence",
        objective: "Locate less predictable top-row keys without looking down.",
        difficulty: "beginner",
        keys: "Q W E R T Y U I O P",
        text: "ptywq irote yqpuw etrio pwyut",
      },
      {
        id: "top-09",
        title: "Reinforcement: home + top",
        objective: "Combine new reaches with familiar home-row anchors.",
        difficulty: "intermediate",
        keys: "Q W E R T Y U I O P + Home Row",
        text: "we were there; you type quite quietly",
      },
      {
        id: "top-10",
        title: "Top-row challenge",
        objective:
          "Type top-row patterns and reinforce them in a short phrase.",
        difficulty: "intermediate",
        keys: "Q W E R T Y U I O P + Home Row",
        text: "qwert yuiop; our power is quite pure",
      },
    ],
  },
  {
    id: "bottom-row",
    title: "Stage 3 · Bottom Row",
    exercises: [
      {
        id: "bottom-01",
        title: "Left-hand bottom reaches",
        objective: "Reach Z X C V B with steady wrist position.",
        difficulty: "beginner",
        keys: "Z X C V B",
        text: "zxcvb bvcxz zxcvb bvcxz",
      },
      {
        id: "bottom-02",
        title: "Right-hand bottom reaches",
        objective: "Reach N M , . / with accurate finger placement.",
        difficulty: "beginner",
        keys: "N M , . /",
        text: "nm,./ /.,mn nm,./ /.,mn",
      },
      {
        id: "bottom-03",
        title: "Left bottom-row pairs",
        objective: "Practice neighboring left-hand bottom-row movements.",
        difficulty: "beginner",
        keys: "Z X C V B",
        text: "zx xc cv vb bz vc xb zx cv",
      },
      {
        id: "bottom-04",
        title: "Right bottom-row pairs",
        objective: "Practice neighboring right-hand bottom-row movements.",
        difficulty: "beginner",
        keys: "N M , . /",
        text: "nm m, ,. ./ /n ,m n. m/",
      },
      {
        id: "bottom-05",
        title: "Alternating bottom-row hands",
        objective: "Alternate between left and right bottom-row keys.",
        difficulty: "beginner",
        keys: "Z X C V B N M , . /",
        text: "zn xm c, v. b/ bn vm c. x, z/",
      },
      {
        id: "bottom-06",
        title: "Bottom-row patterns",
        objective: "Repeat full bottom-row patterns without losing accuracy.",
        difficulty: "beginner",
        keys: "Z X C V B N M , . /",
        text: "zxcvb nm,./ /.,mn bvcxz zxcvb",
      },
      {
        id: "bottom-07",
        title: "Long bottom-row combinations",
        objective:
          "Join longer bottom-row sequences while keeping the fingers close to home.",
        difficulty: "beginner",
        keys: "Z X C V B N M , . /",
        text: "zxcvb, nm./ vbnm, zxcv. bnm,./",
      },
      {
        id: "bottom-08",
        title: "Random bottom-row sequence",
        objective: "Locate less predictable bottom-row keys reliably.",
        difficulty: "beginner",
        keys: "Z X C V B N M , . /",
        text: "vbnm, zc./x b,mn. v/zc, xbnm",
      },
      {
        id: "bottom-09",
        title: "Reinforcement: bottom + home",
        objective: "Combine new bottom-row keys with familiar home anchors.",
        difficulty: "intermediate",
        keys: "Z X C V B N M , . / + Home Row",
        text: "a brave man moves; a calm, vivid scene.",
      },
      {
        id: "bottom-10",
        title: "Bottom-row challenge",
        objective: "Type a longer line using the bottom row and known anchors.",
        difficulty: "intermediate",
        keys: "Z X C V B N M , . / + Home Row",
        text: "many men move, combine, and become visible.",
      },
    ],
  },
  {
    id: "mixed-practice",
    title: "Stage 4 · Mixed Practice",
    exercises: [
      {
        id: "mixed-01",
        title: "Home + top row",
        objective:
          "Move between the two learned rows while keeping a home anchor.",
        difficulty: "beginner",
        keys: "Home + Top",
        text: "we were there; your quiet query is ready",
      },
      {
        id: "mixed-02",
        title: "Home + bottom row",
        objective: "Combine familiar home keys with lower-row reaches.",
        difficulty: "beginner",
        keys: "Home + Bottom",
        text: "a brave lad moves; a vivid scene has value",
      },
      {
        id: "mixed-03",
        title: "Top + bottom row",
        objective:
          "Reach between upper and lower rows without relying on home-only patterns.",
        difficulty: "beginner",
        keys: "Top + Bottom",
        text: "we type, you move, we write, you improve",
      },
      {
        id: "mixed-04",
        title: "Three-row short combinations",
        objective: "Use all three rows in short, controlled patterns.",
        difficulty: "beginner",
        keys: "A–Z",
        text: "qaz wsx edc rfv tgb yhn ujm ik, ol. p;/",
      },
      {
        id: "mixed-05",
        title: "Balanced random sequences",
        objective:
          "Practice rare keys such as Q, Z, X, J, and V in a balanced drill.",
        difficulty: "intermediate",
        keys: "A–Z",
        text: "qzjxv bwmk; hrfu, tynp. gicso ledav",
      },
      {
        id: "mixed-06",
        title: "Alternating hands",
        objective:
          "Alternate hands across the full alphabet while staying accurate.",
        difficulty: "intermediate",
        keys: "A–Z",
        text: "qwer tyui asdf hjkl zxcv nm,./",
      },
      {
        id: "mixed-07",
        title: "Common English words",
        objective: "Type common words that exercise every keyboard region.",
        difficulty: "intermediate",
        keys: "A–Z + Space",
        text: "quick brown fox jumps over a lazy dog",
      },
      {
        id: "mixed-08",
        title: "Longer English words",
        objective: "Build reach and rhythm through longer, varied words.",
        difficulty: "intermediate",
        keys: "A–Z + Space",
        text: "extraordinary journeys require persistent effort and valuable experience",
      },
      {
        id: "mixed-09",
        title: "Short phrases",
        objective: "Keep spaces and letter reaches consistent across phrases.",
        difficulty: "intermediate",
        keys: "A–Z + Space",
        text: "quiet streets, bright windows, and a warm evening breeze",
      },
      {
        id: "mixed-10",
        title: "Short sentences",
        objective: "Type natural sentences with all three rows represented.",
        difficulty: "intermediate",
        keys: "A–Z + Space",
        text: "Every student deserves a clear path to success.",
      },
      {
        id: "mixed-11",
        title: "Longer sentences",
        objective:
          "Maintain accuracy through a longer line with less frequent letters.",
        difficulty: "advanced",
        keys: "A–Z + Space",
        text: "When people explore new places, they often discover unexpected views and valuable local knowledge.",
      },
      {
        id: "mixed-12",
        title: "Accuracy challenge",
        objective:
          "Prioritize exact characters over speed across the complete alphabet.",
        difficulty: "advanced",
        keys: "A–Z",
        text: "Pack my box with five dozen liquor jugs; quiz Jack, vex bold nymphs.",
      },
      {
        id: "mixed-13",
        title: "Endurance challenge",
        objective: "Keep a relaxed, even rhythm through an extended passage.",
        difficulty: "advanced",
        keys: "A–Z + Space",
        text: "A skilled typist moves between rows with calm, efficient motions. The hands return to their home position, then reach for each letter with care. Regular practice builds accuracy first, while a steady rhythm gradually improves speed.",
      },
      {
        id: "mixed-14",
        title: "Speed challenge",
        objective: "Increase pace while preserving clean, complete keystrokes.",
        difficulty: "advanced",
        keys: "A–Z + Space",
        text: "Bright jazz, quick waltzes, vexed nymphs, and quirky foxes keep every finger moving.",
      },
      {
        id: "mixed-15",
        title: "Final alphabet mastery",
        objective:
          "Demonstrate confident use of every letter from A through Z.",
        difficulty: "advanced",
        keys: "A–Z + Space",
        text: "The quick brown fox jumps over a lazy dog while five boxing wizards quickly jump.",
      },
    ],
  },
  {
    id: "numbers-symbols-shift",
    title: "Stage 5 · Numbers, Symbols & Shift",
    exercises: [
      {
        id: "extended-01",
        title: "Number row: left hand",
        objective:
          "Reach the left half of the number row using the correct fingers.",
        difficulty: "beginner",
        keys: "1 2 3 4 5",
        text: "12345 54321 12345 54321",
      },
      {
        id: "extended-02",
        title: "Number row: right hand",
        objective:
          "Reach the right half of the number row without looking down.",
        difficulty: "beginner",
        keys: "6 7 8 9 0",
        text: "67890 09876 67890 09876",
      },
      {
        id: "extended-03",
        title: "All numbers",
        objective: "Move across the complete number row with steady accuracy.",
        difficulty: "beginner",
        keys: "0–9",
        text: "0123456789 9876543210 2026 149 2305",
      },
      {
        id: "extended-04",
        title: "Everyday punctuation",
        objective:
          "Practice commas, periods, slashes, and home-row punctuation.",
        difficulty: "beginner",
        keys: ", . / ; ' - =",
        text: "Hello, world. Is this clear? Yes; it is.",
      },
      {
        id: "extended-05",
        title: "Capital letters",
        objective: "Use the opposite-hand Shift key for each uppercase letter.",
        difficulty: "intermediate",
        keys: "Both Shift keys + A–Z",
        text: "The Quick Brown Fox Jumps Over The Lazy Dog.",
      },
      {
        id: "extended-06",
        title: "Shifted number symbols",
        objective: "Pair each number key with its Shift symbol.",
        difficulty: "intermediate",
        keys: "! @ # $ % ^ & * ( )",
        text: "! @ # $ % ^ & * ( ) ! @ # $ % ^ & * ( )",
      },
      {
        id: "extended-07",
        title: "Shifted punctuation",
        objective:
          "Use Shift for brackets, braces, colon, quotation marks, and operators.",
        difficulty: "intermediate",
        keys: '- _ + { } : " < > ? ~ |',
        text: '- _ + { } : " < > ? ~ | - _ + { } : " < > ? ~ |',
      },
      {
        id: "extended-08",
        title: "Numbers in context",
        objective:
          "Type practical amounts, dates, and measurements accurately.",
        difficulty: "intermediate",
        keys: "Letters + 0–9 + punctuation",
        text: "In 2026, 24 students read 18 pages in 3 hours.",
      },
      {
        id: "extended-09",
        title: "Symbols in context",
        objective:
          "Combine punctuation and shifted symbols in useful examples.",
        difficulty: "advanced",
        keys: "Numbers + Shift symbols + punctuation",
        text: "Price: $48.50 (20% off); score = 8/10.",
      },
      {
        id: "extended-10",
        title: "Entire keyboard challenge",
        objective: "Combine letters, numbers, symbols, and both Shift keys.",
        difficulty: "advanced",
        keys: "Full QWERTY keyboard",
        text: "At 7:45, 24 students paid $12.50 each; the total was $300.00 (plus 5%).",
      },
    ],
  },
];

export const keyboardLessons = keyboardStages.flatMap((stage, stageIndex) =>
  stage.exercises.map((exercise, exerciseIndex) => ({
    ...exercise,
    stageId: stage.id,
    stageTitle: stage.title,
    stageIndex,
    exerciseIndex,
  })),
);

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
