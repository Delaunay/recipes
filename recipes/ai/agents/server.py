"""HTTP interface for the agent system.

Two ways to use this module:

1. **Integrate into an existing Flask app**::

       from assai.agents.server import routes
       routes(app)                          # uses default config
       routes(app, config=my_config)        # custom config

2. **Run standalone**::

       python -m assai.agents.server
       python -m assai.agents.server -c config.yaml --port 5050
"""

from __future__ import annotations

import os

from flask import Blueprint, Flask, jsonify, request

from assai.agents.converse import ConverseAgent
from assai.agents.llm import create_llm
from assai.agents.scribe import ScribeAgent
from assai.config import AssaiConfig, load_config
from assai.events import EventBus
from assai.queue.work import TaskStatus, WorkQueue
from assai.tracker.git import GitTracker


def create_blueprint(config: AssaiConfig | None = None,
                     prefix: str = "/agent") -> Blueprint:
    """Build a Flask Blueprint with all agent routes.

    The returned blueprint can be registered on any Flask app::

        bp = create_blueprint(config)
        app.register_blueprint(bp)
    """
    if config is None:
        config = AssaiConfig()

    bp = Blueprint("agent", __name__, url_prefix=prefix)

    # -- shared state, created once at blueprint construction time ------
    llm    = create_llm(config.llm)
    events = EventBus()
    queue  = WorkQueue(config.queue.url)
    git    = GitTracker(config.git.repo_path, config.git.worktree_dir)

    converse = ConverseAgent(
        "converse", config, events, llm, config.scribe.specs_dir,
    )
    ScribeAgent(
        "scribe", config, events, llm, config.scribe.specs_dir, git,
    )

    # -- helpers --------------------------------------------------------

    def _task_json(task):
        return {
            "id":           task.id,
            "title":        task.title,
            "description":  task.description,
            "status":       task.status,
            "priority":     task.priority,
            "spec_path":    task.spec_path,
            "context_path": task.context_path,
            "result_path":  task.result_path,
            "worktree":     task.worktree,
            "retries":      task.retries,
            "max_retries":  task.max_retries,
            "created_at":   str(task.created_at) if task.created_at else "",
            "updated_at":   str(task.updated_at) if task.updated_at else "",
            "assigned_to":  task.assigned_to,
            "depends_on":   task.depends_on,
            "error_log":    task.error_log,
        }

    # ==================================================================
    # Conversation
    # ==================================================================

    @bp.route("/converse", methods=["POST"])
    def agent_converse():
        data = request.get_json(silent=True) or {}
        message = data.get("message", "")
        if not message:
            return jsonify({"error": "message is required"}), 400

        response = converse.respond(message)
        return jsonify({"response": response})

    @bp.route("/history", methods=["GET"])
    def agent_history():
        return jsonify({"messages": converse.history})

    @bp.route("/history", methods=["DELETE"])
    def agent_history_clear():
        converse.history.clear()
        return jsonify({"cleared": True})

    # ==================================================================
    # Task queue
    # ==================================================================

    @bp.route("/tasks", methods=["GET"])
    def list_tasks():
        status = request.args.get("status")
        tasks = queue.list(status=status)
        return jsonify([_task_json(t) for t in tasks])

    @bp.route("/tasks", methods=["POST"])
    def create_task():
        data = request.get_json(silent=True) or {}
        title = data.get("title", "")
        if not title:
            return jsonify({"error": "title is required"}), 400

        task = queue.push(
            title=title,
            description=data.get("description", ""),
            priority=data.get("priority", 0),
            depends_on=data.get("depends_on"),
            max_retries=data.get("max_retries", config.worker.max_retries),
            spec_path=data.get("spec_path", ""),
        )
        return jsonify(_task_json(task)), 201

    @bp.route("/tasks/<task_id>", methods=["GET"])
    def get_task(task_id):
        task = queue.get(task_id)
        if task is None:
            return jsonify({"error": "not found"}), 404
        return jsonify(_task_json(task))

    @bp.route("/tasks/<task_id>", methods=["PATCH"])
    def update_task(task_id):
        data = request.get_json(silent=True) or {}
        allowed = {
            "title", "description", "status", "priority",
            "spec_path", "assigned_to", "depends_on", "max_retries",
        }
        fields = {k: v for k, v in data.items() if k in allowed}
        if not fields:
            return jsonify({"error": "no updatable fields provided"}), 400

        queue.update(task_id, **fields)
        task = queue.get(task_id)
        if task is None:
            return jsonify({"error": "not found"}), 404
        return jsonify(_task_json(task))

    # ==================================================================
    # Specs
    # ==================================================================

    @bp.route("/specs", methods=["GET"])
    def list_specs():
        specs_dir = config.scribe.specs_dir
        if not os.path.isdir(specs_dir):
            return jsonify([])
        names = sorted(
            n for n in os.listdir(specs_dir)
            if os.path.isfile(os.path.join(specs_dir, n))
        )
        return jsonify(names)

    @bp.route("/specs/<name>", methods=["GET"])
    def get_spec(name):
        path = os.path.join(config.scribe.specs_dir, name)
        if not os.path.isfile(path):
            return jsonify({"error": "not found"}), 404
        with open(path) as f:
            return jsonify({"name": name, "content": f.read()})

    # ==================================================================
    # Git worktrees
    # ==================================================================

    @bp.route("/worktrees", methods=["GET"])
    def list_worktrees():
        wts = git.list_worktrees()
        return jsonify([
            {"path": w.path, "branch": w.branch, "head": w.head}
            for w in wts
        ])

    # ==================================================================
    # Status
    # ==================================================================

    @bp.route("/status", methods=["GET"])
    def agent_status():
        counts = {}
        for status in (TaskStatus.PENDING, TaskStatus.CURATING,
                       TaskStatus.READY, TaskStatus.IN_PROGRESS,
                       TaskStatus.COMPLETED, TaskStatus.FAILED,
                       TaskStatus.REVIEW):
            counts[status] = len(queue.list(status=status))

        return jsonify({
            "queue": counts,
            "events": len(events.history),
            "conversation_turns": len(converse.history),
            "llm_backend": config.llm.backend,
            "llm_endpoint": config.llm.endpoint,
        })

    # ==================================================================
    # Events log
    # ==================================================================

    @bp.route("/events", methods=["GET"])
    def list_events():
        limit = request.args.get("limit", 50, type=int)
        recent = events.history[-limit:]
        return jsonify([
            {
                "kind": e.kind.value,
                "source": e.source,
                "data": e.data,
                "timestamp": e.timestamp.isoformat(),
            }
            for e in recent
        ])

    return bp


# ------------------------------------------------------------------
# Convenience wrapper
# ------------------------------------------------------------------

def routes(app, config: AssaiConfig | None = None, prefix: str = "/agent"):
    """Register agent routes on an existing Flask app."""
    bp = create_blueprint(config, prefix)
    app.register_blueprint(bp)
    return app


# ------------------------------------------------------------------
# Standalone entrypoint
# ------------------------------------------------------------------

def main(argv=None):
    import argparse

    parser = argparse.ArgumentParser(description="assai agent server")
    parser.add_argument("-c", "--config", default=None,
                        help="path to a YAML config file")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", default=5050, type=int)
    parser.add_argument("--prefix", default="/agent",
                        help="URL prefix for all routes")
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args(argv)

    if args.config:
        load_config(args.config)

    config = AssaiConfig()
    app = Flask(__name__)
    routes(app, config, prefix=args.prefix)

    print(f"Agent server on http://{args.host}:{args.port}{args.prefix}")
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
