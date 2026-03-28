# AI Plugin — Project Description

## Overview

The AI plugin is designed to work with both remote providers and local models. When using local models, the plugin goes through the scheduler to download, load, and run the model.

## Sandboxed Execution

Local models run in a container environment and never have access to the full system. They only receive access to the resources they need to complete their assigned task.

## State Management & Versioning

Model state is managed through the article block, which supports versioning. This allows agent changes to be reviewed, approved, or rolled back.

## Work Distribution

Regardless of where the model actually runs, work is distributed using a PostgreSQL table as a work queue. Agents pop work items and push results in parallel.

The work queue supports **priority** and **dependencies**, forming a tree of work items. A task is only eligible to be popped when its dependencies have been resolved. Priority determines the order in which eligible tasks are picked up.

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
