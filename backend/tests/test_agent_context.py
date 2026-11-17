from __future__ import annotations

import json
import unittest
from datetime import datetime, timezone

from app.agent.context import turn_context
from app.models.domain import Edge, StudyGraph, Topic, TopicReviewAttempt, WorkspaceConfig, Zone
from app.services.repository import GraphRepository


class AgentContextTests(unittest.TestCase):
    def test_selected_topic_context_keeps_only_recent_review_evidence(self):
        now = datetime.now(timezone.utc)
        topic = Topic(id="a", title="A", slug="a", description="A topic")
        topic.review.attempts = [TopicReviewAttempt(id=str(index), question="Question", reference="Reference",
            answer=f"Answer {index}", rating="remembered", reviewed_at=now, due_at=now) for index in range(5)]
        graph = StudyGraph(graph_id="g", subject="test", title="Test", topics=[topic])
        payload = json.loads(turn_context(graph, WorkspaceConfig(), "a", []).split("\n", 1)[1])
        self.assertEqual([item["id"] for item in payload["selected_topic"]["review"]["attempts"]], ["2", "3", "4"])
        private = json.loads(turn_context(graph, WorkspaceConfig(memory_include_selected_topic_context=False), "a", []).split("\n", 1)[1])
        self.assertNotIn("selected_topic", private)

    def test_frontier_preserves_order_and_only_requires_closed_parents(self):
        names = ("closed", "ready", "blocked", "supported", "root")
        graph = StudyGraph(graph_id="g", subject="test", title="Test",
            topics=[Topic(id=name, title=name, slug=name, state="solid" if name == "closed" else "not_started") for name in names],
            edges=[Edge(id="1", source_topic_id="closed", target_topic_id="ready"),
                   Edge(id="2", source_topic_id="root", target_topic_id="blocked"),
                   Edge(id="3", source_topic_id="root", target_topic_id="supported", relation="supports")])
        payload = json.loads(turn_context(graph, WorkspaceConfig(), None, []).split("\n", 1)[1])
        self.assertEqual(payload["ready_topic_ids"], ["ready", "supported", "root"])
        self.assertNotIn("ready_topic_ids", json.loads(turn_context(graph, WorkspaceConfig(memory_include_frontier_context=False), None, []).split("\n", 1)[1]))

    def test_zone_synchronization_preserves_membership_order_and_deduplicates(self):
        topics = {name: Topic(id=name, title=name, slug=name, zones=zones) for name, zones in
                  (("a", ["x", "x"]), ("b", ["y"]), ("c", []))}
        zones = {name: Zone(id=name, title=name, kind="test", color="#ffffff", topic_ids=ids) for name, ids in
                 (("x", ["c", "b", "c"]), ("y", ["a", "b"]))}
        repository = GraphRepository.__new__(GraphRepository)
        repository._synchronize_zone_memberships(topics, zones)
        self.assertEqual(zones["x"].topic_ids, ["a", "c", "b"])
        self.assertEqual(zones["y"].topic_ids, ["b", "a"])
        self.assertEqual(topics["a"].zones, ["x", "y"])
        self.assertEqual(topics["b"].zones, ["y", "x"])
        self.assertEqual(topics["c"].zones, ["x"])
