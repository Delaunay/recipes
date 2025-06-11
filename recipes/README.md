# 🍳 Recipe Management System

A full-stack recipe management application with **contentEditable** inline editing, built with React (TypeScript) frontend and Flask (Python) backend.

## ✨ Features

### 🎯 Core Functionality
- **Inline Editing**: Click any text to edit directly - no separate forms needed
- **ContentEditable Interface**: Same view for display and editing 
- **Authorization Control**: Edit mode toggle only visible to authorized users
- **Dynamic Management**: Add/remove ingredients and cooking steps on the fly
- **New Recipe Creation**: Start with blank template when no recipe provided
- **Real-time Sync**: All changes saved to backend database

### 🎨 User Experience
- **Seamless Editing**: Click any text (title, description, ingredients, steps) to edit inline
- **Visual Feedback**: Clear hover/focus states show what's editable
- **Smart Controls**: Edit toggle, save/cancel buttons only show when appropriate
- **Keyboard Support**: Shift+Enter for line breaks, Enter to finish editing
- **Mobile Friendly**: Responsive design works on all devices

### 🔧 Technical Features
- **TypeScript**: Fully typed interfaces and API integration
- **Modern React**: Hooks, state management, error handling
- **Chakra UI**: Beautiful, accessible design components
- **Flask REST API**: Complete CRUD operations for recipes, ingredients, categories
- **SQLAlchemy**: Robust database relationships and models
- **CORS Enabled**: Ready for cross-origin requests

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16+) and npm
- **Python** (3.8+) and pip
- **Git**

### 🔧 Backend Setup (Flask API)

1. **Navigate to server directory**:
   ```bash
   cd recipes/server
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server**:
   ```bash
   python run.py
   ```

   The API will be available at `http://localhost:5000`

### 🎨 Frontend Setup (React App)

1. **Navigate to UI directory**:
   ```bash
   cd recipes/ui
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file** (optional):
   ```bash
   echo "REACT_APP_API_URL=http://localhost:5000" > .env.development
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000`

## 📖 Usage Guide

### 🍕 Viewing & Editing Recipes

1. **View Mode**: See recipe in read-only format
2. **Edit Mode**: Toggle edit mode (authorized users only) 
3. **Inline Editing**: Click any text to edit directly:
   - Recipe title, description
   - Prep time, cook time, servings
   - Ingredient quantities, units, names
   - Instruction steps and durations

### ➕ Creating New Recipes

1. Click **"Create New Recipe"**
2. Component starts in edit mode
3. Fill in recipe details using inline editing
4. Add ingredients and steps with **+** buttons
5. Click **Save** to persist to database

### 🎯 Key Interactions

- **Edit Toggle**: Switch between view and edit modes
- **Save/Cancel**: Persist changes or revert to original
- **Add/Remove**: Dynamic ingredient and step management
- **Keyboard**: Shift+Enter for line breaks, Enter to finish editing
- **Visual Feedback**: Hover and focus states guide editing

## 🏗️ Architecture

### Frontend Structure
```
recipes/ui/src/
├── components/
│   └── Recipe.tsx          # Main contentEditable component
├── services/
│   └── api.ts             # TypeScript API service
├── layout/
│   └── Layout.tsx         # App layout wrapper
└── App.tsx               # Main application with routing
```

### Backend Structure  
```
recipes/server/
├── models.py             # SQLAlchemy models (Recipe, Ingredient, etc.)
├── server.py            # Flask app with REST API routes
├── run.py              # Server runner script
└── requirements.txt    # Python dependencies
```

### API Endpoints

#### Recipes
- `GET /recipes` - List all recipes
- `POST /recipes` - Create new recipe
- `GET /recipes/{id}` - Get specific recipe
- `PUT /recipes/{id}` - Update recipe
- `DELETE /recipes/{id}` - Delete recipe

#### Ingredients & Categories
- `GET /ingredients` - List ingredients
- `POST /ingredients` - Create ingredient
- `GET /categories` - List categories
- `POST /categories` - Create category

#### Health & Status
- `GET /health` - API health check
- `GET /` - Welcome message

## 🎯 Component Usage

The Recipe component supports multiple scenarios:

```tsx
// View existing recipe (read-only for unauthorized users)
<Recipe recipe={existingRecipe} isAuthorized={false} />

// Edit existing recipe (authorized users)
<Recipe 
  recipe={existingRecipe} 
  isAuthorized={true}
  onSave={handleSave}
  onDelete={handleDelete}
/>

// Create new recipe
<Recipe 
  isAuthorized={true}
  onSave={handleSave}
/>
```

## 🎨 Design Highlights

### ContentEditable Implementation
- **Same Interface**: Single component for view and edit
- **Visual Cues**: Borders, backgrounds show editable state
- **Smooth Transitions**: Hover and focus animations
- **Placeholder Support**: Helpful hints for empty fields

### Modern UI
- **Card-based Layout**: Clean, professional design
- **Responsive Grid**: Adapts to screen sizes
- **Color-coded Actions**: Green for save, red for delete
- **Loading States**: Spinners and feedback during API calls

## 🛠️ Development

### Environment Variables

**Backend** (`recipes/server/`):
- `FLASK_HOST` - Server host (default: 0.0.0.0)
- `FLASK_PORT` - Server port (default: 5000)  
- `FLASK_ENV` - Environment mode (default: development)

**Frontend** (`recipes/ui/`):
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5000)

### Database
- SQLite database auto-created on first run
- Seeded with sample ingredients and categories
- Relationships: Recipes ↔ Ingredients, Recipes ↔ Categories

### Error Handling
- API request failures displayed to user
- Form validation and data cleaning
- Server-side error responses with helpful messages

## 🎯 Key Features Delivered

✅ **ContentEditable Interface** - Same view for display and editing  
✅ **Authorization Toggle** - Edit mode control for authorized users  
✅ **Inline Text Editing** - Click any text to edit directly  
✅ **Dynamic Ingredients** - Add/remove ingredients with quantities  
✅ **Dynamic Instructions** - Add/remove cooking steps with durations  
✅ **New Recipe Creation** - Blank template for creating from scratch  
✅ **Real Backend Integration** - Full CRUD with Flask API  
✅ **TypeScript Types** - Fully typed API and components  
✅ **Modern Design** - Beautiful, responsive UI with Chakra UI  
✅ **Error Handling** - Robust error states and user feedback  

## 🚀 Production Deployment

### Backend
- Configure production database (PostgreSQL recommended)
- Set environment variables for production
- Deploy to cloud platform (Heroku, AWS, etc.)
- Enable HTTPS and proper CORS settings

### Frontend  
- Build production bundle: `npm run build`
- Deploy to static hosting (Netlify, Vercel, S3)
- Update `REACT_APP_API_URL` to production backend URL

---

**Built with ❤️ using React, TypeScript, Flask, and SQLAlchemy** 