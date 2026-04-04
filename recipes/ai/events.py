"""Lightweight event bus for inter-agent communication.

Events are in-process and synchronous — they're the glue between the
Converse and Scribe agents.  Cross-process coordination goes through
the work queue instead.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Callable


class EventKind(str, Enum):
    # Conversation events (Converse -> Scribe)
    NEW_REQUIREMENT = "new_requirement"
    CLARIFICATION = "clarification"
    DECISION = "decision"
    CONTRADICTION = "contradiction"
    TASK_REQUEST = "task_request"

    # Spec events (Scribe -> anyone)
    SPEC_UPDATED = "spec_updated"
    SPEC_CREATED = "spec_created"

    # Queue lifecycle
    TASK_CREATED = "task_created"
    TASK_ASSIGNED = "task_assigned"

    # Curator -> Worker
    CONTEXT_READY = "context_ready"

    # Worker outcomes
    TASK_COMPLETED = "task_completed"
    TASK_FAILED = "task_failed"
    TASK_NEEDS_REVIEW = "task_needs_review"


@dataclass
class Event:
    kind: EventKind
    source: str
    data: dict = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)


class EventBus:
    """Simple publish / subscribe within a single process."""

    def __init__(self):
        self._handlers: dict[EventKind, list[Callable]] = {}
        self._log: list[Event] = []

    def subscribe(self, kind: EventKind, handler: Callable):
        self._handlers.setdefault(kind, []).append(handler)

    def publish(self, event: Event):
        self._log.append(event)
        for handler in self._handlers.get(event.kind, []):
            handler(event)

    @property
    def history(self) -> list[Event]:
        return list(self._log)
