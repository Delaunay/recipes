from __future__ import annotations

from typing import Dict, Any
import os
import sys
import uuid
from pathlib import Path
from datetime import datetime, timedelta
import traceback

from PIL import Image
from flask import Flask, jsonify, request, send_from_directory
from sqlalchemy.orm import sessionmaker, scoped_session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.utils import secure_filename

from ..tools.images import centercrop_resize_image
from .models import Base, Recipe, Ingredient, Category, UnitConversion, RecipeIngredient, Event, Task, SubTask


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def images_routes(app):
    def allowed_file(filename):
        """Check if the file extension is allowed"""
        return '.' in filename and \
                filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    def save_original_image(file, filename):
        # Save the original image without modification
        if os.path.exists(app.config["ORIGINALS_FOLDER"]):
            original_path = os.path.join(app.config["ORIGINALS_FOLDER"], filename)
            folder_path = os.path.dirname(original_path)
            os.makedirs(folder_path, exist_ok=True)

            if os.path.exists(original_path):
                os.rename(original_path, original_path + '.old')

            file.save(original_path)
        # ---

    def save_production_image(file, namespace, extension):
        try:
            image = Image.open(file.stream)

            path = centercrop_resize_image(
                app.config['UPLOAD_FOLDER'],
                image,
                namespace,
                extension
            )

            return path

        except Exception as err:
            print(err)

    @app.route('/upload', methods=['POST'])
    def upload_file() -> Dict[str, Any]:
        """Upload a single image file"""
        # Github file limit
        #    * Soft limit
        #       * With Git:  50 MiB
        #       * With the Browser: 25 MiB
        #    * Hard limit: 100 MiB
        #       * With the Browser: 100 MiB
        try:
            if 'file' not in request.files:
                return jsonify({"error": "No file provided"}), 400

            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "No file selected"}), 400

            if not allowed_file(file.filename):
                return jsonify({"error": "File type not allowed. Please use: png, jpg, jpeg, gif, webp"}), 400

            # Get namespace from form data
            namespace = request.form.get('namespace')

            # Get file extension
            file_extension = file.filename.rsplit('.', 1)[1].lower()

            if namespace:
                # Use namespace directly as filename with extension
                filename = f"{namespace}.{file_extension}"

                save_original_image(file, filename)

                filename = save_production_image(file, namespace, file_extension)

                # Return the file URL
                file_url = f"/uploads/{filename}"

                return jsonify({
                    "url": file_url,
                    "filename": filename,
                    "folder": ""
                }), 201
            
            return jsonify({"error": "missing namespace"}), 500
        except Exception as e:
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route('/uploads/<path:filepath>')
    def uploaded_file(filepath):
        """Serve uploaded files from recipe-specific folders or direct files"""
        # Split the filepath to get folder and filename
        if '/' in filepath:
            folder, filename = filepath.split('/', 1)
            folder_path = os.path.join(app.config['UPLOAD_FOLDER'], folder)
            return send_from_directory(folder_path, filename)
        else:
            # Files saved directly in upload folder (when namespace is used)
            return send_from_directory(app.config['UPLOAD_FOLDER'], filepath)
