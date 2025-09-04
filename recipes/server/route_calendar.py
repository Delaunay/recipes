from typing import Dict, Any
from datetime import datetime, timedelta
import traceback

from flask import jsonify, request

from .models import Event, Task, SubTask


def calendar_routes(app, db):
    # Events endpoints
    @app.route('/events', methods=['GET'])
    def get_events() -> Dict[str, Any]:
        try:
            start_date = request.args.get('start')
            end_date = request.args.get('end')

            query = db.session.query(Event)

            # If no dates provided, default to current week
            if not start_date and not end_date:
                today = datetime.now()
                # Get Monday of current week
                days_since_monday = today.weekday()
                monday = today - timedelta(days=days_since_monday)
                start_date = monday.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
                # Get Sunday of current week
                sunday = monday + timedelta(days=6)
                end_date = sunday.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()

            if start_date and end_date:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(
                    Event.datetime_start >= start_dt,
                    Event.datetime_end <= end_dt
                )

            events = query.all()
            return jsonify([event.to_json() for event in events])
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/events', methods=['POST'])
    def create_event() -> Dict[str, Any]:
        try:
            data = request.get_json()

            event = Event(
                title=data.get('title'),
                description=data.get('description'),
                datetime_start=datetime.fromisoformat(data.get('datetime_start').replace('Z', '+00:00')),
                datetime_end=datetime.fromisoformat(data.get('datetime_end').replace('Z', '+00:00')),
                location=data.get('location'),
                color=data.get('color', '#3182CE'),
                kind=data.get('kind', 1),
                done=data.get('done', False),
                price_budget=data.get('price_budget'),
                price_real=data.get('price_real'),
                people_count=data.get('people_count'),
                active=data.get('active', True)
            )

            db.session.add(event)
            db.session.commit()

            return jsonify(event.to_json()), 201
        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route('/events/<int:event_id>', methods=['GET'])
    def get_event(event_id: int) -> Dict[str, Any]:
        try:
            event = db.session.query(Event).get(event_id)
            if event:
                return jsonify(event.to_json())
            else:
                return jsonify({"error": "Event not found"}), 404
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/events/<int:event_id>', methods=['PUT'])
    def update_event(event_id: int) -> Dict[str, Any]:
        try:
            event = db.session.query(Event).get(event_id)
            if not event:
                return jsonify({"error": "Event not found"}), 404

            data = request.get_json()

            event.title = data.get('title', event.title)
            event.description = data.get('description', event.description)
            if data.get('datetime_start'):
                event.datetime_start = datetime.fromisoformat(data.get('datetime_start').replace('Z', '+00:00'))
            if data.get('datetime_end'):
                event.datetime_end = datetime.fromisoformat(data.get('datetime_end').replace('Z', '+00:00'))
            event.location = data.get('location', event.location)
            event.color = data.get('color', event.color)
            event.kind = data.get('kind', event.kind)
            event.done = data.get('done', event.done)
            event.price_budget = data.get('price_budget', event.price_budget)
            event.price_real = data.get('price_real', event.price_real)
            event.people_count = data.get('people_count', event.people_count)
            event.active = data.get('active', event.active)

            db.session.commit()

            return jsonify(event.to_json())
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/events/<int:event_id>', methods=['DELETE'])
    def delete_event(event_id: int) -> Dict[str, Any]:
        try:
            event = db.session.query(Event).get(event_id)
            if not event:
                return jsonify({"error": "Event not found"}), 404

            db.session.delete(event)
            db.session.commit()

            return jsonify({"message": "Event deleted successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
