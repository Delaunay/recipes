"""Curator agent — prepares context for the Worker.

The Curator polls the work queue for *pending* tasks, scans the specs
directory for relevant documents, and produces a self-contained context
bundle that the Worker can execute against.
"""

from __future__ import annotations

import json
import os
import time
from typing import TYPE_CHECKING

from assai.agents import Agent, load_prompt
from assai.events import EventKind

if TYPE_CHECKING:
    from assai.agents.llm import LLM
    from assai.events import EventBus
    from assai.queue.work import WorkQueue


SELECT_PROMPT = load_prompt("curator_select.md")
CONTEXT_TEMPLATE = load_prompt("curator_context.md")


class CuratorAgent(Agent):
    """Prepares context bundles from specs and task descriptions."""

    def __init__(self, name, config, events: EventBus | None = None,
                 llm: LLM | None = None, specs_dir: str = "specs",
                 tasks_dir: str = "tasks"):
        self.specs_dir = specs_dir
        self.tasks_dir = tasks_dir
        super().__init__(name, config, events, llm)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process(self, task) -> str:
        """Build a context bundle for *task* and return the file path."""
        specs = self._list_specs()
        relevant = self._select_relevant(task, specs)
        context = self._build_context(task, relevant)
        return self._write_context(task.id, context)

    def run(self, queue: WorkQueue):
        """Poll the queue for pending tasks — blocking loop."""
        while True:
            task = queue.pop(status="pending")
            if task is None:
                time.sleep(self.config.queue.poll_interval)
                continue

            queue.update(task.id, status="curating", assigned_to=self.name)
            try:
                context_path = self.process(task)
                queue.update(task.id, status="ready", context_path=context_path)
                self.emit(EventKind.CONTEXT_READY, {
                    "task_id": task.id,
                    "context_path": context_path,
                })
            except Exception as exc:
                queue.update(task.id, status="pending",
                             error_log=f"curator error: {exc}")

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _list_specs(self) -> dict[str, str]:
        """Return ``{filename: content}`` for every file in the specs dir."""
        result = {}
        if not os.path.isdir(self.specs_dir):
            return result
        for name in sorted(os.listdir(self.specs_dir)):
            path = os.path.join(self.specs_dir, name)
            if os.path.isfile(path):
                with open(path) as f:
                    result[name] = f.read()
        return result

    def _select_relevant(self, task, specs: dict[str, str]) -> dict[str, str]:
        if not specs:
            return {}

        doc_list = "\n".join(f"- {name}" for name in specs)
        prompt = SELECT_PROMPT.format(
            title=task.title,
            description=task.description,
            doc_list=doc_list,
        )
        raw = self.llm.complete([{"role": "user", "content": prompt}])

        try:
            selected = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            selected = list(specs.keys())

        return {name: specs[name] for name in selected if name in specs}

    def _build_context(self, task, specs: dict[str, str]) -> str:
        refs = ""
        for name, content in specs.items():
            refs += f"\n### {name}\n{content}\n"

        return CONTEXT_TEMPLATE.format(
            title=task.title,
            description=task.description,
            references=refs or "(none)",
        )

    def _write_context(self, task_id: str, context: str) -> str:
        task_dir = os.path.join(self.tasks_dir, task_id)
        os.makedirs(task_dir, exist_ok=True)
        path = os.path.join(task_dir, "context.md")
        with open(path, "w") as f:
            f.write(context)
        return path
