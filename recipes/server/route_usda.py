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
from .models import Base, Recipe, Ingredient, Category, UnitConversion, RecipeIngredient, Event, Task, SubTask, IngredientComposition


HERE = os.path.dirname(__file__)

USDA_FOLDER = os.path.join(HERE, "..", "data", "usda")


def usda_routes(app, db):
    """USDA routes are only available during edit mode.
    They are here to auto complete annoying data for us
    """

    # @app.route('/projects/', methods=['GET'])
    # def search_ingredient(name: str):
    pass
