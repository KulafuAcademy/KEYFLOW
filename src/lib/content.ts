import type { QuestionVisual, VisualCategory } from "./task1-visuals";

export type Exercise = {
  id: string;
  title: string;
  category: string;
  text: string;
};
export const drills: Exercise[] = [
  {
    id: "d1",
    title: "Change & trends",
    category: "Academic vocabulary",
    text: "The proportion of urban residents increased steadily, whereas the rural population declined over the same period.",
  },
  {
    id: "d2",
    title: "Making comparisons",
    category: "Academic phrases",
    text: "In comparison with the previous decade, public transport became more affordable. However, private vehicles remained the most popular option.",
  },
  {
    id: "d3",
    title: "Cause & consequence",
    category: "Academic phrases",
    text: "Investment in renewable energy can reduce carbon emissions. As a result, governments should consider the long-term benefits of sustainable infrastructure.",
  },
  {
    id: "d4",
    title: "Education & opportunity",
    category: "Sentence practice",
    text: "Although higher education offers valuable opportunities, practical experience is equally important. A balanced approach prepares graduates for a changing workplace.",
  },
  {
    id: "d5",
    title: "Building an argument",
    category: "Task 2 language",
    text: "It is often argued that technology improves access to education. While this view has merit, reliable internet access is not available to everyone.",
  },
  {
    id: "d6",
    title: "Precision & punctuation",
    category: "Punctuation practice",
    text: "The figure rose from 25% to 40% between 2010 and 2020. By contrast, the other category fell slightly (from 18% to 16%). What explains this difference?",
  },
  {
    id: "d7",
    title: "Describing a process",
    category: "Task 1 language",
    text: "First, the raw materials are collected and sorted. They are then transported to a processing facility, where they are cleaned, heated, and shaped into new products.",
  },
  {
    id: "d8",
    title: "Cities & communities",
    category: "Sentence practice",
    text: "Well-designed public spaces encourage social interaction and physical activity. Nevertheless, local authorities must balance maintenance costs with the needs of residents.",
  },
];
export const passages: Exercise[] = [
  {
    id: "c1",
    title: "A city on the move",
    category: "Academic Task 1",
    text: "The table compares the percentages of commuters using three forms of transport in a city in 2010 and 2020. Overall, the car remained the most common choice, although its share decreased. Both bus travel and cycling gained popularity.\n\nIn 2010, cars accounted for 60% of journeys, while buses represented 30% and bicycles just 10%. A decade later, the proportion of car users had fallen to 45%, a reduction of 15 percentage points. Bus use increased more modestly, reaching 35%.\n\nCycling experienced the largest proportional rise, doubling from 10% to 20%. Despite this growth, it was still less common than either driving or taking the bus in 2020. The gap between car and bus use narrowed considerably, from 30 percentage points at the start of the period to only 10 at the end. Together, the two alternatives to driving accounted for a clear majority of all commuter journeys in the final year.",
  },
  {
    id: "c2",
    title: "Where households spend",
    category: "Academic Task 1",
    text: "The table presents the average monthly spending of households in two fictional towns across four categories. Overall, housing was the largest expense in both places, while transport and leisure accounted for smaller amounts.\n\nHouseholds in Brookfield spent 900 units on housing, compared with 750 in Lakeside. Food expenditure showed the opposite pattern: the average in Lakeside was 400 units, exceeding the Brookfield figure of 350. Transport costs were also higher in Lakeside, at 250 units rather than 200.\n\nLeisure spending was identical in the two towns, with an average of 150 units per household. When all four categories are combined, total monthly expenditure was 1,600 units in Brookfield and 1,550 in Lakeside. Thus, the difference in overall spending was relatively small, despite a substantial gap in housing costs. The lower housing expense in Lakeside was partly offset by greater spending on food and transport in the same reporting period, bringing the totals closer together.",
  },
  {
    id: "c3",
    title: "Learning beyond the classroom",
    category: "Academic Task 2",
    text: "Some people believe that university education should focus entirely on employment, while others argue that it should develop a wider range of abilities. In my view, preparing students for work is essential, but universities also have a responsibility to encourage independent thinking.\n\nProfessional knowledge clearly matters. Students who study engineering or nursing need practical skills that allow them to work safely and effectively. Placements and projects can connect classroom theory with real situations. Without this connection, graduates may find the transition to employment unnecessarily difficult.\n\nHowever, an exclusive focus on immediate job requirements has limitations. Technology and working practices change, so knowledge that is useful today may become less relevant in the future. Students therefore need to evaluate information, communicate clearly, and learn unfamiliar ideas. These abilities are valuable in many occupations and help graduates adapt when their roles change.\n\nA broader education can also benefit society. Discussions of history, ethics, and public policy help students understand perspectives beyond their own experience. A software developer, for example, may need to consider how a product affects privacy as well as whether it functions correctly. Such questions require judgement that technical training alone may not provide.\n\nUniversities can combine these objectives rather than choose between them. Degree programmes can include specialist modules alongside collaborative projects and opportunities to examine wider social questions. In this way, students can gain a clear professional foundation without losing the chance to explore unfamiliar fields.\n\nIn conclusion, universities should equip graduates for employment while developing the intellectual flexibility needed for long careers. These aims support each other when academic programmes are designed carefully.",
  },
  {
    id: "c4",
    title: "Making cities more liveable",
    category: "Academic Task 2",
    text: "As urban populations grow, some governments prioritise new roads, while others invest in public transport. I believe that reliable public transport should receive greater attention, although roads still require adequate maintenance.\n\nBuses and trains can move many people using relatively little space. In dense areas, adding road capacity is difficult because land is limited and expensive. A frequent bus service can carry passengers who might otherwise travel in separate cars. This makes more efficient use of existing streets and can reduce pressure on parking facilities.\n\nAffordability is another important consideration. Not every resident can purchase and maintain a private vehicle. Students, older people, and workers on low incomes may depend on public services to reach education, healthcare, and employment. Investment in accessible stations and clear information can therefore expand opportunities as well as improve mobility.\n\nNevertheless, road infrastructure cannot be ignored. Deliveries, emergency services, and journeys between remote communities depend on a functioning road network. In areas with low population density, frequent train services may be impractical. Local authorities should consider these differences instead of applying one solution everywhere.\n\nA sensible policy would prioritise dependable public transport in busy urban corridors while maintaining roads for essential journeys. Safe walking routes and protected cycle lanes could complement this approach, particularly for shorter trips. The success of such measures should be assessed through journey times, reliability, and access rather than the number of new projects announced.\n\nIn conclusion, public transport deserves a central role in urban planning because it uses space efficiently and serves a wide range of residents. Coordinated investment across several forms of transport is likely to produce a more useful network.",
  },
];
export type Prompt = {
  visual?: QuestionVisual;
  category?: VisualCategory;
  id: string;
  task: 1 | 2;
  title: string;
  question: string;
  headers?: string[];
  rows?: string[][];
  note?: string;
};
export const prompts: Prompt[] = [
  {
    id: "w1",
    task: 1,
    title: "Commuting patterns",
    question:
      "The table below shows the percentage of commuters using three modes of transport in a fictional city in 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    headers: ["Mode of transport", "2010", "2020"],
    rows: [
      ["Car", "60%", "45%"],
      ["Bus", "30%", "35%"],
      ["Bicycle", "10%", "20%"],
    ],
    note: "Unit: percentage of all commuter journeys. Each column totals 100%.",
  },
  {
    id: "w2",
    task: 1,
    title: "Household expenditure",
    question:
      "The table below shows average monthly household expenditure in two fictional towns in 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    headers: ["Category", "Brookfield", "Lakeside"],
    rows: [
      ["Housing", "900", "750"],
      ["Food", "350", "400"],
      ["Transport", "200", "250"],
      ["Leisure", "150", "150"],
    ],
    note: "All figures are in currency units per household per month. The table covers only these four categories.",
  },
  {
    id: "w3",
    task: 1,
    title: "Library use over time",
    question:
      "The table below gives information about a fictional public library in 2015, 2020, and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    headers: ["Measure", "2015", "2020", "2025"],
    rows: [
      ["Registered members", "4,000", "4,800", "6,200"],
      ["Physical book loans", "60,000", "48,000", "42,000"],
      ["Digital loans", "5,000", "22,000", "51,000"],
    ],
    note: "Membership is measured at year end. Loan figures are annual totals, not numbers of unique users.",
  },
  {
    id: "w4",
    task: 2,
    title: "The purpose of university",
    question:
      "Some people believe that the main purpose of university is to prepare students for employment. Others believe that universities should provide a broader education. Discuss both views and give your own opinion.",
  },
  {
    id: "w5",
    task: 2,
    title: "Transport priorities",
    question:
      "Governments should spend more money on public transport than on building new roads. To what extent do you agree or disagree?",
  },
  {
    id: "w6",
    task: 2,
    title: "Technology in education",
    question:
      "In many countries, digital devices are increasingly used in schools. Do the advantages of this development outweigh the disadvantages?",
  },
  {
    id: "w7",
    task: 2,
    title: "Working from home",
    question:
      "An increasing number of people are working from home rather than travelling to an office. What are the causes of this trend, and what effects might it have on individuals and communities?",
  },
];
