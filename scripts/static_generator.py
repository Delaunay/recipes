#!/usr/bin/env python3
"""
Static Site Generator for Recipe Website
Crawls API endpoints and generates static JSON files + HTML pages
"""

import os
import json
import requests
import time
import subprocess
import signal
import threading
from pathlib import Path
from urllib.parse import urljoin, quote
import shutil
from typing import Dict, List, Any, Optional
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class StaticSiteGenerator:
    def __init__(self):
        self.base_dir = Path(__file__).parent.parent
        self.output_dir = self.base_dir / "static_build"
        self.server_process = None
        self.server_url = "http://localhost:5000"
        self.api_base = f"{self.server_url}"
        
        # Ensure output directory exists
        self.output_dir.mkdir(exist_ok=True)
        
        # API endpoints to crawl
        self.api_endpoints = [
            "/",
            "/health",
            "/recipes",
            "/ingredients", 
            "/categories",
            "/unit/conversions"
        ]
        
        # Data storage
        self.recipes_data = []
        self.ingredients_data = []
        self.categories_data = []
        self.conversions_data = []
        
    def start_server(self):
        """Start the Flask development server"""
        logger.info("Starting Flask server...")
        
        # Change to the correct directory
        server_dir = self.base_dir / "recipes" / "server"
        
        # Start server in background
        cmd = [sys.executable, "-m", "recipes.server.run"]
        self.server_process = subprocess.Popen(
            cmd, 
            cwd=self.base_dir,
            #stdout=subprocess.STDOUT,
            #stderr=subprocess.STDOUT
        )
        
        # Wait for server to start
        max_attempts = 30
        for attempt in range(max_attempts):
            try:
                response = requests.get(f"{self.server_url}/health", timeout=2)
                if response.status_code == 200:
                    logger.info("Server started successfully")
                    return True
            except requests.exceptions.RequestException:
                time.sleep(1)
                continue
                
        logger.error("Failed to start server")
        return False
        
    def stop_server(self):
        """Stop the Flask server"""
        if self.server_process:
            logger.info("Stopping Flask server...")
            self.server_process.terminate()
            self.server_process.wait()
            
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
        
    def crawl_dynamic_endpoints(self):
        """Crawl endpoints that depend on data (like individual recipes)"""
        logger.info("Crawling dynamic endpoints...")
        
        # Crawl individual recipes
        for recipe in self.recipes_data:
            recipe_id = recipe.get('id')
            if recipe_id:
                # Fetch by ID
                endpoint = f"/recipes/{recipe_id}"
                data = self.fetch_json(endpoint)
                if data:
                    self.save_json_file(endpoint, data)
                    
                # Fetch by name (URL-friendly)
                title = recipe.get('title', '')
                if title:
                    url_title = title.lower().replace(' ', '-')
                    endpoint = f"/recipes/{url_title}"
                    data = self.fetch_json(endpoint)
                    if data:
                        self.save_json_file(endpoint, data)
                        
        # Crawl individual ingredients
        for ingredient in self.ingredients_data:
            ingredient_id = ingredient.get('id')
            if ingredient_id:
                # Fetch by ID
                endpoint = f"/ingredients/{ingredient_id}"
                data = self.fetch_json(endpoint)
                if data:
                    self.save_json_file(endpoint, data)
                    
                # Fetch by name
                name = ingredient.get('name', '')
                if name:
                    url_name = name.lower().replace(' ', '-')
                    endpoint = f"/ingredients/{url_name}"
                    data = self.fetch_json(endpoint)
                    if data:
                        self.save_json_file(endpoint, data)
                        
        # Crawl unit conversion endpoints
        for ingredient in self.ingredients_data:
            ingredient_id = ingredient.get('id')
            if ingredient_id:
                # Common units to check
                common_units = ['g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'oz', 'lb']
                
                for from_unit in common_units:
                    # Available units endpoint
                    endpoint = f"/units/available/{ingredient_id}/{from_unit}"
                    data = self.fetch_json(endpoint)
                    if data:
                        self.save_json_file(endpoint, data)
                        
                    # Unit conversion endpoints
                    for to_unit in common_units:
                        if from_unit != to_unit:
                            endpoint = f"/unit/conversions/{ingredient_id}/{from_unit}/{to_unit}"
                            # Add quantity parameter
                            url = f"{self.api_base}{endpoint}"
                            try:
                                response = requests.get(url, timeout=5)
                                if response.status_code == 200:
                                    data = response.json()
                                    self.save_json_file(f"{endpoint}", data)
                            except requests.exceptions.RequestException:
                                pass  # Skip failed conversions
                                
    def crawl_api_endpoints(self):
        """Crawl all API endpoints and save JSON responses"""
        logger.info("Crawling API endpoints...")
        logger.info(f"Endpoints to crawl: {self.api_endpoints}")
        
        # Crawl main endpoints
        for endpoint in self.api_endpoints:
            logger.info(f"Crawling endpoint: {endpoint}")
            data = self.fetch_json(endpoint)
            if data:
                self.save_json_file(endpoint, data)
                
                # Store data for dynamic crawling
                if endpoint == "/recipes":
                    self.recipes_data = data
                    logger.info(f"Stored {len(data) if isinstance(data, list) else 'non-list'} recipes for dynamic crawling")
                elif endpoint == "/ingredients":
                    self.ingredients_data = data
                    logger.info(f"Stored {len(data) if isinstance(data, list) else 'non-list'} ingredients for dynamic crawling")
                elif endpoint == "/categories":
                    self.categories_data = data
                    logger.info(f"Stored {len(data) if isinstance(data, list) else 'non-list'} categories for dynamic crawling")
                elif endpoint == "/unit/conversions":
                    self.conversions_data = data
                    logger.info(f"Stored unit conversions for dynamic crawling")
            else:
                logger.error(f"Failed to fetch data for endpoint: {endpoint}")
                    
        # Crawl dynamic endpoints
        self.crawl_dynamic_endpoints()
        
    def build_frontend(self):
        """Build the React frontend for production"""
        logger.info("Building React frontend...")
        
        ui_dir = self.base_dir / "recipes" / "ui"
        
        # Run npm install to ensure dependencies
        logger.info("Installing npm dependencies...")
        subprocess.run(["npm", "install"], cwd=ui_dir, check=True)
        
        # Build the React app
        logger.info("Building React app...")
        env = os.environ.copy()
        
        # Set base path for GitHub Pages deployment
        # Check if we're building for GitHub Pages (common environment variables)
        if any(key in env for key in ['GITHUB_ACTIONS', 'GITHUB_REPOSITORY']):
            # Extract repository name for GitHub Pages base path
            repo_name = env.get('GITHUB_REPOSITORY', '').split('/')[-1] if 'GITHUB_REPOSITORY' in env else 'recipes'
            env["VITE_BASE_PATH"] = f"/{repo_name}/"
            env["VITE_API_URL"] = f"/{repo_name}/api"  # Set API URL with base path
            logger.info(f"Building for GitHub Pages with base path: /{repo_name}/")
        else:
            env["VITE_BASE_PATH"] = "/"
            env["VITE_API_URL"] = "/api"  # Set API URL for static build
            logger.info("Building for local/custom deployment with base path: /")
        
        result = subprocess.run(
            ["npm", "run", "build"], 
            cwd=ui_dir, 
            env=env,
            capture_output=True,
            text=True
        )

        print(result.stdout)
        
        if result.returncode != 0:
            logger.error(f"Frontend build failed: {result.stderr}")
            raise Exception("Frontend build failed")
            
        logger.info("Frontend build completed")
        
    def copy_frontend_build(self):
        """Copy the built frontend to the output directory"""
        logger.info("Copying frontend build...")
        
        ui_dist = self.base_dir / "recipes" / "ui" / "dist"
        
        if not ui_dist.exists():
            raise Exception("Frontend dist directory not found")
            
        # Copy all files from dist to output
        for item in ui_dist.rglob("*"):
            if item.is_file():
                # Calculate relative path
                rel_path = item.relative_to(ui_dist)
                dest_path = self.output_dir / rel_path
                
                # Ensure destination directory exists
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Copy file
                shutil.copy2(item, dest_path)
                
        logger.info("Frontend files copied")
        
    def create_spa_redirects(self):
        """Create redirect files for SPA routing"""
        logger.info("Creating SPA routing files...")
        
        # Read the main index.html
        index_html_path = self.output_dir / "index.html"
        if not index_html_path.exists():
            logger.error("index.html not found in build output")
            return
            
        with open(index_html_path, 'r') as f:
            index_content = f.read()
            
        # Create 404.html for GitHub Pages SPA routing
        html_404_path = self.output_dir / "404.html"
        with open(html_404_path, 'w') as f:
            f.write(index_content)
        logger.info("Created 404.html for GitHub Pages SPA routing")
            
        # Create index.html files for all routes
        routes = [
            "recipes",
            "create", 
            "favorites",
            "my-recipes",
            "settings",
            "planning",
            "ingredients",
            "conversions"
        ]
        
        for route in routes:
            route_dir = self.output_dir / route
            route_dir.mkdir(exist_ok=True)
            
            route_index = route_dir / "index.html"
            with open(route_index, 'w') as f:
                f.write(index_content)
                
        # Create dynamic route files
        for recipe in self.recipes_data:
            recipe_id = recipe.get('id')
            title = recipe.get('title', '')
            
            if recipe_id:
                # Create by ID
                recipe_dir = self.output_dir / "recipes" / str(recipe_id)
                recipe_dir.mkdir(parents=True, exist_ok=True)
                with open(recipe_dir / "index.html", 'w') as f:
                    f.write(index_content)
                    
            if title:
                # Create by name
                url_title = title.lower().replace(' ', '-')
                recipe_dir = self.output_dir / "recipes" / url_title
                recipe_dir.mkdir(parents=True, exist_ok=True)
                with open(recipe_dir / "index.html", 'w') as f:
                    f.write(index_content)
                    
        # Create ingredient routes
        for ingredient in self.ingredients_data:
            ingredient_id = ingredient.get('id')
            name = ingredient.get('name', '')
            
            if ingredient_id:
                # Create by ID
                ingredient_dir = self.output_dir / "ingredients" / str(ingredient_id)
                ingredient_dir.mkdir(parents=True, exist_ok=True)
                with open(ingredient_dir / "index.html", 'w') as f:
                    f.write(index_content)
                    
            if name:
                # Create by name
                url_name = name.lower().replace(' ', '-')
                ingredient_dir = self.output_dir / "ingredients" / url_name
                ingredient_dir.mkdir(parents=True, exist_ok=True)
                with open(ingredient_dir / "index.html", 'w') as f:
                    f.write(index_content)
                    
    def copy_uploads(self):
        """Copy uploaded files to the static build"""
        logger.info("Copying uploaded files...")
        
        uploads_src = self.base_dir / "uploads"
        uploads_dest = self.output_dir / "uploads"
        
        if uploads_src.exists():
            shutil.copytree(uploads_src, uploads_dest, dirs_exist_ok=True)
            logger.info(f"Copied uploads from {uploads_src} to {uploads_dest}")
        else:
            logger.info("No uploads directory found")
            
        # Also check server uploads
        server_uploads = self.base_dir / "recipes" / "server" / "uploads"
        if server_uploads.exists():
            shutil.copytree(server_uploads, uploads_dest, dirs_exist_ok=True)
            logger.info(f"Copied server uploads from {server_uploads} to {uploads_dest}")
            
    def create_netlify_redirects(self):
        """Create _redirects file for Netlify hosting"""
        redirects_content = """# Redirect API calls to static JSON files
/api/* /api/:splat.json 200

# SPA fallback
/* /index.html 200
"""
        
        redirects_file = self.output_dir / "_redirects"
        with open(redirects_file, 'w') as f:
            f.write(redirects_content)
            
        logger.info("Created _redirects file for Netlify")
        
    def create_github_pages_config(self):
        """Create configuration files for GitHub Pages"""
        logger.info("Creating GitHub Pages configuration...")
        
        # Create .nojekyll file to disable Jekyll processing
        nojekyll_file = self.output_dir / ".nojekyll"
        nojekyll_file.touch()
        logger.info("Created .nojekyll file for GitHub Pages")
        
    def create_vercel_config(self):
        """Create vercel.json for Vercel hosting"""
        vercel_config = {
            "routes": [
                {
                    "src": "/api/(.*)",
                    "dest": "/api/$1.json"
                },
                {
                    "src": "/(.*)",
                    "dest": "/index.html"
                }
            ]
        }
        
        vercel_file = self.output_dir / "vercel.json"
        with open(vercel_file, 'w') as f:
            json.dump(vercel_config, f, indent=2)
            
        logger.info("Created vercel.json for Vercel hosting")
        
    def create_build_info(self):
        """Create build information file"""
        build_info = {
            "build_time": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "total_recipes": len(self.recipes_data),
            "total_ingredients": len(self.ingredients_data),
            "total_categories": len(self.categories_data),
            "build_type": "static"
        }
        
        info_file = self.output_dir / "build-info.json"
        with open(info_file, 'w') as f:
            json.dump(build_info, f, indent=2)
            
        logger.info("Created build info file")
        
    def generate(self):
        """Main generation process"""
        try:
            logger.info("Starting static site generation...")
            
            # Clean output directory
            if self.output_dir.exists():
                shutil.rmtree(self.output_dir)
            self.output_dir.mkdir()
            
            # Start server
            if not self.start_server():
                raise Exception("Failed to start server")
                
            # Crawl API endpoints
            self.crawl_api_endpoints()
            
            # Build frontend
            self.build_frontend()
            
            # Copy frontend build
            self.copy_frontend_build()
            
            # Create SPA routing
            self.create_spa_redirects()
            
            # Copy uploads
            self.copy_uploads()
            
            # Create hosting configs
            self.create_netlify_redirects()
            self.create_vercel_config()
            self.create_github_pages_config()
            
            # Create build info
            self.create_build_info()
            
            logger.info(f"Static site generation completed! Output: {self.output_dir}")
            
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise
        finally:
            # Always stop server
            self.stop_server()
            
def main():
    generator = StaticSiteGenerator()
    generator.generate()
    
if __name__ == "__main__":
    main() 