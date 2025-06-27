#!/usr/bin/env python3
"""
Local Static Build Test Script
Serves the static build locally for testing
"""

import os
import sys
import subprocess
import time
import threading
import signal
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser

class StaticFileHandler(SimpleHTTPRequestHandler):
    """Custom handler to serve static files with proper MIME types"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent.parent / "static_build"), **kwargs)
    
    def end_headers(self):
        # Add CORS headers for local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_GET(self):
        # Handle SPA routing - serve index.html for routes that don't exist
        if not self.path.startswith('/api/') and not self.path.startswith('/assets/'):
            # Check if file exists
            file_path = Path(self.directory) / self.path.lstrip('/')
            if not file_path.exists() and not file_path.is_file():
                # Serve index.html for SPA routes
                self.path = '/index.html'
        
        super().do_GET()

def test_static_build():
    """Test the static build locally"""
    base_dir = Path(__file__).parent.parent
    static_dir = base_dir / "static_build"
    
    if not static_dir.exists():
        print("❌ static_build directory not found!")
        print("   Run 'python scripts/static_generator.py' first")
        return False
    
    print("🚀 Starting local server for static build testing...")
    print(f"📁 Serving files from: {static_dir}")
    
    # Start server
    port = 8000
    server_address = ('', port)
    
    try:
        httpd = HTTPServer(server_address, StaticFileHandler)
        print(f"🌐 Server running at: http://localhost:{port}")
        print(f"🔗 Open in browser: http://localhost:{port}")
        
        # Try to open browser
        try:
            webbrowser.open(f"http://localhost:{port}")
        except:
            pass
        
        print("\n📋 Testing checklist:")
        print("  1. ✅ Check that the homepage loads")
        print("  2. ✅ Check browser console for API errors")
        print("  3. ✅ Test navigation between pages")
        print("  4. ✅ Verify recipes list loads")
        print("  5. ✅ Check individual recipe pages")
        
        print("\n🔍 Direct API test URLs:")
        print(f"  📄 API Index: http://localhost:{port}/api/index.json")
        print(f"  📄 Recipes: http://localhost:{port}/api/recipes.json")
        print(f"  📄 Ingredients: http://localhost:{port}/api/ingredients.json")
        print(f"  📄 Health: http://localhost:{port}/api/health.json")
        
        print("\n⌨️  Press Ctrl+C to stop server")
        
        # Handle Ctrl+C gracefully
        def signal_handler(sig, frame):
            print("\n\n🛑 Stopping server...")
            httpd.shutdown()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        
        # Start server
        httpd.serve_forever()
        
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Port {port} is already in use!")
            print("   Try stopping other servers or use a different port")
        else:
            print(f"❌ Server error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    try:
        success = test_static_build()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Test failed: {e}")
        sys.exit(1) 