import { FC, ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconButton, Box } from '@chakra-ui/react';
import './Layout.css';

// Custom icon components
const HamburgerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

interface LayoutProps {
  children: ReactNode;
}

const sidebarItems = [
  { name: 'Home', href: '/' },
  { name: 'Recipes', href: '/recipes' },
  { name: 'Planning', href: '/planning' },

  // Planning is about selecting recipes for a meal plan
  //   - Budgeting
  //   - Shopping list
  //   - Calories intake
  //   - Nutrients
  { name: 'Calendar', href: '/calendar' },
  { name: 'Tasks', href: '/tasks' },
  { name: 'Ingredients', href: '/ingredients' },
  { name: 'Unit Conversions', href: '/conversions' },
  { name: 'Unit Manager', href: '/unit-manager' },
];

const Layout: FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="layout" style={{height: "100%", width: "100%"}}>
      {/* Mobile Menu Button */}
      <Box
        position="fixed"
        top={4}
        left={4}
        zIndex={1001}
        display={{ base: 'block', md: 'none' }}
      >
        <IconButton
          aria-label="Toggle menu"
          onClick={toggleMobileMenu}
          colorScheme="orange"
          size="lg"
          borderRadius="full"
          boxShadow="lg"
        >
          {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
        </IconButton>
      </Box>

      <div className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }} onClick={closeMobileMenu}>
              RecipeBook
            </Link>
          </h2>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`nav-item ${location.pathname === item.href ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="main-content" style={{height: "100%", width: "100%"}}>
        <div className="content-wrapper" style={{height: "100%", width: "100%"}}>
          {children}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          zIndex={999}
          onClick={closeMobileMenu}
          display={{ base: 'block', md: 'none' }}
        />
      )}
    </div>
  );
};

export default Layout;
