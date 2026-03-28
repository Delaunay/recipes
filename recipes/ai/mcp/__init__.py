"""
MCP (Model Context Protocol) Server for Lifestyle Planning App

This module exposes all existing Flask routes as MCP tools.
It's a thin wrapper around the existing API - no logic duplication!
"""

from typing import Any, Dict, List, Optional
import json
import traceback

from flask import Flask, jsonify, request
from werkzeug.test import Client


def routes(app: Flask, db):
    """
    Main entry point for MCP routes.
    Exposes all existing Flask routes as MCP tools.
    """

    # ============================================================================
    # TOOL DEFINITIONS - Maps existing routes to MCP tools
    # ============================================================================

    TOOLS = {
        # RECIPES
        "search_recipes": {
            "description": "Search for recipes by name or ingredient",
            "method": "GET",
            "path": "/ingredient/search/{query}",
            "params": {"query": {"type": "string", "description": "Search query", "required": True}}
        },
        "list_recipes": {
            "description": "List all recipes",
            "method": "GET",
            "path": "/recipes",
            "params": {}
        },
        "list_recipes_range": {
            "description": "List recipes with pagination",
            "method": "GET",
            "path": "/recipes/{start}/{end}",
            "params": {
                "start": {"type": "integer", "description": "Start index", "required": True},
                "end": {"type": "integer", "description": "End index", "required": True}
            }
        },
        "get_recipe": {
            "description": "Get detailed information about a specific recipe",
            "method": "GET",
            "path": "/recipes/{recipe_id}",
            "params": {"recipe_id": {"type": "integer", "description": "Recipe ID", "required": True}}
        },
        "get_recipe_by_name": {
            "description": "Get recipe by name (URL-friendly)",
            "method": "GET",
            "path": "/recipes/{recipe_name}",
            "params": {"recipe_name": {"type": "string", "description": "Recipe name", "required": True}}
        },
        "create_recipe": {
            "description": "Create a new recipe with ingredients and instructions",
            "method": "POST",
            "path": "/recipes",
            "params": {
                "title": {"type": "string", "required": True},
                "description": {"type": "string"},
                "instructions": {"type": "array"},
                "prep_time": {"type": "integer"},
                "cook_time": {"type": "integer"},
                "servings": {"type": "integer"},
                "ingredients": {"type": "array"},
                "categories": {"type": "array"}
            }
        },
        "update_recipe": {
            "description": "Update an existing recipe",
            "method": "PUT",
            "path": "/recipes/{recipe_id}",
            "params": {
                "recipe_id": {"type": "integer", "required": True},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "instructions": {"type": "array"}
            }
        },
        "delete_recipe": {
            "description": "Delete a recipe",
            "method": "DELETE",
            "path": "/recipes/{recipe_id}",
            "params": {"recipe_id": {"type": "integer", "required": True}}
        },
        "get_recipe_nutrition": {
            "description": "Get nutritional information for a recipe",
            "method": "GET",
            "path": "/recipes/nutrition/{recipe_id}",
            "params": {"recipe_id": {"type": "integer", "required": True}}
        },

        # INGREDIENTS
        "list_ingredients": {
            "description": "List all ingredients",
            "method": "GET",
            "path": "/ingredients",
            "params": {}
        },
        "list_ingredients_range": {
            "description": "List ingredients with pagination",
            "method": "GET",
            "path": "/ingredients/{start}/{end}",
            "params": {
                "start": {"type": "integer", "required": True},
                "end": {"type": "integer", "required": True}
            }
        },
        "get_ingredient": {
            "description": "Get detailed information about an ingredient",
            "method": "GET",
            "path": "/ingredients/{ingredient_id}",
            "params": {"ingredient_id": {"type": "integer", "required": True}}
        },
        "create_ingredient": {
            "description": "Create a new ingredient",
            "method": "POST",
            "path": "/ingredients",
            "params": {
                "name": {"type": "string", "required": True},
                "description": {"type": "string"},
                "fdc_id": {"type": "integer"},
                "calories": {"type": "number"}
            }
        },
        "update_ingredient": {
            "description": "Update an ingredient",
            "method": "PUT",
            "path": "/ingredients/{ingredient_id}",
            "params": {"ingredient_id": {"type": "integer", "required": True}}
        },
        "delete_ingredient": {
            "description": "Delete an ingredient",
            "method": "DELETE",
            "path": "/ingredients/{ingredient_id}",
            "params": {"ingredient_id": {"type": "integer", "required": True}}
        },
        "get_ingredient_compositions": {
            "description": "Get nutritional composition of an ingredient",
            "method": "GET",
            "path": "/ingredients/{ingredient_id}/compositions",
            "params": {"ingredient_id": {"type": "integer", "required": True}}
        },

        # ARTICLES
        "list_articles": {
            "description": "List all articles (blog posts, notes, journal entries)",
            "method": "GET",
            "path": "/articles",
            "params": {}
        },
        "get_article": {
            "description": "Get article with all content blocks",
            "method": "GET",
            "path": "/articles/{article_id}",
            "params": {"article_id": {"type": "integer", "required": True}}
        },
        "create_article": {
            "description": "Create a new article",
            "method": "POST",
            "path": "/articles",
            "params": {
                "title": {"type": "string", "required": True},
                "namespace": {"type": "string"},
                "tags": {"type": "array"}
            }
        },
        "update_article": {
            "description": "Update article metadata",
            "method": "PUT",
            "path": "/articles/{article_id}",
            "params": {"article_id": {"type": "integer", "required": True}}
        },
        "delete_article": {
            "description": "Delete an article",
            "method": "DELETE",
            "path": "/articles/{article_id}",
            "params": {"article_id": {"type": "integer", "required": True}}
        },
        "add_article_block": {
            "description": "Add a content block to an article",
            "method": "POST",
            "path": "/articles/{article_id}/blocks",
            "params": {
                "article_id": {"type": "integer", "required": True},
                "kind": {"type": "string", "required": True},
                "data": {"type": "object", "required": True}
            }
        },
        "update_blocks_batch": {
            "description": "Batch update multiple article blocks",
            "method": "PUT",
            "path": "/blocks/batch",
            "params": {"blocks": {"type": "array", "required": True}}
        },

        # TASKS
        "list_tasks": {
            "description": "List all root tasks",
            "method": "GET",
            "path": "/tasks",
            "params": {}
        },
        "get_task": {
            "description": "Get task with all subtasks",
            "method": "GET",
            "path": "/tasks/{task_id}",
            "params": {"task_id": {"type": "integer", "required": True}}
        },
        "create_task": {
            "description": "Create a new task",
            "method": "POST",
            "path": "/tasks",
            "params": {
                "title": {"type": "string", "required": True},
                "description": {"type": "string"},
                "priority": {"type": "integer"},
                "done": {"type": "boolean"}
            }
        },
        "update_task": {
            "description": "Update a task",
            "method": "PUT",
            "path": "/tasks/{task_id}",
            "params": {"task_id": {"type": "integer", "required": True}}
        },
        "delete_task": {
            "description": "Delete a task",
            "method": "DELETE",
            "path": "/tasks/{task_id}",
            "params": {"task_id": {"type": "integer", "required": True}}
        },

        # EVENTS
        "list_events": {
            "description": "List calendar events",
            "method": "GET",
            "path": "/events",
            "params": {
                "start": {"type": "string", "description": "Start date"},
                "end": {"type": "string", "description": "End date"}
            }
        },
        "get_event": {
            "description": "Get event details",
            "method": "GET",
            "path": "/events/{event_id}",
            "params": {"event_id": {"type": "integer", "required": True}}
        },
        "create_event": {
            "description": "Create a calendar event",
            "method": "POST",
            "path": "/events",
            "params": {
                "title": {"type": "string", "required": True},
                "datetime_start": {"type": "string", "required": True},
                "datetime_end": {"type": "string", "required": True}
            }
        },
        "update_event": {
            "description": "Update an event",
            "method": "PUT",
            "path": "/events/{event_id}",
            "params": {"event_id": {"type": "integer", "required": True}}
        },
        "delete_event": {
            "description": "Delete an event",
            "method": "DELETE",
            "path": "/events/{event_id}",
            "params": {"event_id": {"type": "integer", "required": True}}
        },

        # KEY-VALUE STORE
        "list_kv_topics": {
            "description": "List all topics in key-value store",
            "method": "GET",
            "path": "/kv",
            "params": {}
        },
        "list_kv_keys": {
            "description": "List keys in a topic",
            "method": "GET",
            "path": "/kv/{topic}",
            "params": {"topic": {"type": "string", "required": True}}
        },
        "get_kv_value": {
            "description": "Get a value from key-value store",
            "method": "GET",
            "path": "/kv/{topic}/{key}",
            "params": {
                "topic": {"type": "string", "required": True},
                "key": {"type": "string", "required": True}
            }
        },
        "set_kv_value": {
            "description": "Set a value in key-value store",
            "method": "POST",
            "path": "/kv/{topic}/{key}",
            "params": {
                "topic": {"type": "string", "required": True},
                "key": {"type": "string", "required": True},
                "value": {"required": True}
            }
        },

        # UNITS
        "list_units": {
            "description": "List all available units",
            "method": "GET",
            "path": "/units/available",
            "params": {}
        },
        "list_volume_units": {
            "description": "List volume units",
            "method": "GET",
            "path": "/units/available/volume",
            "params": {}
        },
        "list_mass_units": {
            "description": "List mass units",
            "method": "GET",
            "path": "/units/available/mass",
            "params": {}
        },

        # CATEGORIES
        "list_categories": {
            "description": "List all recipe categories",
            "method": "GET",
            "path": "/categories",
            "params": {}
        },
        "create_category": {
            "description": "Create a new category",
            "method": "POST",
            "path": "/categories",
            "params": {"name": {"type": "string", "required": True}}
        },

        # USDA
        "search_usda_foods": {
            "description": "Search USDA food database",
            "method": "GET",
            "path": "/api/usda/search",
            "params": {"q": {"type": "string", "required": True}}
        },
        "get_usda_food": {
            "description": "Get USDA food details",
            "method": "GET",
            "path": "/api/usda/food/{fdc_id}",
            "params": {"fdc_id": {"type": "string", "required": True}}
        },
    }

    # ============================================================================
    # HELPER FUNCTIONS
    # ============================================================================

    def call_route(method: str, path: str, path_params: Dict = None, query_params: Dict = None, body: Dict = None):
        """Call an existing Flask route"""
        with app.test_client() as client:
            # Replace path parameters
            if path_params:
                for key, value in path_params.items():
                    path = path.replace(f"{{{key}}}", str(value))

            # Prepare request
            kwargs = {}
            if query_params:
                kwargs['query_string'] = query_params
            if body:
                kwargs['json'] = body
                kwargs['content_type'] = 'application/json'

            # Make request
            if method == "GET":
                response = client.get(path, **kwargs)
            elif method == "POST":
                response = client.post(path, **kwargs)
            elif method == "PUT":
                response = client.put(path, **kwargs)
            elif method == "DELETE":
                response = client.delete(path, **kwargs)
            elif method == "PATCH":
                response = client.patch(path, **kwargs)
            else:
                return {"error": f"Unsupported method: {method}"}

            # Parse response
            try:
                return response.get_json()
            except:
                return {"error": "Failed to parse response", "status": response.status_code}

    def build_schema(params: Dict) -> Dict:
        """Build JSON schema from parameter definitions"""
        properties = {}
        required = []

        for name, spec in params.items():
            prop = {"type": spec.get("type", "string")}
            if "description" in spec:
                prop["description"] = spec["description"]
            properties[name] = prop

            if spec.get("required"):
                required.append(name)

        schema = {
            "type": "object",
            "properties": properties
        }
        if required:
            schema["required"] = required

        return schema

    # ============================================================================
    # MCP ENDPOINTS
    # ============================================================================

    @app.route('/mcp', methods=['GET'])
    @app.route('/mcp/info', methods=['GET'])
    def mcp_info():
        """Get MCP server information"""
        return jsonify({
            "name": "Lifestyle Planning MCP Server",
            "version": "1.0.0",
            "description": "MCP server exposing existing Flask routes as tools",
            "capabilities": {
                "tools": len(TOOLS)
            }
        })

    @app.route('/mcp/tools', methods=['GET'])
    def list_mcp_tools():
        """List all available MCP tools"""
        tools = []
        for name, spec in TOOLS.items():
            tools.append({
                "name": name,
                "description": spec["description"],
                "inputSchema": build_schema(spec["params"])
            })
        return jsonify({"tools": tools})

    @app.route('/mcp/tools/<tool_name>', methods=['POST'])
    def call_mcp_tool(tool_name: str):
        """Call a specific MCP tool"""
        if tool_name not in TOOLS:
            return jsonify({"error": f"Tool '{tool_name}' not found"}), 404

        tool_spec = TOOLS[tool_name]
        data = request.get_json() or {}

        try:
            # Separate path params from body/query params
            path_params = {}
            query_params = {}
            body_params = {}

            for key, value in data.items():
                # Check if this is a path parameter
                if f"{{{key}}}" in tool_spec["path"]:
                    path_params[key] = value
                # For GET requests, use query params
                elif tool_spec["method"] == "GET":
                    query_params[key] = value
                # For other methods, use body
                else:
                    body_params[key] = value

            # Call the actual route
            result = call_route(
                method=tool_spec["method"],
                path=tool_spec["path"],
                path_params=path_params,
                query_params=query_params if query_params else None,
                body=body_params if body_params else None
            )

            return jsonify(result)

        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    return app
