"use client";
import { memo, useId, useRef, useState } from "react";
import { scaleBand, scaleLinear, scalePoint } from "d3-scale";
import { arc, line, pie, type PieArcDatum } from "d3-shape";
import { Maximize2, Minus, Plus, X } from "lucide-react";
import type {
  CartesianVisual,
  MapVisual,
  PieVisual,
  ProcessVisual,
  QuestionVisual,
  TableVisual,
} from "@/lib/task1-visuals";
const fills = ["#202020", "#777777", "#b7b7b7", "#eeeeee", "#ffffff"];
const lineStrokes = ["#222222", "#555555", "#777777"];
const dashes = ["", "8 4", "2 4"];
function wrap(text: string, length = 23) {
  const words = text.split(" "),
    lines: string[] = [];
  for (const word of words) {
    if (
      !lines.length ||
      lines[lines.length - 1].length + word.length + 1 > length
    )
      lines.push(word);
    else lines[lines.length - 1] += " " + word;
  }
  return lines;
}
function DataTable({
  headers,
  rows,
  caption,
}: {
  headers: string[];
  rows: (string | number)[][];
  caption: string;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table visual-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) =>
                j === 0 ? (
                  <th scope="row" key={j}>
                    {v}
                  </th>
                ) : (
                  <td key={j}>{v}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Cartesian({ visual: v }: { visual: CartesianVisual }) {
  const id = useId();
  const w = 640,
    h = 420,
    left = 70,
    right = 24,
    top = 32,
    bottom = 310;
  const y = scaleLinear()
    .domain([0, v.max ?? Math.max(...v.series.flatMap((s) => s.values)) * 1.12])
    .nice()
    .range([bottom, top]);
  const band = scaleBand()
    .domain(v.labels)
    .range([left, w - right])
    .padding(0.24);
  const within = scaleBand()
    .domain(v.series.map((s) => s.name))
    .range([0, band.bandwidth()])
    .padding(0.12);
  const x = scalePoint()
    .domain(v.labels)
    .range([left + 10, w - right - 10]);
  return (
    <div className="chart-question">
      <h4>{v.title}</h4>
      <p className="visual-unit">{v.unit}</p>
      <svg
        className="visual-svg"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${v.title}. ${v.unit}. ${v.xLabel}: ${v.labels.join(", ")}. Exact values in the data table below.`}
      >
        <title>{v.title}</title>
        <defs>
          {v.series.map((s, i) => (
            <pattern
              id={`${id}-${i}`}
              key={s.name}
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
            >
              <rect width="7" height="7" fill={fills[i]} />
              {i > 0 && (
                <path
                  d={i === 1 ? "M0 0L7 7" : "M0 7L7 0"}
                  stroke={i === 1 ? "#fff" : "#333"}
                  strokeWidth="1"
                />
              )}
            </pattern>
          ))}
        </defs>
        {y.ticks(5).map((t) => (
          <g key={t}>
            <line x1={left} x2={w - right} y1={y(t)} y2={y(t)} stroke="#ddd" />
            <text x={left - 10} y={y(t) + 5} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        <path
          d={`M${left} ${top}V${bottom}H${w - right}`}
          fill="none"
          stroke="#333"
        />
        {v.kind === "bar"
          ? v.series.map((s, i) => (
              <g key={s.name}>
                {s.values.map((n, j) => (
                  <g key={j}>
                    <rect
                      x={(band(v.labels[j]) || 0) + (within(s.name) || 0)}
                      y={y(n)}
                      width={within.bandwidth()}
                      height={bottom - y(n)}
                      fill={`url(#${id}-${i})`}
                      stroke="#222"
                      strokeWidth=".5"
                    >
                      <title>{`${v.labels[j]} · ${s.name}: ${n}`}</title>
                    </rect>
                    <text
                      className="bar-value"
                      x={
                        (band(v.labels[j]) || 0) +
                        (within(s.name) || 0) +
                        within.bandwidth() / 2
                      }
                      y={y(n) - 6}
                      textAnchor="middle"
                    >
                      {n}
                    </text>
                  </g>
                ))}
              </g>
            ))
          : v.series.map((s, i) => {
              const points = s.values.map(
                (n, j) => [x(v.labels[j])!, y(n)] as [number, number],
              );
              return (
                <g key={s.name}>
                  <path
                    d={line()(points) || ""}
                    fill="none"
                    stroke={lineStrokes[i]}
                    strokeWidth="3"
                    strokeDasharray={dashes[i]}
                  />
                  {points.map(([cx, cy], j) => (
                    <g key={j}>
                      {i === 1 ? (
                        <rect
                          x={cx - 4}
                          y={cy - 4}
                          width="8"
                          height="8"
                          fill="#fff"
                          stroke={lineStrokes[i]}
                          strokeWidth="2"
                        />
                      ) : i === 2 ? (
                        <path
                          d={`M${cx} ${cy - 5}l5 9h-10Z`}
                          fill="#fff"
                          stroke="#777"
                          strokeWidth="2"
                        />
                      ) : (
                        <circle cx={cx} cy={cy} r="4" fill="#202020" />
                      )}
                      <title>
                        {`${v.labels[j]} · ${s.name}: ${s.values[j]}`}
                      </title>
                    </g>
                  ))}
                </g>
              );
            })}
        {v.labels.map((label) => (
          <text
            key={label}
            x={
              v.kind === "bar"
                ? (band(label) || 0) + band.bandwidth() / 2
                : x(label)
            }
            y={bottom + 23}
            textAnchor="middle"
          >
            {wrap(label, 12).map((part, i) => (
              <tspan
                key={i}
                x={
                  v.kind === "bar"
                    ? (band(label) || 0) + band.bandwidth() / 2
                    : x(label)
                }
                dy={i ? 17 : 0}
              >
                {part}
              </tspan>
            ))}
          </text>
        ))}
        <text
          x={(left + w - right) / 2}
          y="371"
          textAnchor="middle"
          className="axis-label"
        >
          {v.xLabel}
        </text>
        {v.series.map((s, i) => {
          const start = left + i * (v.series.length === 3 ? 180 : 220);
          return (
            <g key={s.name} transform={`translate(${start},400)`}>
              {v.kind === "bar" ? (
                <rect
                  x="0"
                  y="-10"
                  width="19"
                  height="12"
                  fill={`url(#${id}-${i})`}
                  stroke="#222"
                />
              ) : (
                <>
                  <line
                    x1="0"
                    x2="25"
                    y1="-4"
                    y2="-4"
                    stroke={lineStrokes[i]}
                    strokeWidth="3"
                    strokeDasharray={dashes[i]}
                  />
                  {i === 1 ? (
                    <rect
                      x="10"
                      y="-7"
                      width="6"
                      height="6"
                      fill="#fff"
                      stroke="#777"
                    />
                  ) : i === 2 ? (
                    <path d="M12 -8l4 7H8Z" fill="#fff" stroke="#777" />
                  ) : (
                    <circle cx="12" cy="-4" r="3" fill="#222" />
                  )}
                </>
              )}
              <text x={v.kind === "bar" ? 27 : 32} y="2">
                {s.name}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="visual-data">
        <summary>View data table</summary>
        <DataTable
          caption={`${v.title} · ${v.unit}`}
          headers={[v.xLabel, ...v.series.map((s) => s.name)]}
          rows={v.labels.map((l, i) => [
            l,
            ...v.series.map((s) => s.values[i]),
          ])}
        />
      </details>
    </div>
  );
}
function Pies({ visual: v }: { visual: PieVisual }) {
  const id = useId();
  const generator = pie<number>().sort(null);
  const shape = arc<PieArcDatum<number>>().innerRadius(0).outerRadius(126);
  const labelArc = arc<PieArcDatum<number>>().innerRadius(88).outerRadius(88);
  return (
    <div className="chart-question">
      <h4>{v.title}</h4>
      <p className="visual-unit">{v.unit}</p>
      {v.panels.map((panel, panelIndex) => (
        <svg
          className="visual-svg pie-svg"
          key={panel.title}
          viewBox="0 0 640 330"
          role="img"
          aria-label={`${v.title}, ${panel.title}. ${v.labels.map((l, i) => `${l}: ${panel.values[i]}%`).join("; ")}`}
        >
          <title>{`${v.title} · ${panel.title}`}</title>
          <defs>
            {v.labels.map((l, i) => (
              <pattern
                id={`${id}-${panelIndex}-${i}`}
                key={l}
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
              >
                <rect width="8" height="8" fill={fills[i]} />
                {i === 1 && <path d="M0 0L8 8" stroke="#fff" />}
                {i === 2 && <path d="M0 8L8 0" stroke="#222" />}
                {i === 3 && <circle cx="4" cy="4" r="1" fill="#222" />}
                {i === 4 && <path d="M0 4H8M4 0V8" stroke="#777" />}
              </pattern>
            ))}
          </defs>
          <text x="170" y="28" textAnchor="middle" className="chart-subtitle">
            {panel.title}
          </text>
          <g transform="translate(170,178)">
            {generator(panel.values).map((d, i) => {
              const [x, y] = labelArc.centroid(d);
              return (
                <g key={i}>
                  <path
                    d={shape(d) || ""}
                    fill={`url(#${id}-${panelIndex}-${i})`}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <rect
                    x={x - 21}
                    y={y - 10}
                    width="42"
                    height="21"
                    rx="3"
                    fill="#fff"
                  />
                  <text
                    x={x}
                    y={y + 5}
                    textAnchor="middle"
                    className="pie-value"
                  >
                    {d.value}%
                  </text>
                </g>
              );
            })}
          </g>
          {v.labels.map((l, i) => (
            <g key={l} transform={`translate(330,${76 + i * 43})`}>
              <rect
                width="20"
                height="15"
                fill={`url(#${id}-${panelIndex}-${i})`}
                stroke="#222"
              />
              {wrap(l, 25).map((part, j) => (
                <text key={j} x="31" y={12 + j * 16}>
                  {part}
                </text>
              ))}
            </g>
          ))}
        </svg>
      ))}
      <details className="visual-data">
        <summary>View data table</summary>
        <DataTable
          caption={`${v.title} · ${v.unit}`}
          headers={["Category", ...v.panels.map((p) => p.title)]}
          rows={v.labels.map((l, i) => [
            l,
            ...v.panels.map((p) => `${p.values[i]}%`),
          ])}
        />
      </details>
    </div>
  );
}
function Process({ visual: v }: { visual: ProcessVisual }) {
  const id = useId();
  const positions = v.steps.map((_, i) => {
    const row = Math.floor(i / 3),
      col = row % 2 === 0 ? i % 3 : 2 - (i % 3);
    return { x: 35 + col * 200, y: 45 + row * 130 };
  });
  const last = positions[positions.length - 1];
  return (
    <div className="chart-question">
      <h4>{v.title}</h4>
      <svg
        className="visual-svg process-svg"
        viewBox="0 0 640 440"
        role="img"
        aria-label={`${v.title}. ${v.steps.map((s, i) => `${i + 1}: ${s.label}, ${s.detail}`).join(". ")}. ${v.cycle || "End of process."}`}
      >
        <title>{v.title}</title>
        <defs>
          <marker
            id={id}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0 0L8 4L0 8Z" fill="#333" />
          </marker>
        </defs>
        {positions.slice(0, -1).map((p, i) => {
          const next = positions[i + 1],
            sameRow = p.y === next.y;
          return (
            <path
              key={i}
              d={
                sameRow
                  ? next.x > p.x
                    ? `M${p.x + 170} ${p.y + 40}H${next.x - 5}`
                    : `M${p.x} ${p.y + 40}H${next.x + 175}`
                  : `M${p.x + 85} ${p.y + 80}V${next.y - 6}`
              }
              markerEnd={`url(#${id})`}
              stroke="#333"
              strokeWidth="2"
              fill="none"
            />
          );
        })}
        {v.steps.map((s, i) => {
          const p = positions[i];
          return (
            <g key={s.label}>
              <rect
                x={p.x}
                y={p.y}
                width="170"
                height="80"
                rx="4"
                fill={i === 0 || i === v.steps.length - 1 ? "#efefef" : "#fff"}
                stroke="#333"
                strokeWidth="1.5"
              />
              <circle cx={p.x + 14} cy={p.y + 14} r="10" fill="#222" />
              <text
                x={p.x + 14}
                y={p.y + 18}
                textAnchor="middle"
                fill="#fff"
                className="step-number"
              >
                {i + 1}
              </text>
              <text
                x={p.x + 88}
                y={p.y + 28}
                textAnchor="middle"
                className="step-label"
              >
                {s.label}
              </text>
              {wrap(s.detail, 24).map((part, j) => (
                <text
                  key={j}
                  x={p.x + 85}
                  y={p.y + 50 + j * 15}
                  textAnchor="middle"
                  className="step-detail"
                >
                  {part}
                </text>
              ))}
            </g>
          );
        })}
        {v.cycle && (
          <path
            d={`M${last.x + 85} ${last.y + 80}V420H16V18H120V39`}
            stroke="#555"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            markerEnd={`url(#${id})`}
            fill="none"
          />
        )}
      </svg>
      {v.cycle && <p className="visual-unit">Return loop: {v.cycle}</p>}
      <p className="visual-unit">{v.note}</p>
      <details className="visual-data">
        <summary>Read process steps</summary>
        <ol>
          {v.steps.map((s) => (
            <li key={s.label}>
              <strong>{s.label}:</strong> {s.detail}
            </li>
          ))}
        </ol>
        {v.cycle && <p>{v.cycle}</p>}
      </details>
    </div>
  );
}
function Maps({ visual: v }: { visual: MapVisual }) {
  const id = useId();
  const patterns = {
    building: "#dedede",
    green: `url(#${id}-green-0)`,
    parking: `url(#${id}-parking-0)`,
    water: `url(#${id}-water-0)`,
    path: "#fff",
    road: "#eee",
  };
  return (
    <div className="chart-question">
      <h4>{v.title}</h4>
      {v.periods.map((period, periodIndex) => (
        <div className="map-period" key={period.title}>
          <h5>{period.title}</h5>
          <svg
            className="visual-svg map-svg"
            viewBox="0 0 600 390"
            role="img"
            aria-label={`${v.title}, ${period.title}. North is up. ${period.features.map((f) => f.label).join(", ")}. Scale bar: 50 metres.`}
          >
            <title>{`${v.title} · ${period.title}`}</title>
            <defs>
              <pattern
                id={`${id}-green-${periodIndex}`}
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <rect width="16" height="16" fill="#f7f7f7" />
                <path d="M4 11l4-7 4 7ZM8 11v3" stroke="#777" fill="none" />
              </pattern>
              <pattern
                id={`${id}-parking-${periodIndex}`}
                width="12"
                height="12"
                patternUnits="userSpaceOnUse"
              >
                <rect width="12" height="12" fill="#fff" />
                <path d="M0 12L12 0" stroke="#bcbcbc" />
              </pattern>
              <pattern
                id={`${id}-water-${periodIndex}`}
                width="18"
                height="12"
                patternUnits="userSpaceOnUse"
              >
                <rect width="18" height="12" fill="#eee" />
                <path d="M0 6q4-4 9 0t9 0" fill="none" stroke="#888" />
              </pattern>
            </defs>
            <rect
              x="30"
              y="50"
              width="540"
              height="280"
              fill="#fff"
              stroke="#333"
              strokeWidth="2"
            />
            <rect
              x="30"
              y="180"
              width="540"
              height="25"
              fill="#eee"
              stroke="#555"
            />
            <text x="300" y="197" textAnchor="middle" className="road-label">
              {v.road}
            </text>
            {period.features.map((f) => (
              <g key={f.label}>
                <rect
                  x={f.x}
                  y={f.y}
                  width={f.width}
                  height={f.height}
                  rx={f.type === "water" ? 16 : 1}
                  fill={
                    f.type === "green"
                      ? `url(#${id}-green-${periodIndex})`
                      : f.type === "parking"
                        ? `url(#${id}-parking-${periodIndex})`
                        : f.type === "water"
                          ? `url(#${id}-water-${periodIndex})`
                          : patterns[f.type]
                  }
                  stroke="#444"
                />
                <rect
                  x={f.x + 4}
                  y={f.y + f.height / 2 - 12}
                  width={f.width - 8}
                  height="25"
                  fill="#fff"
                  fillOpacity=".94"
                />
                {wrap(f.label, 20).map((part, j) => (
                  <text
                    key={j}
                    x={f.x + f.width / 2}
                    y={f.y + f.height / 2 + 5 + j * 16}
                    textAnchor="middle"
                  >
                    {part}
                  </text>
                ))}
              </g>
            ))}
            <g transform="translate(552,10)">
              <text x="0" y="8" textAnchor="middle">
                N
              </text>
              <path d="M0 15l-5 12h10ZM0 15v27" fill="#222" stroke="#222" />
            </g>
            <path
              d="M45 344v9h100v-9M95 349v4"
              stroke="#222"
              strokeWidth="2"
              fill="none"
            />
            <text x="45" y="370">
              0
            </text>
            <text x="145" y="370" textAnchor="end">
              50 m
            </text>
            <text x="565" y="369" textAnchor="end" className="axis-label">
              Same scale in both maps
            </text>
          </svg>
        </div>
      ))}
      <div className="map-legend" aria-label="Map legend">
        {(
          [
            { type: "building", label: "Built area" },
            { type: "green", label: "Green / open space" },
            { type: "parking", label: "Parking" },
            { type: "water", label: "Water" },
            { type: "road", label: "Road" },
          ] as const
        ).map((item) => (
          <span key={item.type}>
            <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
              <rect
                x=".5"
                y=".5"
                width="17"
                height="13"
                fill={patterns[item.type]}
                stroke="#555"
              />
            </svg>
            {item.label}
          </span>
        ))}
      </div>
      <p className="visual-unit">{v.note}</p>
      <details className="visual-data">
        <summary>Read map labels</summary>
        {v.periods.map((p) => (
          <div key={p.title}>
            <strong>{p.title}</strong>
            <ul>
              {p.features.map((f) => (
                <li key={f.label}>
                  {f.y < 180 ? "North" : "South"} of {v.road},{" "}
                  {f.x < 200 ? "west" : f.x < 380 ? "centre" : "east"}:{" "}
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </details>
    </div>
  );
}
function Table({ visual: v }: { visual: TableVisual }) {
  return (
    <div className="chart-question">
      <h4>{v.title}</h4>
      <p className="visual-unit">{v.unit}</p>
      <DataTable caption={v.title} headers={v.headers} rows={v.rows} />
    </div>
  );
}
function VisualBody({ visual }: { visual: QuestionVisual }) {
  switch (visual.kind) {
    case "bar":
    case "line":
      return <Cartesian visual={visual} />;
    case "pie":
      return <Pies visual={visual} />;
    case "table":
      return <Table visual={visual} />;
    case "process":
      return <Process visual={visual} />;
    case "map":
      return <Maps visual={visual} />;
    case "mixed":
      return (
        <div className="mixed-visual">
          {visual.charts.map((chart, i) => (
            <VisualBody key={i} visual={chart} />
          ))}
        </div>
      );
  }
}
export default memo(function QuestionVisual({
  visual,
}: {
  visual: QuestionVisual;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(100);
  return (
    <section className="question-visual" aria-label="Question visual">
      <div className="visual-actions">
        <span>VECTOR VISUAL · ORIGINAL DATA</span>
        <button
          className="secondary compact"
          onClick={() => {
            setZoom(100);
            dialog.current?.showModal();
          }}
        >
          <Maximize2 size={13} /> Enlarge visual
        </button>
      </div>
      <div className="visual-scroll">
        <VisualBody visual={visual} />
      </div>
      <p className="visual-hint">
        Scroll sideways if needed, or enlarge for a closer view.
      </p>
      <dialog
        className="visual-dialog"
        ref={dialog}
        aria-label={`Enlarged visual: ${visual.title}`}
      >
        <header>
          <div>
            <strong>{visual.title}</strong>
            <p>Your session timer keeps running while viewing the visual.</p>
          </div>
          <button
            className="icon-button"
            aria-label="Close enlarged visual"
            onClick={() => dialog.current?.close()}
          >
            <X size={18} />
          </button>
        </header>
        <div className="zoom-toolbar">
          <button
            className="secondary compact"
            aria-label="Zoom out"
            disabled={zoom <= 50}
            onClick={() => setZoom((z) => z - 25)}
          >
            <Minus size={14} />
          </button>
          <output aria-live="polite">{zoom}%</output>
          <button
            className="secondary compact"
            aria-label="Zoom in"
            disabled={zoom >= 200}
            onClick={() => setZoom((z) => z + 25)}
          >
            <Plus size={14} />
          </button>
          <button className="text-button" onClick={() => setZoom(100)}>
            Reset zoom
          </button>
          <span>SVG stays sharp at every size · Esc to close</span>
        </div>
        <div className="enlarged-scroll">
          <div
            className="enlarged-stage"
            style={{ width: (900 * zoom) / 100, fontSize: (14 * zoom) / 100 }}
          >
            <VisualBody visual={visual} />
          </div>
        </div>
      </dialog>
    </section>
  );
});
