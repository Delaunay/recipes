#!/usr/bin/env python3
"""
Recipe API Server Runner

Simple script to run the Flask development server with the Recipe API.
"""

import os
import sys

from .server import RecipeApp, STATIC_FOLDER


def main():
    """Run the Recipe API server"""
    
    # Configuration from environment variables
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', '5001'))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    print("")
    print("🍳 Starting Recipe API Server...")
    print(f"📍 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🐛 Debug: {debug}")
    print(f"🌐 Access at: http://localhost:{port}")
    print(f"STATIC_FOLDER {STATIC_FOLDER}")
    print("=" * 50)
    
    try:
        app = RecipeApp()
        app.run(host=host, port=port, debug=debug)
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)


def entry():
    app = RecipeApp()
    return app.app


if __name__ == '__main__':
    main() 