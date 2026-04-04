"""Git operations with worktree support.

Each task gets its own worktree + branch so work is isolated
and can be reviewed / merged independently by humans or agents.

All git commands go through a single lock to avoid concurrent
mutation of the repository.
"""

from __future__ import annotations

import os
import subprocess
import threading
from dataclasses import dataclass


@dataclass
class Worktree:
    path: str
    branch: str
    head: str = ""


class GitTracker:
    """Single-actor wrapper around git, focused on worktrees."""

    def __init__(self, repo_path: str = ".", worktree_dir: str = ".worktrees"):
        self.repo = os.path.abspath(repo_path)
        self.worktree_dir = os.path.join(self.repo, worktree_dir)
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Low-level
    # ------------------------------------------------------------------

    def _run(self, *args, cwd: str | None = None, check: bool = True) -> str:
        result = subprocess.run(
            ["git", *args],
            cwd=cwd or self.repo,
            capture_output=True,
            text=True,
        )
        if check and result.returncode != 0:
            raise RuntimeError(
                f"git {' '.join(args)} failed:\n{result.stderr.strip()}"
            )
        return result.stdout.strip()

    # ------------------------------------------------------------------
    # Worktree management
    # ------------------------------------------------------------------

    def create_worktree(self, name: str, base_branch: str = "HEAD") -> str:
        """Create a new worktree with a dedicated branch.  Returns the path."""
        wt_path = os.path.join(self.worktree_dir, name)
        branch = f"agent/{name}"

        with self._lock:
            os.makedirs(self.worktree_dir, exist_ok=True)
            self._run("worktree", "add", "-b", branch, wt_path, base_branch)

        return wt_path

    def remove_worktree(self, name: str):
        wt_path = os.path.join(self.worktree_dir, name)
        with self._lock:
            self._run("worktree", "remove", "--force", wt_path)

    def list_worktrees(self) -> list[Worktree]:
        raw = self._run("worktree", "list", "--porcelain")
        worktrees: list[Worktree] = []
        current: dict = {}

        for line in raw.splitlines():
            if line.startswith("worktree "):
                if current:
                    worktrees.append(Worktree(**current))
                current = {"path": line.split(" ", 1)[1]}
            elif line.startswith("HEAD "):
                current["head"] = line.split(" ", 1)[1]
            elif line.startswith("branch "):
                current["branch"] = line.split(" ", 1)[1]

        if current:
            worktrees.append(Worktree(
                path=current.get("path", ""),
                branch=current.get("branch", ""),
                head=current.get("head", ""),
            ))

        return worktrees

    # ------------------------------------------------------------------
    # Commit / diff
    # ------------------------------------------------------------------

    def commit(self, message: str, files: list[str] | None = None,
               worktree: str | None = None):
        """Stage *files* (or all changes) and commit in *worktree*."""
        cwd = worktree or self.repo
        with self._lock:
            if files:
                for f in files:
                    self._run("add", f, cwd=cwd)
            else:
                self._run("add", "-A", cwd=cwd)
            self._run("commit", "-m", message, cwd=cwd, check=False)

    def diff(self, worktree: str | None = None, ref: str | None = None) -> str:
        cwd = worktree or self.repo
        args = ["diff"]
        if ref:
            args.append(ref)
        return self._run(*args, cwd=cwd)

    # ------------------------------------------------------------------
    # File helpers (for agents writing into worktrees)
    # ------------------------------------------------------------------

    def write_file(self, path: str, content: str, worktree: str | None = None):
        base = worktree or self.repo
        full = os.path.join(base, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w") as f:
            f.write(content)

    def read_file(self, path: str, worktree: str | None = None) -> str:
        base = worktree or self.repo
        full = os.path.join(base, path)
        with open(full) as f:
            return f.read()
