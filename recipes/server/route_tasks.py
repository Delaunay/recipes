from typing import Dict, Any
from datetime import datetime

from flask import jsonify, request

from .models import Task, SubTask


def tasks_routes(app, db):
    # Tasks endpoints
    @app.route('/tasks', methods=['GET'])
    def get_tasks() -> Dict[str, Any]:
        try:
            tasks = db.session.query(Task).order_by(Task.priority.desc(), Task._id).all()
            return jsonify([task.to_json() for task in tasks])
        except Exception as e:
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
                price_budget=data.get('price_budget'),
                price_real=data.get('price_real'),
                people_count=data.get('people_count'),
                template=data.get('template', False),
                recuring=data.get('recuring', False),
                active=data.get('active', True)
            )

            db.session.add(task)
            db.session.commit()

            return jsonify(task.to_json()), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/tasks/<int:task_id>', methods=['GET'])
    def get_task(task_id: int) -> Dict[str, Any]:
        try:
            task = db.session.query(Task).get(task_id)
            if task:
                return jsonify(task.to_json())
            else:
                return jsonify({"error": "Task not found"}), 404
        except Exception as e:
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

    # Subtasks endpoints
    @app.route('/subtasks', methods=['GET'])
    def get_subtasks() -> Dict[str, Any]:
        try:
            subtasks = db.session.query(SubTask).all()
            return jsonify([subtask.to_json() for subtask in subtasks])
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/subtasks', methods=['POST'])
    def create_subtask() -> Dict[str, Any]:
        try:
            data = request.get_json()

            subtask = SubTask(
                parent_id=data.get('parent_id'),
                child_id=data.get('child_id')
            )

            db.session.add(subtask)
            db.session.commit()

            return jsonify(subtask.to_json()), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500
