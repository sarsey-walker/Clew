import { describe, expect, it } from "vitest";

import type { Edge, Topic, GraphEnvelope } from "./types";
import { computeRootTopicIds, computeFocusData, recommendStudyNext } from "./graph";

const topics = [
  { id: "foundation" },
  { id: "dependent" },
  { id: "independent" },
] as Topic[];

describe("computeRootTopicIds", () => {
  it("marks only topics without prerequisite parents as starting topics", () => {
    const edges = [
      {
        id: "requires-dependent",
        source_topic_id: "foundation",
        target_topic_id: "dependent",
        relation: "requires",
        rationale: "",
      },
      {
        id: "related-independent",
        source_topic_id: "dependent",
        target_topic_id: "independent",
        relation: "related",
        rationale: "",
      },
    ] as Edge[];

    expect([...computeRootTopicIds({ topics, edges })]).toEqual(["foundation", "independent"]);
  });
});

describe("prerequisite focus", () => {
  const edge = (source: string, target: string): Edge => ({ id: `${source}-${target}`, source_topic_id: source, target_topic_id: target, relation: "requires", rationale: "" });
  it("keeps longest dependency layers and frontier edges for shared paths", () => {
    const graph = { topics: [
      { id: "a", title: "A", state: "solid" }, { id: "b", title: "B", state: "solid" },
      { id: "c", title: "C", state: "learning" }, { id: "d", title: "D", state: "not_started" }
    ], edges: [edge("a", "b"), edge("a", "c"), edge("b", "c"), edge("c", "d"), edge("a", "d")] } as GraphEnvelope;
    const result = computeFocusData(graph, "d");
    expect(result.pathLayers.map(layer => layer.map(topic => topic.id))).toEqual([["a"], ["b"], ["c"], ["d"]]);
    expect([...result.frontierEdgeIds]).toEqual(["a-c", "b-c"]);
    expect(result.ancestorIds).toEqual(new Set(["a", "b", "c"]));
  });
  it("handles an empty graph, unrelated edges and a long chain without recursion", () => {
    expect(computeFocusData(null, null).pathLayers).toEqual([]);
    const graph = { topics: Array.from({ length: 3000 }, (_, i) => ({ id: String(i), title: String(i), state: "not_started" })),
      edges: Array.from({ length: 2999 }, (_, i) => edge(String(i), String(i + 1))) } as GraphEnvelope;
    expect(computeFocusData(graph, "2999").pathLayers).toHaveLength(3000);
  });
  it("does not loop forever on an invalid imported cycle", () => {
    const graph = { topics: [{ id: "a" }, { id: "b" }], edges: [edge("a", "b"), edge("b", "a")] } as GraphEnvelope;
    expect(computeFocusData(graph, "b").pathLayers).toEqual([]);
  });
});

describe("study next recommendation", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  const topic = (id: string, state: Topic["state"], dueAt?: string): Topic => ({
    id, title: id, description: "A study topic", state,
    review: dueAt ? { last_reviewed_at: null, due_at: dueAt, interval_days: 3, streak: 1, last_rating: "remembered" } : undefined,
  } as Topic);
  const edge = (source: string, target: string): Edge => ({
    id: `${source}-${target}`, source_topic_id: source, target_topic_id: target, relation: "requires", rationale: "",
  });
  const graph = (studyTopics: Topic[], edges: Edge[] = []): GraphEnvelope => ({
    graph_id: "test", subject: "Test", title: "Test", language: "en", version: 1,
    topics: studyTopics, edges, zones: [], quiz_attempts: [], metadata: {},
  });

  it("prioritizes the oldest due review even for a closed topic", () => {
    const studyGraph = graph([
      topic("new", "not_started"),
      topic("recent", "solid", "2026-11-16T10:00:00Z"),
      topic("older", "mastered", "2026-11-15T10:00:00Z"),
    ]);
    expect(recommendStudyNext(studyGraph, now)).toMatchObject({ topic: { id: "older" }, reason: "due_review" });
  });

  it("chooses a ready topic and never jumps past an open prerequisite", () => {
    const studyGraph = graph([
      topic("blocked", "not_started"), topic("ready", "not_started"),
      topic("root", "learning"), topic("closed", "solid"),
    ], [edge("root", "blocked"), edge("closed", "ready")]);
    expect(recommendStudyNext(studyGraph, now)).toMatchObject({ topic: { id: "root" }, reason: "continue_learning" });
    studyGraph.topics[2].state = "solid";
    expect(recommendStudyNext(studyGraph, now)).toMatchObject({ topic: { id: "blocked" }, reason: "ready_to_start" });
  });

  it("prefers practice and skips an unusable due review", () => {
    const noDescription = topic("no-description", "solid", "2026-11-14T10:00:00Z");
    noDescription.description = "";
    const studyGraph = graph([noDescription, topic("new", "not_started"), topic("shaky", "shaky")]);
    expect(recommendStudyNext(studyGraph, now)).toMatchObject({ topic: { id: "shaky" }, reason: "needs_practice" });
  });

  it("offers an early review only after all learning topics are closed", () => {
    const studyGraph = graph([topic("closed", "solid", "2026-11-19T10:00:00Z")]);
    expect(recommendStudyNext(studyGraph, now)).toMatchObject({ topic: { id: "closed" }, reason: "early_review" });
    studyGraph.topics[0].review = undefined;
    expect(recommendStudyNext(studyGraph, now)).toBeNull();
  });
});
