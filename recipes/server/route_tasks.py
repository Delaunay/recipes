from typing import Dict, Any
from datetime import datetime
from traceback import print_exc

from flask import jsonify, request

from .models import Task


def tasks_routes(app, db):
    # Get all the root task
    @app.route('/tasks', methods=['GET'])
    def get_tasks() -> Dict[str, Any]:
        try:
            # 1. Fetch all the roots
            # 2. Fetch all the nodes
            
            task_ids = (db.session.query(Task._id)
                .filter(Task.parent_id.is_(None))
                # get_task_forest reorder the nodes anyway
                # .order_by(Task.priority.desc(), Task._id)
                .all()
            )

            return jsonify(Task.get_task_forest(db.session, [t[0] for t in task_ids]))
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route('/tasks', methods=['POST'])
    def create_task() -> Dict[str, Any]:
        try:
            data = request.get_json()

            task = Task(
                title=data.get('title'),
                description=data.get('description'),
                datetime_deadline=datetime.fromisoformat(data.get('datetime_deadline').replace('Z', '+00:00')) if data.get('datetime_deadline') else None,
                done=data.get('done', False),
                priority=data.get('priority', 0),
                price_budget=data.get('price_budget'),
                price_real=data.get('price_real'),
                people_count=data.get('people_count'),
                template=data.get('template', False),
                recuring=data.get('recuring', False),
                active=data.get('active', True),
                parent_id=data.get('parent_id', None),
                root_id=data.get('root_id', None),
            )

            print(task.root_id, task.parent_id, task.title)

            # If parent_id is set, calculate root_id from parent before adding to session
            if task.parent_id and task.root_id is None:
                parent = db.session.query(Task).get(task.parent_id)
                if parent:
                    # Parent's root_id if it exists, otherwise parent is the root
                    task.root_id = parent.root_id if parent.root_id else parent._id

            db.session.add(task)
            db.session.commit()

            # If no parent, this is a root task, set root_id to its own id
            if not task.parent_id:
                task.root_id = task._id
                db.session.commit()

            return jsonify(task.to_json()), 201
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route('/tasks/<int:task_id>', methods=['GET'])
    def get_task(task_id: int) -> Dict[str, Any]:
        try:
            tree = Task.get_task_tree(session=db.session, task_id=task_id)
            return jsonify(tree)
        except Exception as e:
            print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route('/tasks/<int:task_id>', methods=['PUT'])
    def update_task(task_id: int) -> Dict[str, Any]:
        try:
            task = db.session.query(Task).get(task_id)
            if not task:
                return jsonify({"error": "Task not found"}), 404

            data = request.get_json()

            task.title = data.get('title', task.title)
            task.description = data.get('description', task.description)
            if data.get('datetime_deadline'):
                task.datetime_deadline = datetime.fromisoformat(data.get('datetime_deadline').replace('Z', '+00:00'))
            task.done = data.get('done', task.done)
            task.priority = data.get('priority', task.priority)
            task.price_budget = data.get('price_budget', task.price_budget)
            task.price_real = data.get('price_real', task.price_real)
            task.people_count = data.get('people_count', task.people_count)
            task.template = data.get('template', task.template)
            task.recuring = data.get('recuring', task.recuring)
            task.active = data.get('active', task.active)

            # Handle parent_id changes
            if 'parent_id' in data:
                old_parent_id = task.parent_id
                task.parent_id = data.get('parent_id')

                # Update root_id if parent changed
                if task.parent_id != old_parent_id:
                    if task.parent_id:
                        parent = db.session.query(Task).get(task.parent_id)
                        if parent:
                            task.root_id = parent.root_id if parent.root_id else parent._id
                    else:
                        # If parent is removed, this becomes a root task
                        task.root_id = task._id

            db.session.commit()
            return jsonify({})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/tasks/<int:task_id>', methods=['DELETE'])
    def delete_task(task_id: int) -> Dict[str, Any]:
        try:
            task = db.session.query(Task).get(task_id)
            if not task:
                return jsonify({"error": "Task not found"}), 404

            db.session.delete(task)
            db.session.commit()

            return jsonify({"message": "Task deleted successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
