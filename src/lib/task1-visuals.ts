/** Original, fictional IELTS-style data. IDs are stable local draft keys. */
export const visualCategories = [
  { id: "bar", label: "Bar charts" },
  { id: "line", label: "Line graphs" },
  { id: "pie", label: "Pie charts" },
  { id: "table", label: "Tables" },
  { id: "process", label: "Process diagrams" },
  { id: "map", label: "Maps" },
  { id: "mixed", label: "Mixed charts" },
] as const;
export type VisualCategory = (typeof visualCategories)[number]["id"];
export type Series = { name: string; values: number[] };
export type CartesianVisual = {
  kind: "bar" | "line";
  title: string;
  unit: string;
  xLabel: string;
  labels: string[];
  series: Series[];
  max?: number;
};
export type PieVisual = {
  kind: "pie";
  title: string;
  unit: string;
  labels: string[];
  panels: { title: string; values: number[] }[];
};
export type TableVisual = {
  kind: "table";
  title: string;
  unit: string;
  headers: string[];
  rows: string[][];
};
export type ProcessVisual = {
  kind: "process";
  title: string;
  steps: { label: string; detail: string }[];
  cycle?: string;
  note: string;
};
export type MapFeature = {
  label: string;
  type: "building" | "green" | "parking" | "water" | "path";
  x: number;
  y: number;
  width: number;
  height: number;
};
export type MapVisual = {
  kind: "map";
  title: string;
  road: string;
  periods: { title: string; features: MapFeature[] }[];
  note: string;
};
export type SimpleVisual =
  CartesianVisual | PieVisual | TableVisual | ProcessVisual | MapVisual;
export type QuestionVisual =
  | SimpleVisual
  | {
      kind: "mixed";
      title: string;
      charts: (CartesianVisual | PieVisual | TableVisual)[];
    };
export type VisualQuestion = {
  id: string;
  task: 1;
  title: string;
  category: VisualCategory;
  question: string;
  note: string;
  visual: QuestionVisual;
};
const instruction =
  "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.";
function question(
  category: VisualCategory,
  n: number,
  title: string,
  description: string,
  visual: QuestionVisual,
  note = "All figures describe a fictional setting and were created for KEYFLOW.",
): VisualQuestion {
  return {
    id: `v-${category}-${n}`,
    task: 1,
    title,
    category,
    question: `${description} ${instruction}`,
    note,
    visual,
  };
}
const series = (name: string, values: number[]): Series => ({ name, values });
const feature = (
  label: string,
  type: MapFeature["type"],
  x: number,
  y: number,
  width: number,
  height: number,
): MapFeature => ({ label, type, x, y, width, height });
export const visualQuestions: VisualQuestion[] = [
  question(
    "bar",
    1,
    "Recycling in three towns",
    "The bar chart shows the percentage of household waste recycled in three towns in 2015 and 2025.",
    {
      kind: "bar",
      title: "Household waste recycled",
      unit: "Household waste recycled (%)",
      xLabel: "Town",
      labels: ["Ashton", "Bramley", "Coleford"],
      series: [series("2015", [22, 35, 41]), series("2025", [46, 52, 58])],
      max: 100,
    },
  ),
  question(
    "bar",
    2,
    "Library visits by age",
    "The bar chart compares average weekly library visits by age group in one town in 2012 and 2022.",
    {
      kind: "bar",
      title: "Average weekly library visits",
      unit: "Visits per week",
      xLabel: "Age group (years)",
      labels: ["Under 18", "18–34", "35–59", "60+"],
      series: [
        series("2012", [180, 120, 210, 160]),
        series("2022", [240, 190, 170, 220]),
      ],
    },
  ),
  question(
    "bar",
    3,
    "Choices of degree subject",
    "The bar chart shows the distribution of male and female first-year students across five subject areas at a university in 2025.",
    {
      kind: "bar",
      title: "First-year subject choices, 2025",
      unit: "Students in each group (%)",
      xLabel: "Subject area",
      labels: ["Science", "Business", "Arts", "Engineering", "Other"],
      series: [
        series("Male students", [32, 24, 14, 22, 8]),
        series("Female students", [26, 20, 28, 10, 16]),
      ],
      max: 100,
    },
    "Each gender group totals 100%. Figures refer to first-year enrolments, not all university students.",
  ),
  question(
    "line",
    1,
    "Rail travel over twenty years",
    "The line graph shows annual passenger journeys on three urban rail networks between 2005 and 2025.",
    {
      kind: "line",
      title: "Annual rail passenger journeys",
      unit: "Journeys (millions per year)",
      xLabel: "Year",
      labels: ["2005", "2010", "2015", "2020", "2025"],
      series: [
        series("Eastport", [35, 42, 55, 61, 78]),
        series("Northbridge", [52, 54, 50, 57, 63]),
        series("Westhaven", [18, 27, 39, 52, 70]),
      ],
    },
  ),
  question(
    "line",
    2,
    "Internet access at home",
    "The line graph shows the percentage of households with home internet access in three regions from 2000 to 2020.",
    {
      kind: "line",
      title: "Households with home internet",
      unit: "Households (%)",
      xLabel: "Year",
      labels: ["2000", "2005", "2010", "2015", "2020"],
      series: [
        series("Coastal", [25, 46, 67, 84, 96]),
        series("Central", [18, 35, 58, 79, 92]),
        series("Highland", [8, 19, 40, 65, 87]),
      ],
      max: 100,
    },
  ),
  question(
    "line",
    3,
    "Domestic water consumption",
    "The line graph compares average daily domestic water use per person in three cities between 2000 and 2020.",
    {
      kind: "line",
      title: "Daily domestic water use",
      unit: "Litres per person per day",
      xLabel: "Year",
      labels: ["2000", "2005", "2010", "2015", "2020"],
      series: [
        series("Alder", [210, 198, 181, 165, 150]),
        series("Birch", [160, 166, 158, 146, 138]),
        series("Cedar", [125, 138, 149, 154, 148]),
      ],
    },
  ),
  question(
    "pie",
    1,
    "How homes use energy",
    "The pie charts show the shares of household energy used for four purposes in one country in 2005 and 2025.",
    {
      kind: "pie",
      title: "Household energy use",
      unit: "Share of total household energy (%)",
      labels: ["Space heating", "Water heating", "Appliances", "Lighting"],
      panels: [
        { title: "2005", values: [45, 25, 20, 10] },
        { title: "2025", values: [35, 28, 32, 5] },
      ],
    },
    "Each chart totals 100%. Shares refer to energy consumption, not household expenditure.",
  ),
  question(
    "pie",
    2,
    "Funding a local museum",
    "The pie charts compare the sources of a local museum’s annual income in 2010 and 2025.",
    {
      kind: "pie",
      title: "Museum income by source",
      unit: "Share of annual income (%)",
      labels: [
        "Public grants",
        "Entry tickets",
        "Donations",
        "Shop sales",
        "Events",
      ],
      panels: [
        { title: "2010", values: [50, 25, 10, 10, 5] },
        { title: "2025", values: [30, 30, 15, 15, 10] },
      ],
    },
    "Each chart totals 100%. Total annual income was 800,000 currency units in 2010 and 1,200,000 in 2025.",
  ),
  question(
    "pie",
    3,
    "Graduate destinations",
    "The pie charts show the destinations of university graduates six months after graduation in 2010 and 2025.",
    {
      kind: "pie",
      title: "Destinations six months after graduation",
      unit: "Share of graduates (%)",
      labels: [
        "Full-time work",
        "Part-time work",
        "Further study",
        "Seeking work",
        "Other",
      ],
      panels: [
        { title: "2010", values: [48, 12, 25, 10, 5] },
        { title: "2025", values: [58, 14, 18, 6, 4] },
      ],
    },
    "Each cohort totals 100%. Categories are mutually exclusive; work categories exclude graduates in further study.",
  ),
  question(
    "table",
    1,
    "International visitors",
    "The table shows international tourist arrivals in four countries in 2015 and 2025, together with the average length of stay in 2025.",
    {
      kind: "table",
      title: "International tourism",
      unit: "Arrivals: millions of visits; stay: nights per visit",
      headers: ["Country", "Arrivals 2015", "Arrivals 2025", "Stay in 2025"],
      rows: [
        ["Arden", "4.2", "6.8", "7.2"],
        ["Belora", "7.5", "8.1", "5.6"],
        ["Calida", "2.8", "5.9", "9.4"],
        ["Darsen", "5.6", "5.1", "6.1"],
      ],
    },
  ),
  question(
    "table",
    2,
    "Town sports facilities",
    "The table compares the number of public sports facilities and weekly participation in three towns in 2025.",
    {
      kind: "table",
      title: "Public sports provision, 2025",
      unit: "Facilities: counts; participants: unique people per week",
      headers: [
        "Town",
        "Swimming pools",
        "Sports halls",
        "Weekly participants",
      ],
      rows: [
        ["Elmstead", "3", "5", "2,400"],
        ["Fairhaven", "2", "8", "3,100"],
        ["Greendale", "4", "4", "2,200"],
      ],
    },
    "The towns each have 50,000 residents. Participants are counted once, even if they use more than one facility.",
  ),
  question(
    "table",
    3,
    "Train service performance",
    "The table compares passenger numbers, punctuality and ticket prices on four regional train routes in 2025.",
    {
      kind: "table",
      title: "Regional train services, 2025",
      unit: "Passengers: daily average; on time: within 5 minutes; fare: currency units",
      headers: ["Route", "Daily passengers", "On time (%)", "Single fare"],
      rows: [
        ["North", "18,500", "94", "6.50"],
        ["South", "24,000", "87", "5.00"],
        ["East", "12,800", "96", "7.20"],
        ["West", "21,300", "90", "5.80"],
      ],
    },
  ),
  question(
    "process",
    1,
    "Recycling glass bottles",
    "The diagram shows how used glass bottles are recycled at a processing plant.",
    {
      kind: "process",
      title: "Glass bottle recycling",
      steps: [
        { label: "Collection", detail: "Used bottles arrive" },
        { label: "Sorting", detail: "Separate by colour" },
        { label: "Cleaning", detail: "Remove dirt and labels" },
        { label: "Crushing", detail: "Break glass into pieces" },
        { label: "Melting", detail: "Heat to about 1,500°C" },
        { label: "Moulding", detail: "Shape new bottles" },
        { label: "Cooling", detail: "Allow glass to harden" },
        { label: "Distribution", detail: "Fill and send to shops" },
      ],
      cycle: "After use, bottles return to collection.",
      note: "Arrows show the order of operations. The return arrow represents the next recycling cycle.",
    },
  ),
  question(
    "process",
    2,
    "Treating drinking water",
    "The diagram shows the stages used to turn river water into drinking water in a treatment system.",
    {
      kind: "process",
      title: "From river to household",
      steps: [
        { label: "River intake", detail: "Water enters the plant" },
        { label: "Screening", detail: "Remove large debris" },
        { label: "Settling", detail: "Particles sink to the bottom" },
        { label: "Sand filtration", detail: "Remove smaller particles" },
        { label: "Disinfection", detail: "Add a controlled disinfectant" },
        { label: "Storage", detail: "Hold in a covered tank" },
        { label: "Supply", detail: "Pump to households" },
      ],
      note: "The diagram describes the main water pathway. Waste removed during screening, settling and filtration is not shown.",
    },
  ),
  question(
    "process",
    3,
    "Manufacturing clay bricks",
    "The diagram shows the production of clay bricks at a small factory, from extraction to delivery.",
    {
      kind: "process",
      title: "Clay brick manufacture",
      steps: [
        { label: "Extraction", detail: "Dig clay from the ground" },
        { label: "Preparation", detail: "Crush and screen the clay" },
        { label: "Mixing", detail: "Add sand and water" },
        { label: "Shaping", detail: "Cut into uniform bricks" },
        { label: "Drying", detail: "Dry for 24–48 hours" },
        { label: "Firing", detail: "Heat in a kiln at 900–1,100°C" },
        { label: "Cooling", detail: "Cool for 2–3 days" },
        { label: "Delivery", detail: "Pack and transport" },
      ],
      note: "Times and temperatures refer to this factory. Arrows indicate the sequence of production.",
    },
  ),
  question(
    "map",
    1,
    "The changing village centre",
    "The maps show the layout of the village of Seabrook in 1995 and 2025.",
    {
      kind: "map",
      title: "Seabrook village centre",
      road: "Main Street",
      periods: [
        {
          title: "1995",
          features: [
            feature("School", "building", 45, 65, 140, 95),
            feature("Farmland", "green", 210, 65, 155, 95),
            feature("Woodland", "green", 390, 65, 150, 95),
            feature("Houses", "building", 45, 220, 140, 90),
            feature("Small shops", "building", 210, 220, 155, 90),
            feature("Car park", "parking", 390, 220, 150, 90),
          ],
        },
        {
          title: "2025",
          features: [
            feature("School", "building", 45, 65, 140, 95),
            feature("Housing", "building", 210, 65, 155, 95),
            feature("Hotel", "building", 390, 65, 150, 95),
            feature("Apartments", "building", 45, 220, 140, 90),
            feature("Supermarket", "building", 210, 220, 155, 90),
            feature("Public park", "green", 390, 220, 150, 90),
          ],
        },
      ],
      note: "North is at the top of both maps. The same boundary, road alignment and scale are used in both years.",
    },
  ),
  question(
    "map",
    2,
    "A growing university campus",
    "The maps show a university campus in 2000 and its layout in 2025.",
    {
      kind: "map",
      title: "Northfield university campus",
      road: "Campus Road",
      periods: [
        {
          title: "2000",
          features: [
            feature("Library", "building", 45, 65, 140, 95),
            feature("Teaching block", "building", 210, 65, 155, 95),
            feature("Car park", "parking", 390, 65, 150, 95),
            feature("Sports field", "green", 45, 220, 140, 90),
            feature("Cafeteria", "building", 210, 220, 155, 90),
            feature("Open grassland", "green", 390, 220, 150, 90),
          ],
        },
        {
          title: "2025",
          features: [
            feature("Library", "building", 45, 65, 140, 95),
            feature("Teaching block", "building", 210, 65, 155, 95),
            feature("Science centre", "building", 390, 65, 150, 95),
            feature("Sports centre", "building", 45, 220, 140, 90),
            feature("Cafeteria", "building", 210, 220, 155, 90),
            feature("Student housing", "building", 390, 220, 150, 90),
          ],
        },
      ],
      note: "Both maps use the same scale. Campus Road remains the main route through the site.",
    },
  ),
  question(
    "map",
    3,
    "A riverside recreation area",
    "The maps compare a riverside recreation area in 2010 with a proposed redevelopment for 2030.",
    {
      kind: "map",
      title: "Riverside recreation area",
      road: "Access Road",
      periods: [
        {
          title: "2010",
          features: [
            feature("Picnic lawn", "green", 45, 65, 140, 95),
            feature("Open meadow", "green", 210, 65, 155, 95),
            feature("Parking", "parking", 390, 65, 150, 95),
            feature("Pond", "water", 45, 220, 140, 90),
            feature("Woodland", "green", 210, 220, 155, 90),
            feature("Storage shed", "building", 390, 220, 150, 90),
          ],
        },
        {
          title: "2030 · proposed",
          features: [
            feature("Playground", "green", 45, 65, 140, 95),
            feature("Sports courts", "building", 210, 65, 155, 95),
            feature("Parking", "parking", 390, 65, 150, 95),
            feature("Pond", "water", 45, 220, 140, 90),
            feature("Picnic lawn", "green", 210, 220, 155, 90),
            feature("Café & toilets", "building", 390, 220, 150, 90),
          ],
        },
      ],
      note: "The 2030 map is a proposal. North and scale are identical in both maps. The river lies just beyond the southern boundary.",
    },
  ),
  question(
    "mixed",
    1,
    "Tourism volume and purpose",
    "The line graph shows annual international visitor arrivals in a country from 2010 to 2025. The pie chart shows their main reasons for visiting in 2025.",
    {
      kind: "mixed",
      title: "International tourism patterns",
      charts: [
        {
          kind: "line",
          title: "Annual visitor arrivals",
          unit: "Arrivals (millions per year)",
          xLabel: "Year",
          labels: ["2010", "2015", "2020", "2025"],
          series: [series("Visitors", [2.5, 3.2, 4.1, 5.0])],
        },
        {
          kind: "pie",
          title: "Main purpose of visit, 2025",
          unit: "Share of visitors (%)",
          labels: ["Holiday", "Business", "Friends / family", "Other"],
          panels: [{ title: "2025", values: [55, 20, 20, 5] }],
        },
      ],
    },
    "The pie chart covers the same 5 million arrivals reported for 2025. Each visit is assigned one main purpose.",
  ),
  question(
    "mixed",
    2,
    "Water demand and its users",
    "The bar chart compares the shares of water used by three sectors in a region in 2010 and 2025. The line graph shows total annual water demand over the same period.",
    {
      kind: "mixed",
      title: "Water demand and sector shares",
      charts: [
        {
          kind: "bar",
          title: "Water use by sector",
          unit: "Share of total water use (%)",
          xLabel: "Sector",
          labels: ["Households", "Industry", "Agriculture"],
          series: [series("2010", [20, 30, 50]), series("2025", [28, 24, 48])],
          max: 100,
        },
        {
          kind: "line",
          title: "Total annual water demand",
          unit: "Water (million cubic metres)",
          xLabel: "Year",
          labels: ["2010", "2015", "2020", "2025"],
          series: [series("Total demand", [100, 110, 125, 140])],
        },
      ],
    },
    "Sector shares sum to 100% in each year. Total use includes only households, industry and agriculture.",
  ),
  question(
    "mixed",
    3,
    "Training programmes and destinations",
    "The bar chart shows the number of students completing four vocational programmes in 2025. The pie chart shows the destinations of these graduates six months later.",
    {
      kind: "mixed",
      title: "Vocational graduates, 2025 cohort",
      charts: [
        {
          kind: "bar",
          title: "Programme completions",
          unit: "Graduates (people)",
          xLabel: "Programme",
          labels: ["Health", "IT", "Construction", "Hospitality"],
          series: [series("Graduates", [800, 650, 550, 400])],
        },
        {
          kind: "pie",
          title: "Destinations after six months",
          unit: "Share of all graduates (%)",
          labels: ["Employed", "Further study", "Seeking work", "Other"],
          panels: [{ title: "All 2,400 graduates", values: [68, 20, 8, 4] }],
        },
      ],
    },
    "Both charts describe the same cohort of 2,400 graduates. Destination categories are mutually exclusive and total 100%.",
  ),
];
export function questionsInCategory(category: VisualCategory | "all") {
  return category === "all"
    ? visualQuestions
    : visualQuestions.filter((q) => q.category === category);
}
export function randomVisualQuestion(
  category: VisualCategory | "all",
  currentId: string,
  random = Math.random,
): VisualQuestion {
  const choices = questionsInCategory(category).filter(
    (q) => q.id !== currentId,
  );
  return choices[
    Math.min(
      choices.length - 1,
      Math.max(0, Math.floor(random() * choices.length)),
    )
  ];
}
