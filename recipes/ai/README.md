# AI Plugin — Project Description

## Overview

The AI plugin is designed to work with both remote providers and local models. When using local models, the plugin goes through the scheduler to download, load, and run the model.

## Sandboxed Execution

Local models run in a container environment and never have access to the full system. They only receive access to the resources they need to complete their assigned task.

## Architecture — Four Agents

Work is split across four specialised agents that communicate through
an event bus (in-process) and a persistent work queue (cross-process).

```
Human ──► Converse ──events──► Scribe
               │                  │
               │ task_request      │ spec files (git tracked)
               ▼                  ▼
          Work Queue ◄────────────
               │
               ▼
           Curator  ──► context bundle
               │
               ▼
            Worker  ──► deliverable (in a git worktree)
```

| Agent       | Role | Trigger |
|-------------|------|---------|
| **Converse** | Dialogue with the human, grounded by the current spec | Human message |
| **Scribe**   | Distil conversation into living spec documents | Structured events from Converse |
| **Curator**  | Select relevant specs and build a context bundle for a task | Queue poll (pending tasks) |
| **Worker**   | Execute the task, verify the deliverable, commit to a worktree | Queue poll (ready tasks) |

### Event Flow

The Converse agent classifies each conversation turn and emits structured
events (`new_requirement`, `clarification`, `decision`, `contradiction`,
`task_request`).  The Scribe subscribes to these and incrementally refines
the spec — which is the single source of truth.

### Work Queue

Tasks flow through the queue with these statuses:

    pending → curating → ready → in_progress → completed
                                             → failed
                                             → review (human required)

The queue is backed by SQLite (swappable to PostgreSQL) and supports
**priority** and **dependencies**.  A task is eligible only when all its
dependencies are resolved.

### Git Tracking

All artifacts (specs, context bundles, results) are text files tracked by
git.  Each task gets its own **worktree** so work is isolated.  Humans or
agents review worktrees and merge/refine as needed.

## Configuration

Configuration follows the milabench pattern: values are defined as
dataclass fields and resolved from (highest priority first):

1. Environment variables (`ASSAI_` prefix, e.g. `ASSAI_LLM_BACKEND`)
2. YAML config file
3. Dataclass defaults

```python
from assai.config import load_config, AssaiConfig

load_config("config.yaml")   # or load_config() for defaults
config = AssaiConfig()
```

Example `config.yaml`:

```yaml
llm:
  backend: openai
  endpoint: http://127.0.0.1:9123
  model: llama-4-scout
  max_tokens: 4096
  temperature: 0.7

scribe:
  trigger: event
  specs_dir: specs

worker:
  max_retries: 3
  sandbox: container
  timeout: 300

git:
  repo_path: .
  worktree_dir: .worktrees
  auto_commit: true

queue:
  url: sqlite:///work.db      # or postgresql://user:pass@host/db
  poll_interval: 5
```

## State Management & Versioning

Model state is managed through the article block, which supports versioning. This allows agent changes to be reviewed, approved, or rolled back.

## Task Contract

Each agent requires:

- A **task** — a clearly defined unit of work
- A **deliverable** — a verifiable output that confirms the task was completed

## Verification

Deliverables must be automatically verifiable by default — human review does not scale and becomes a bottleneck. Automated verification could include schema validation, test suites, diff checks, or a secondary agent reviewing the output.

However, some tasks may require human approval (e.g., subjective quality, sensitive changes). These should be explicitly flagged as human-review tasks rather than silently blocking the queue.

Once an agent pops a task, it owns that task and continues working on it until verification passes.

Tasks flagged for human approval are skipped — agents will pick the next eligible task instead. Human-review tasks sit in the queue until a human acts on them.

Dependencies are optional. When present, a task is only eligible once its dependencies are resolved. A blocked dependency will block its entire subtree, which is by design — don't declare dependencies unless the tasks genuinely depend on each other.

If no eligible task is available, the agent waits until one becomes available.

## Module Layout

```
ai/
├── config.py              # Config system (milabench-style)
├── events.py              # Event types + EventBus
├── agents/
│   ├── __init__.py        # Agent base class
│   ├── llm.py             # Unified LLM interface (OpenAI-compatible)
│   ├── converse.py        # Converse agent
│   ├── scribe.py          # Scribe agent
│   ├── curator.py         # Curator agent
│   └── worker.py          # Worker agent
├── queue/
│   └── work.py            # SQLite work queue (priority + deps)
├── tracker/
│   └── git.py             # Git operations + worktree management
├── models/                # Model backends (text2text, text2image, …)
├── server/                # Flask + SocketIO web server
├── tools/                 # Shared utilities (caching, routing, monitoring)
├── mcp/                   # MCP tool exposure
└── data/                  # Static data (model registry, stats)
```
