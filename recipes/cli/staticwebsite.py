import logging
import sys
import inspect
import json
import itertools
from pathlib import Path
from dataclasses import dataclass
from typing import get_type_hints, Dict, Any, Optional
from flask import url_for
from urllib.parse import urljoin

from sqlalchemy.sql import Select
from sqlalchemy.orm import Session

from argklass.arguments import add_arguments
from argklass.command import Command, newparser


@dataclass
class Arguments:
    profile: str = None
    file: str = None
    fail_on_error: bool = False
    col: int = 24


def default_output_dir():
    base_dir = Path(__file__).parent.parent.parent
    return base_dir / "static_build"


class StaticWebsite(Command):
    """"""

    name: str = "static"

    @staticmethod
    def arguments(subparsers):
        parser = newparser(subparsers, StaticWebsite)
        add_arguments(parser, Arguments)

    def __init__(self, output_dir=None):
        self.output_dir = output_dir or default_output_dir()
        self.server_process = None
        self.server_url = "http://127.0.0.1:5001"
        self.api_base = f"{self.server_url}"

    @staticmethod
    def execute(args):
        self = StaticWebsite()
        return self.run(args)

    def run(self, args):
        from recipes.server.server import RecipeApp

        # Initialize app
        recipe_app = RecipeApp()
        self.app = recipe_app.app
        self.db = recipe_app.db
        self.client = self.app.test_client()

        # Need app context for url_for and database access
        with self.app.app_context():
            for rule in self.app.url_map.iter_rules():
                if "GET" not in rule.methods:
                    continue

                endpoint = rule.endpoint
                if endpoint == 'static':
                    continue

                view_func = self.app.view_functions.get(endpoint)
                if not view_func:
                    continue

                # Check for @expose decorator params
                if hasattr(view_func, '_static_kwargs') or hasattr(view_func, '_static_args'):
                    static_args = getattr(view_func, '_static_args', ())
                    static_kwargs = getattr(view_func, '_static_kwargs', {})
                    self.save_route_data(rule, static_args, static_kwargs)

        return 0

    def save_route_data(self, rule, static_args, static_kwargs):
        """
        Generate all route combinations and save the data.
        """
        logging.info(f"Processing rule: {rule}")

        combinations = []

        # 1. Process kwargs (Cartesian product)
        if static_kwargs:
            resolved_params = {}
            for param_name, generator in static_kwargs.items():
                if isinstance(generator, Select):
                     # Execute SQLAlchemy Select query
                     # Use scalars() to get a list of values from the single column
                     resolved_params[param_name] = self.db.session.scalars(generator).all()
                elif callable(generator):
                    resolved_params[param_name] = generator()
                else:
                    resolved_params[param_name] = generator

            # Generate Cartesian product
            param_names = resolved_params.keys()
            param_values = resolved_params.values()
            for combination in itertools.product(*param_values):
                combinations.append(dict(zip(param_names, combination)))

        # 2. Process args (Direct rows)
        if static_args:
            for query in static_args:
                if isinstance(query, Select):
                    # Execute SQLAlchemy Select query
                    # Use execute() to get rows map to dicts
                    rows = self.db.session.execute(query).all()
                    for row in rows:
                        # row._mapping converts the row to a dictionary-like object (key-value)
                        # We convert it to a true dict
                        combinations.append(dict(row._mapping))

        # 3. Fetch and save
        for kwargs in combinations:
            try:
                # Build URL for this combination
                relative_url = url_for(rule.endpoint, **kwargs)

                # Fetch data using test_client
                response = self.client.get(relative_url)

                if response.status_code == 200:
                    try:
                        data = response.get_json()
                        self.save_json_file(relative_url, data)
                    except Exception as e:
                        logging.error(f"Failed to parse JSON for {relative_url}: {e}")
                else:
                    logging.warning(f"Failed request to {relative_url}: Status {response.status_code}")

            except Exception as e:
                logging.error(f"Error processing combination {kwargs} for {rule.endpoint}: {e}")

    def save_json_file(self, endpoint: str, data: Any):
        """Save JSON data to a file structure mimicking the API"""
        # Convert endpoint to file path
        if endpoint == "/":
            file_path = self.output_dir / "api" / "index.json"
        else:
            # Remove leading slash and create path
            clean_endpoint = endpoint.lstrip("/")
            file_path = self.output_dir / "api" / f"{clean_endpoint}.json"

        # Ensure directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Save JSON data
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)

        logging.info(f"Saved {file_path} for endpoint {endpoint}")
