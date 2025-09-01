import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import {
  ChakraProvider,
  createSystem,
  defaultConfig
} from '@chakra-ui/react';
import Layout from './layout/Layout';
import Home from './components/Home';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import CreateRecipe from './components/CreateRecipe';
import Ingredients from './components/Ingredients';
import IngredientDetail from './components/IngredientDetail';
import UnitConversions from './components/UnitConversions';
import UnitManager from './components/UnitManager';
import Calendar from './components/Calendar';
import Tasks from './components/Tasks';
import MealPlanning from './components/MealPlanning';
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
            <Route path="/recipes" element={<RecipeList />} />
            <Route path="/recipes/:identifier" element={<RecipeDetail />} />
            <Route path="/create" element={<CreateRecipe />} />
            <Route path="/planning" element={<MealPlanning />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/ingredients/:identifier" element={<IngredientDetail />} />
            <Route path="/conversions" element={<UnitConversions />} />
            <Route path="/unit-manager" element={<UnitManager />} />
          </Routes>
        </Layout>
      </Router>
    </ChakraProvider>
  );
}

export default App;
