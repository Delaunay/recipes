import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
            {/* Placeholder routes for other sidebar items */}
            <Route path="/favorites" element={<div>Favorites - Coming Soon!</div>} />
            <Route path="/my-recipes" element={<div>My Recipes - Coming Soon!</div>} />
            <Route path="/settings" element={<div>Settings - Coming Soon!</div>} />
            <Route path="/planning" element={<div>Planning - Coming Soon!</div>} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/ingredients/:identifier" element={<IngredientDetail />} />
            <Route path="/conversions" element={<UnitConversions />} />
          </Routes>
        </Layout>
      </Router>
    </ChakraProvider>
  );
}

export default App;
