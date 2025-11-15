import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import {
  ChakraProvider,
  createSystem,
  defaultConfig
} from '@chakra-ui/react';
import Layout, { sidebarSections } from './layout/Layout';
import Home from './components/Home';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import CreateRecipe from './components/CreateRecipe';
import Ingredients from './components/Ingredients';
import IngredientDetail from './components/IngredientDetail';
import UnitConversions from './components/UnitConversions';
import UnitManager from './components/UnitManager';
import Calendar from './components/Calendar';
import Routine from './components/Routine';
import Tasks from './components/Tasks';
import MealPlanning from './components/MealPlanning';
import GroceryReceipts from './components/GroceryReceipts';
import Pantry from './components/Pantry';
import Budget from './components/Budget';
import Settings from './components/Settings';
import RecipeComparison from './components/RecipeComparison';
import ApiTester from './components/ApiTester';
import ArticleViewEditor from './components/ArticleViewEditor';
import SectionView from './components/SectionView';
import ContentView from './components/ContentView';
import './App.css';

// Create the theme system for Chakra UI v3
const system = createSystem(defaultConfig);

function App() {
  return (
    <ChakraProvider value={system}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Section overview pages */}
            {sidebarSections.map((section) => {
              // Use custom ContentView for the Content section
              if (section.href === '/content') {
                return (
                  <Route
                    key={section.href}
                    path={section.href}
                    element={<ContentView />}
                  />
                );
              }
              // Use default SectionView for all other sections
              return (
                <Route
                  key={section.href}
                  path={section.href}
                  element={<SectionView title={section.title} items={section.items} />}
                />
              );
            })}

            {/* Individual pages */}
            <Route path="/recipes" element={<RecipeList />} />
            <Route path="/recipes/:identifier" element={<RecipeDetail />} />
            <Route path="/create" element={<CreateRecipe />} />
            <Route path="/receipts" element={<GroceryReceipts />} />
            <Route path="/pantry" element={<Pantry />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/planning" element={<MealPlanning />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/routine" element={<Routine />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/ingredients/:identifier" element={<IngredientDetail />} />
            <Route path="/conversions" element={<UnitConversions />} />
            <Route path="/unit-manager" element={<UnitManager />} />
            <Route path="/compare" element={<RecipeComparison />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/api-tester" element={<ApiTester />} />
            <Route path="/article" element={<ArticleViewEditor />} />
          </Routes>
        </Layout>
      </Router>
    </ChakraProvider>
  );
}

export default App;
