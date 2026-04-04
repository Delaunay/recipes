"""Agent framework — base class and prompt loader."""

from __future__ import annotations

from pathlib import Path

from assai.events import Event, EventBus, EventKind


_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def load_prompt(name: str) -> str:
    """Read a prompt template from ``ai/prompts/<name>``."""
    return (_PROMPTS_DIR / name).read_text()


class Agent:
    """Base class for all agents.

    Subclasses override ``setup()`` to subscribe to events and
    implement their own entry points (``respond``, ``process``, …).
    """

    def __init__(self, name: str, config, events: EventBus | None = None, llm=None):
        self.name = name
        self.config = config
        self.events = events
        self.llm = llm
        self.setup()

    def setup(self):
        """Subscribe to events, initialise state.  Override in subclasses."""

    def emit(self, kind: EventKind, data: dict | None = None):
        if self.events is not None:
            self.events.publish(Event(kind=kind, source=self.name, data=data or {}))
