"""Worker agent — executes tasks using prepared context.

The Worker polls the work queue for *ready* tasks, reads the context
bundle, executes the task, writes a result, and runs verification.
On failure it retries up to ``max_retries`` before flagging for review.

Each task gets its own git worktree so work is isolated and reviewable.
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
    from assai.tracker.git import GitTracker


EXECUTE_PROMPT = load_prompt("worker_execute.md")
VERIFY_PROMPT = load_prompt("worker_verify.md")


class WorkerAgent(Agent):
    """Executes tasks from the work queue."""

    def __init__(self, name, config, events: EventBus | None = None,
                 llm: LLM | None = None, tasks_dir: str = "tasks"):
        self.tasks_dir = tasks_dir
        super().__init__(name, config, events, llm)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def execute(self, task) -> tuple[str, bool]:
        """Run a single task.  Returns ``(result_path, verified)``."""
        context = self._read_context(task.context_path)
        prompt = EXECUTE_PROMPT.format(context=context)
        result = self.llm.complete([{"role": "user", "content": prompt}])
        result_path = self._write_result(task.id, result)

        verified = self._verify(context, result)
        return result_path, verified

    def run(self, queue: WorkQueue, git: GitTracker):
        """Poll the queue for ready tasks — blocking loop."""
        while True:
            task = queue.pop(status="ready")
            if task is None:
                time.sleep(self.config.queue.poll_interval)
                continue

            worktree = git.create_worktree(f"task-{task.id}")
            queue.update(task.id, status="in_progress",
                         assigned_to=self.name, worktree=worktree)

            try:
                result_path, verified = self.execute(task)

                if verified:
                    git.commit(worktree, f"complete: {task.title}",
                               files=[result_path])
                    queue.update(task.id, status="completed",
                                 result_path=result_path)
                    self.emit(EventKind.TASK_COMPLETED, {"task_id": task.id})

                elif task.retries + 1 < task.max_retries:
                    error = self._last_verify_reason
                    queue.update(task.id, status="pending",
                                 retries=task.retries + 1,
                                 error_log=f"retry {task.retries + 1}: {error}")

                else:
                    queue.update(task.id, status="review",
                                 error_log="max retries reached")
                    self.emit(EventKind.TASK_NEEDS_REVIEW, {"task_id": task.id})

            except Exception as exc:
                queue.update(task.id, status="failed",
                             error_log=str(exc))
                self.emit(EventKind.TASK_FAILED, {
                    "task_id": task.id, "error": str(exc),
                })

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    _last_verify_reason: str = ""

    def _read_context(self, path: str) -> str:
        with open(path) as f:
            return f.read()

    def _write_result(self, task_id: str, result: str) -> str:
        task_dir = os.path.join(self.tasks_dir, task_id)
        os.makedirs(task_dir, exist_ok=True)
        path = os.path.join(task_dir, "result.md")
        with open(path, "w") as f:
            f.write(result)
        return path

    def _verify(self, context: str, result: str) -> bool:
        prompt = VERIFY_PROMPT.format(context=context, result=result)
        raw = self.llm.complete([{"role": "user", "content": prompt}])

        try:
            verdict = json.loads(raw)
            self._last_verify_reason = verdict.get("reason", "")
            return bool(verdict.get("passed", False))
        except (json.JSONDecodeError, TypeError):
            self._last_verify_reason = f"could not parse verification: {raw[:200]}"
            return False
