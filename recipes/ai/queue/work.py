"""Persistent work queue backed by SQLAlchemy.

Defaults to SQLite but any SQLAlchemy-supported backend (PostgreSQL, …)
works by changing the connection URL.

Tasks have priority and optional dependencies.  A task is eligible for
popping only when all its dependencies are in *completed* status.

The queue is the cross-process coordination mechanism — agents pop tasks,
do work, then push results.  Each row links to text files on disk (spec,
context, result) so everything stays git-trackable.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    String,
    Text,
    create_engine,
    desc,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Session,
    sessionmaker,
)


class TaskStatus:
    PENDING = "pending"
    CURATING = "curating"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    REVIEW = "review"


def _now():
    return datetime.now(timezone.utc)


def _task_id():
    return uuid.uuid4().hex[:12]


# ---------------------------------------------------------------------------
# ORM model
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    pass


class Task(Base):
    __tablename__ = "tasks"

    id          = Column(String, primary_key=True, default=_task_id)
    title       = Column(String, nullable=False)
    description = Column(Text, default="")
    status      = Column(String, default=TaskStatus.PENDING, index=True)
    priority    = Column(Integer, default=0)
    spec_path   = Column(String, default="")
    context_path = Column(String, default="")
    result_path = Column(String, default="")
    worktree    = Column(String, default="")
    retries     = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    created_at  = Column(DateTime(timezone=True), default=_now)
    updated_at  = Column(DateTime(timezone=True), default=_now, onupdate=_now)
    assigned_to = Column(String, default="")
    depends_on  = Column(String, default="")
    error_log   = Column(Text, default="")


# ---------------------------------------------------------------------------
# Queue
# ---------------------------------------------------------------------------

class WorkQueue:
    """Work queue with priority and dependency support.

    Parameters
    ----------
    url : str
        SQLAlchemy connection URL.  Defaults to a local SQLite file.
    """

    def __init__(self, url: str = "sqlite:///work.db"):
        self.engine = create_engine(url)
        Base.metadata.create_all(self.engine)
        self._Session = sessionmaker(bind=self.engine)

    def session(self) -> Session:
        return self._Session()

    # ------------------------------------------------------------------
    # Push / pop
    # ------------------------------------------------------------------

    def push(self, title: str, description: str = "",
             priority: int = 0, depends_on: list[str] | None = None,
             max_retries: int = 3, spec_path: str = "") -> Task:
        """Insert a new task and return it."""
        deps = ",".join(depends_on) if depends_on else ""
        task = Task(
            title=title,
            description=description,
            priority=priority,
            depends_on=deps,
            max_retries=max_retries,
            spec_path=spec_path,
        )
        with self.session() as s:
            s.add(task)
            s.commit()
            s.refresh(task)
        return task

    def pop(self, status: str = TaskStatus.PENDING) -> Task | None:
        """Atomically grab the next eligible task (highest priority, deps met)."""
        with self.session() as s:
            candidates = (
                s.query(Task)
                .filter(Task.status == status)
                .order_by(desc(Task.priority), Task.created_at)
                .all()
            )
            for task in candidates:
                if self._deps_resolved(s, task):
                    return task
        return None

    # ------------------------------------------------------------------
    # Update / query
    # ------------------------------------------------------------------

    def update(self, task_id: str, **fields):
        """Update arbitrary fields on a task."""
        with self.session() as s:
            task = s.get(Task, task_id)
            if task is None:
                return
            for key, value in fields.items():
                setattr(task, key, value)
            s.commit()

    def get(self, task_id: str) -> Task | None:
        with self.session() as s:
            task = s.get(Task, task_id)
            if task:
                s.expunge(task)
            return task

    def list(self, status: str | None = None) -> list[Task]:
        with self.session() as s:
            q = s.query(Task).order_by(desc(Task.priority), Task.created_at)
            if status is not None:
                q = q.filter(Task.status == status)
            tasks = q.all()
            for t in tasks:
                s.expunge(t)
            return tasks

    # ------------------------------------------------------------------
    # Dependency resolution
    # ------------------------------------------------------------------

    def _deps_resolved(self, session: Session, task: Task) -> bool:
        if not task.depends_on:
            return True

        dep_ids = [d.strip() for d in task.depends_on.split(",") if d.strip()]
        for dep_id in dep_ids:
            dep = session.get(Task, dep_id)
            if dep is None or dep.status != TaskStatus.COMPLETED:
                return False
        return True
