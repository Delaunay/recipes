import logging
import sys
import inspect
from pathlib import Path
from dataclasses import dataclass
from typing import get_type_hints, Dict, Any, Optional
from flask import url_for

from argklass.arguments import add_arguments
from argklass.command import Command, newparser

from recipes.server.server import annotation_registry


@dataclass
class Arguments:
    profile: str = None
    file: str = None
    fail_on_error: bool = False
    col: int = 24



def resolve_annotation(handler):
    registry = annotation_registry()

    def maybe_eval(name):
        try:
            return get_type_hints(name, globalns=registry)
        except Exception as err:
            print(err)
            return None

    annotations = {}

    for k, name in handler.__annotations__.items():
        if name in registry:
            annotations[k] = registry[name]

    return annotations


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

    def __init__(self, output_dir):
        self.output_dir = output_dir
        self.server_process = None
        self.server_url = "http://127.0.0.1:5001"
        self.api_base = f"{self.server_url}"

    @staticmethod
    def execute(args):
        self = StaticWebsite()
        return self.run(args)

    def run(self, args):
        from recipes.server.server import RecipeApp, annotation_registry
        from typing import get_type_hints
        app = RecipeApp().app

        for rule in app.url_map.iter_rules():
            if "GET" in rule.methods:
                handler = app.view_functions[rule.endpoint]
                annotations = resolve_annotation(handler)
                self.save_route_data(rule, annotations)
    
        return 0

    def start_server(self):
        pass

    def stop_server(self):
        pass

    def save_route_data(self, rule, annotations):
        # Using annotations generate all the possible routes
        # 
        return

        # From all the possible input fetch the data
        url_rule = rule.rule

        for args in inputs:
            url = url_for(rule.endpoint, **args)

            data = self.fetch_json(url)
            if data:
                self.save_json_file(url, data)
        
        print()

    def fetch_json(self, endpoint: str) -> Optional[Dict[str, Any]]:
        """Fetch JSON data from an API endpoint"""
        url = urljoin(self.api_base, endpoint)
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return None

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

        logger.info(f"Saved {file_path} for endpoint {endpoint} ({len(str(data))} chars)")

        # Log data type and sample for debugging
        if isinstance(data, list):
            logger.info(f"  -> List with {len(data)} items")
        elif isinstance(data, dict):
            logger.info(f"  -> Dict with keys: {list(data.keys())}")
        else:
            logger.info(f"  -> Data type: {type(data)}")

COMMANDS = StaticWebsite
