import { useId } from "react";
import type { StudyVisualCard } from "../../lib/types";

function CoordinateVisual({ visual }: { visual: Extract<StudyVisualCard, { kind: "coordinates" }> }) {
  const markerId = useId().replaceAll(":", "");
  const scale = Math.min(292 / (visual.x_max - visual.x_min), 218 / (visual.y_max - visual.y_min));
  const width = (visual.x_max - visual.x_min) * scale;
  const height = (visual.y_max - visual.y_min) * scale;
  const left = 44 + (292 - width) / 2;
  const right = left + width;
  const top = 18 + (218 - height) / 2;
  const bottom = top + height;
  const x = (value: number) => left + (value - visual.x_min) * scale;
  const y = (value: number) => bottom - (value - visual.y_min) * scale;
  const points = new Map(visual.points.map((point) => [point.id, point]));
  const xAxis = visual.y_min <= 0 && visual.y_max >= 0 ? y(0) : null;
  const yAxis = visual.x_min <= 0 && visual.x_max >= 0 ? x(0) : null;
  const description = visual.points.map((point) => `${point.label}: (${point.x}, ${point.y})`).join("; ");

  return <>
    <div className="studyCoordinateScroll">
      <svg className="studyCoordinatePlane" viewBox="0 0 380 265" role="img" aria-label={`${visual.title}. ${description}`}>
        <defs>
          <marker id={markerId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
            <path d="M0 0 L7 3.5 L0 7" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </marker>
        </defs>
        {[1, 2, 3].map((index) => <g key={index} className="studyCoordinateGrid">
          <line x1={left + index * (right - left) / 4} x2={left + index * (right - left) / 4} y1={top} y2={bottom} />
          <line x1={left} x2={right} y1={top + index * (bottom - top) / 4} y2={top + index * (bottom - top) / 4} />
        </g>)}
        <rect className="studyCoordinateFrame" x={left} y={top} width={right - left} height={bottom - top} />
        {xAxis !== null ? <line className="studyCoordinateAxis" x1={left} x2={right} y1={xAxis} y2={xAxis} /> : null}
        {yAxis !== null ? <line className="studyCoordinateAxis" x1={yAxis} x2={yAxis} y1={top} y2={bottom} /> : null}
        {visual.segments.map((segment, index) => {
          const start = points.get(segment.source_id);
          const end = points.get(segment.target_id);
          if (!start || !end) return null;
          return <line key={`${segment.source_id}-${segment.target_id}-${index}`} className="studyCoordinateSegment"
            x1={x(start.x)} y1={y(start.y)} x2={x(end.x)} y2={y(end.y)}
            markerEnd={segment.directed ? `url(#${markerId})` : undefined} />;
        })}
        {visual.points.map((point) => <g key={point.id}>
          <circle className="studyCoordinatePoint" cx={x(point.x)} cy={y(point.y)} r="4" />
          <text className="studyCoordinatePointLabel" x={x(point.x) + 7} y={y(point.y) - 7}>{point.id}</text>
        </g>)}
        <text className="studyCoordinateBound" x={left} y={bottom + 16} textAnchor="start">{visual.x_min}</text>
        <text className="studyCoordinateBound" x={right} y={bottom + 16} textAnchor="end">{visual.x_max}</text>
        <text className="studyCoordinateBound" x="37" y={top + 4} textAnchor="end">{visual.y_max}</text>
        <text className="studyCoordinateBound" x="37" y={bottom + 4} textAnchor="end">{visual.y_min}</text>
      </svg>
    </div>
    <ul className="studyCoordinateLegend">
      {visual.points.map((point) => <li key={point.id}><strong>{point.id}</strong> {point.label} <span>({point.x}, {point.y})</span></li>)}
    </ul>
  </>;
}

export function StudyVisual({ visual }: { visual: StudyVisualCard }) {
  return <section className="studyVisualCard" aria-label={visual.title}>
    <div className="studyVisualHeader">
      <span className="studyVisualKind">{visual.kind === "flow" ? "Flow" : "Coordinate plane"}</span>
      <strong>{visual.title}</strong>
    </div>
    {visual.kind === "flow" ? <ol className="studyFlowSteps">
      {visual.steps.map((step, index) => <li key={index}>
        <span className="studyFlowIndex">{index + 1}</span>
        <div><strong>{step.label}</strong>{step.detail ? <span>{step.detail}</span> : null}</div>
      </li>)}
    </ol> : <CoordinateVisual visual={visual} />}
    {visual.takeaway ? <p className="studyVisualTakeaway">{visual.takeaway}</p> : null}
  </section>;
}
