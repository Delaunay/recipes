"""Converse agent — the LLM side of a human conversation.

Responsibilities:
    * Maintain dialogue with the human.
    * Stay grounded by re-reading the current spec before each turn.
    * Detect significant events (new requirement, contradiction, …)
      and relay them to the Scribe via the EventBus.
    * Create tasks in the work queue when the human requests work.
"""

from __future__ import annotations

import json
import os
from typing import TYPE_CHECKING

from assai.agents import Agent, load_prompt
from assai.events import EventKind

if TYPE_CHECKING:
    from assai.agents.llm import LLM
    from assai.events import EventBus


SYSTEM_PROMPT = load_prompt("converse_system.md")
EVENT_CLASSIFIER_PROMPT = load_prompt("converse_classify.md")


class ConverseAgent(Agent):
    """Interactive agent that talks to a human."""

    def __init__(self, name, config, events: EventBus | None = None,
                 llm: LLM | None = None, specs_dir: str = "specs"):
        self.specs_dir = specs_dir
        self.history: list[dict] = []
        super().__init__(name, config, events, llm)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def respond(self, message: str) -> str:
        """Take a human message and return the assistant's reply."""
        self.history.append({"role": "user", "content": message})

        spec = self._load_spec()
        messages = self._build_messages(spec)
        response = self.llm.complete(messages)

        self.history.append({"role": "assistant", "content": response})

        self._detect_and_emit_events(message, response, spec)
        return response

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _load_spec(self) -> str:
        """Read the current spec file (if it exists)."""
        path = os.path.join(self.specs_dir, "spec.md")
        if os.path.isfile(path):
            with open(path) as f:
                return f.read()
        return ""

    def _build_messages(self, spec: str) -> list[dict]:
        spec_section = (
            f"Project specification:\n\n{spec}" if spec
            else "(No specification written yet.)"
        )
        system = SYSTEM_PROMPT.format(spec_section=spec_section)
        return [{"role": "system", "content": system}] + self.history

    def _detect_and_emit_events(self, human: str, assistant: str, spec: str):
        """Ask the LLM to classify events, then publish them."""
        prompt = EVENT_CLASSIFIER_PROMPT.format(
            human=human, assistant=assistant, spec=spec,
        )
        raw = self.llm.complete([{"role": "user", "content": prompt}])

        try:
            events = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return

        if not isinstance(events, list):
            return

        kind_map = {
            "new_requirement": EventKind.NEW_REQUIREMENT,
            "clarification": EventKind.CLARIFICATION,
            "decision": EventKind.DECISION,
            "contradiction": EventKind.CONTRADICTION,
            "task_request": EventKind.TASK_REQUEST,
        }

        for ev in events:
            kind = kind_map.get(ev.get("kind"))
            if kind is not None:
                self.emit(kind, {
                    "summary": ev.get("summary", ""),
                    "human": human,
                    "assistant": assistant,
                })
