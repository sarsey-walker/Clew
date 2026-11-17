from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

INLINE_QUIZ_CHOICE_COUNT = 4
from app.models.domain import EdgeRelation, ProposalOpenQuestion


class ToolInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ProposalResourceDraft(ToolInput):
    id: str | None = None
    label: str
    url: str
    kind: str = "reference"


class ProposalTopicDraft(ToolInput):
    id: str = Field(description="Stable topic ID. Reuse an existing ID for an edit; choose a new ID for a new topic.")
    title: str
    slug: str = Field(description="Short URL-style topic name, for example linear-algebra.")
    description: str = ""
    difficulty: float = 0.0
    estimated_minutes: int = 0
    level: int = 0
    state: str = "not_started"
    zones: list[str] = Field(default_factory=list)
    resources: list[ProposalResourceDraft] = Field(default_factory=list)


class ProposalEdgeDraft(ToolInput):
    id: str
    source_topic_id: str = Field(description="For requires, the prerequisite topic ID.")
    target_topic_id: str = Field(description="For requires, the topic that needs the prerequisite.")
    relation: EdgeRelation = "requires"
    rationale: str = ""
    weight: float = 1.0


class ProposalZoneDraft(ToolInput):
    id: str
    title: str
    kind: str = Field(description="A descriptive region type such as module, foundation or project. Free text, not an enum.")
    topic_ids: list[str] = Field(default_factory=list)


class GraphOperationDraft(ToolInput):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, json_schema_extra={"examples": [
        {"op_id": "add-algebra", "op": "upsert_topic", "entity_kind": "topic", "topic": {"id": "algebra", "title": "Algebra", "slug": "algebra"}},
        {"op_id": "connect", "op": "upsert_edge", "entity_kind": "edge", "edge": {"id": "algebra-to-matrices", "source_topic_id": "algebra", "target_topic_id": "matrices", "relation": "requires"}},
        {"op_id": "group", "op": "upsert_zone", "entity_kind": "zone", "zone": {"id": "foundations", "title": "Foundations", "kind": "module", "topic_ids": ["algebra", "matrices"]}},
    ]})
    op_id: str = Field(min_length=1)
    op: Literal["upsert_topic", "upsert_edge", "upsert_zone"]
    entity_kind: Literal["topic", "edge", "zone"]
    rationale: str = ""
    topic: ProposalTopicDraft | None = None
    edge: ProposalEdgeDraft | None = None
    zone: ProposalZoneDraft | None = None

    @model_validator(mode="after")
    def matching_payload(self):
        entity = self.op.removeprefix("upsert_")
        if self.entity_kind != entity or getattr(self, entity) is None:
            raise ValueError("Operation, entity_kind and payload must describe the same entity.")
        if sum(getattr(self, kind) is not None for kind in ("topic", "edge", "zone")) != 1:
            raise ValueError("An operation must contain exactly one entity payload.")
        return self


class ProposalDraft(ToolInput):
    model_config = {"extra": "forbid"}
    base_graph_version: int = Field(ge=1)
    summary: str = Field(min_length=1, description="A concise description of the proposed graph change for user review.")
    assistant_message: str = Field(
        default="",
        description="A message explaining the proposal. Format with standard single unescaped newlines. DO NOT output literal double-escaped '\\n' strings."
    )
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    open_questions: list[ProposalOpenQuestion] = Field(default_factory=list)
    operations: list[GraphOperationDraft] = Field(default_factory=list, description="Graph edits. Each operation has one matching payload: upsert_topic/topic/topic, upsert_edge/edge/edge, or upsert_zone/zone/zone. Use draft fields only, not stored-topic artifacts or metadata.")


class InlineQuizDraft(ToolInput):
    question: str = Field(min_length=1)
    choices: list[str]
    correct_index: int
    explanation: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def _validate_shape(self) -> "InlineQuizDraft":
        if len(self.choices) != INLINE_QUIZ_CHOICE_COUNT:
            raise ValueError(f"inline quiz must contain exactly {INLINE_QUIZ_CHOICE_COUNT} choices")
        if len(set(self.choices)) != INLINE_QUIZ_CHOICE_COUNT:
            raise ValueError("inline quiz choices must be distinct")
        if self.correct_index < 0 or self.correct_index >= INLINE_QUIZ_CHOICE_COUNT:
            raise ValueError("inline quiz correct_index is out of range")
        return self


class QuizQuestionDraft(ToolInput):
    prompt: str = Field(min_length=1)
    choices: list[str]
    correct_choice_index: int
    explanation: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def _validate_shape(self) -> "QuizQuestionDraft":
        if len(self.choices) != INLINE_QUIZ_CHOICE_COUNT:
            raise ValueError(f"quiz question must contain exactly {INLINE_QUIZ_CHOICE_COUNT} choices")
        if len(set(self.choices)) != INLINE_QUIZ_CHOICE_COUNT:
            raise ValueError("quiz question choices must be distinct")
        if self.correct_choice_index < 0 or self.correct_choice_index >= INLINE_QUIZ_CHOICE_COUNT:
            raise ValueError("quiz question correct_choice_index is out of range")
        return self


class QuizQuestionSetDraft(ToolInput):
    questions: list[QuizQuestionDraft] = Field(default_factory=list)


class QuestionDraft(ToolInput):
    model_config = {"extra": "forbid"}
    question: str = Field(min_length=1, max_length=4000)
    choices: list[str] = Field(default_factory=list, max_length=6)


class GraphPathDraft(ToolInput):
    topic_id: str = Field(min_length=1)


class FlowStepDraft(ToolInput):
    label: str = Field(min_length=1, max_length=70)
    detail: str = Field(default="", max_length=180)


class FlowVisualDraft(ToolInput):
    title: str = Field(min_length=1, max_length=100)
    steps: list[FlowStepDraft] = Field(min_length=2, max_length=6)
    takeaway: str = Field(default="", max_length=240)


class CoordinatePointDraft(ToolInput):
    id: str = Field(min_length=1, max_length=12, pattern=r"^[A-Za-z][A-Za-z0-9_-]*$")
    label: str = Field(min_length=1, max_length=50)
    x: float = Field(ge=-1000, le=1000, allow_inf_nan=False)
    y: float = Field(ge=-1000, le=1000, allow_inf_nan=False)


class CoordinateSegmentDraft(ToolInput):
    source_id: str = Field(min_length=1)
    target_id: str = Field(min_length=1)
    directed: bool = False


class CoordinateVisualDraft(ToolInput):
    title: str = Field(min_length=1, max_length=100)
    x_min: float = Field(ge=-1000, le=1000, allow_inf_nan=False)
    x_max: float = Field(ge=-1000, le=1000, allow_inf_nan=False)
    y_min: float = Field(ge=-1000, le=1000, allow_inf_nan=False)
    y_max: float = Field(ge=-1000, le=1000, allow_inf_nan=False)
    points: list[CoordinatePointDraft] = Field(min_length=1, max_length=6)
    segments: list[CoordinateSegmentDraft] = Field(default_factory=list, max_length=8)
    takeaway: str = Field(default="", max_length=240)

    @model_validator(mode="after")
    def valid_geometry(self) -> "CoordinateVisualDraft":
        width, height = self.x_max - self.x_min, self.y_max - self.y_min
        if width < 1e-6 or height < 1e-6:
            raise ValueError("Coordinate bounds must have a positive width and height.")
        if max(width / height, height / width) > 6:
            raise ValueError("Coordinate bounds are too narrow for a readable equal-scale plot.")
        ids = {point.id for point in self.points}
        if len(ids) != len(self.points):
            raise ValueError("Coordinate point IDs must be unique.")
        if any(not (self.x_min <= point.x <= self.x_max and self.y_min <= point.y <= self.y_max) for point in self.points):
            raise ValueError("Every coordinate point must lie inside the displayed bounds.")
        points_by_id = {point.id: point for point in self.points}
        for segment in self.segments:
            if segment.source_id not in ids or segment.target_id not in ids:
                raise ValueError("Every segment must connect displayed points.")
            start, end = points_by_id[segment.source_id], points_by_id[segment.target_id]
            if start.id == end.id or (start.x, start.y) == (end.x, end.y):
                raise ValueError("Every segment must connect two distinct displayed positions.")
        return self


class ClosureQuizDraft(QuizQuestionSetDraft):
    model_config = {"extra": "forbid"}
    topic_id: str


class ReviewPromptDraft(ToolInput):
    topic_id: str = Field(min_length=1)
    question: str = Field(min_length=15, max_length=2000)
    reference: str = Field(min_length=15, max_length=4000)


class ConnectionPromptDraft(ToolInput):
    edge_id: str = Field(min_length=1)
    question: str = Field(min_length=15, max_length=2000)
    reference: str = Field(min_length=15, max_length=4000)


TOOL_MODELS = {
    "propose_ingest": ProposalDraft,
    "propose_expand": ProposalDraft,
    "ask_question": QuestionDraft,
    "present_quiz": InlineQuizDraft,
    "show_graph_path": GraphPathDraft,
    "show_flow_visual": FlowVisualDraft,
    "show_coordinate_visual": CoordinateVisualDraft,
    "create_closure_quiz": ClosureQuizDraft,
    "present_review_prompt": ReviewPromptDraft,
    "present_connection_prompt": ConnectionPromptDraft,
}


CLOSURE_QUIZ_TOOLS = frozenset({"read_graph", "read_topic", "create_closure_quiz"})
REVIEW_PROMPT_TOOLS = frozenset({"read_topic", "present_review_prompt"})
CONNECTION_PROMPT_TOOLS = frozenset({"read_topic", "present_connection_prompt"})


def tool_specs(only: frozenset[str] | None = None) -> list[dict[str, Any]]:
    """Clew tools as Responses API function tools."""
    descriptions = {
        "propose_ingest": "Submit graph operations that preserve the supplied source material. Clew validates and presents them for user review; this does not apply changes. Omitted descriptive metadata is preserved on existing topics. Read the current graph version first.",
        "propose_expand": "Submit graph operations that extend the learning path toward the user's goal. Clew validates and presents them for user review; this does not apply changes. Omitted descriptive metadata is preserved on existing topics. Read the current graph version first.",
        "ask_question": "Show a focused question, optionally with choices and free-text replies. Ends this reply; the learner's answer arrives from Clew in a new turn.",
        "present_quiz": "Show one multiple-choice learning checkpoint with exactly four distinct choices and a concise explanation. Use plausible misconceptions as distractors, with parallel wording and no answer-revealing cues. Ends this reply; Clew sends the server-graded answer in a new turn. Does not award topic completion.",
        "show_graph_path": "Show a card that opens an existing topic and highlights its prerequisite path in the learner's graph. Use when the relationship or dependency is clearer in the graph. This does not change the graph.",
        "show_flow_visual": "Show a compact, ordered flow of 2–6 steps for a process or derivation that is clearer with direction. Keep each step short and factually grounded. This is a study card, not a graph edit.",
        "show_coordinate_visual": "Show a bounded coordinate plane with 1–6 labeled points and optional segments (directed for vectors). Use for geometry, vectors or spatial reasoning when exact coordinates matter. Supply correct coordinates and visible bounds. This is a study card, not a graph edit.",
        "create_closure_quiz": "Register a complete closure quiz for a topic. Supply the requested number of questions with four distinct choices each. Clew checks prerequisites and grades the learner's answers itself.",
        "present_review_prompt": "Prepare one open recall question for the requested topic and a concise reference answer. Clew validates and shows both in the topic review dialog; this does not change graph progress.",
        "present_connection_prompt": "Prepare one open question that makes the learner connect the two topics on the requested graph edge, plus a concise reference answer. Clew validates and shows both without changing graph progress.",
    }
    functions = [
        {"type": "function", "name": name, "description": descriptions[name], "parameters": model.model_json_schema(), "strict": False}
        for name, model in TOOL_MODELS.items()
    ]
    functions.extend([
        {"type": "function", "name": "read_graph", "description": "Read the current graph, its version, topics, edges, zones and progress. Call again after a conflict; do not guess ids or graph revisions.", "parameters": {"type": "object", "properties": {}, "additionalProperties": False}, "strict": False},
        {"type": "function", "name": "read_topic", "description": "Read the full content, resources, artifacts and prerequisites of a topic in this conversation's graph.", "parameters": {"type": "object", "properties": {"topic_id": {"type": "string"}}, "required": ["topic_id"], "additionalProperties": False}, "strict": False},
    ])
    return [tool for tool in functions if tool["name"] in only] if only is not None else [
        tool for tool in functions if tool["name"] not in {"present_review_prompt", "present_connection_prompt"}
    ]
