import { FC, ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ColorModeButton } from "@/components/ui/color-mode"
import { IconButton, Box } from '@chakra-ui/react';
import { recipeAPI } from '../services/api';
import { Article } from '../services/type';
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

const ChevronIcon = ({ isExpanded }: { isExpanded: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{
      transition: 'transform 0.3s ease',
      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
      display: 'inline-block',
      marginRight: '0.5rem'
    }}
  >
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);

interface LayoutProps {
  children: ReactNode;
}

const getStaticSidebarSections = (contentItems: { name: string; href: string }[] = []) => [
  {
    title: 'Cooking',
    href: '/cooking',
    items: [
      { name: 'Recipes', href: '/recipes' },
      { name: 'Meal Plan', href: '/planning' },
      { name: 'Ingredients', href: '/ingredients' },
      { name: 'Compare Recipes', href: '/compare' },
    ]
  },
  {
    title: 'Inventory & Shopping',
    href: '/inventory-shopping',
    items: [
      { name: 'Receipts', href: '/receipts' },
      { name: 'Pantry', href: '/pantry' },
      { name: 'Budget', href: '/budget' },
    ]
  },
  {
    title: 'Planning',
    href: '/planning-section',
    items: [
      { name: 'Calendar', href: '/calendar' },
      { name: 'Routine', href: '/routine' },
      { name: 'Tasks', href: '/tasks' },
      { name: 'Projects', href: '/projects' },
    ]
  },
  {
    title: 'Home Management',
    href: '/home-management',
    items: [
      // Add your home management features here
      { name: 'Taxes', href: '/tax' },
      { name: 'Retirement', href: '/retirement' }
    ]
  },
  {
    title: 'Investing',
    href: '/investing',
    items: [
      // Add your home management features here
    ]
  },
  {
    title: 'Health',
    href: '/health',
    items: [
      // Add your home management features here
    ]
  },
  {
    title: 'Content',
    href: '/content',
    items: contentItems
  },
  {
    title: 'Units',
    href: '/units',
    items: [
      { name: 'Unit Conversions', href: '/conversions' },
      { name: 'Unit Manager', href: '/unit-manager' },
    ]
  },
  {
    title: 'Settings',
    href: '/settings-section',
    items: [
      { name: 'Settings', href: '/settings' },
      { name: 'API Tester', href: '/api-tester' },
      { name: 'Code Visualization', href: '/code-viz' },
    ]
  },
];

// Export static version for use in App.tsx
export const sidebarSections = getStaticSidebarSections([]);

const Layout: FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [contentArticles, setContentArticles] = useState<Article[]>([]);

  // Fetch last accessed articles for Content section
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const articles = await recipeAPI.getLastAccessedArticles();

        // Add TestArticle to the beginning
        const testArticle: Article = {
          id: 'test' as any,
          title: 'TestArticle',
          namespace: 'Mock',
          tags: ['test', 'demo'],
          extension: {},
          blocks: []
        };

        setContentArticles([testArticle, ...articles]);
      } catch (error) {
        console.error('Failed to fetch articles for sidebar:', error);
        // Set only TestArticle if fetch fails
        setContentArticles([{
          id: 'test' as any,
          title: 'TestArticle',
          namespace: 'Mock',
          tags: ['test', 'demo'],
          extension: {},
          blocks: []
        }]);
      }
    };

    fetchArticles();
  }, []);

  // Build dynamic sidebar sections with content articles
  const dynamicSidebarSections = getStaticSidebarSections(
    contentArticles.map(article => ({
      name: article.title || 'Untitled',
      href: `/article?id=${article.id}`
    }))
  );

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Check if a section contains the active route or if we're on the section page itself
  const isSectionActive = (section: typeof sidebarSections[0]) => {
    // Check if we're on the section's main page
    if (location.pathname === section.href) {
      return true;
    }

    // Check if we're on one of the section's items (need to handle query params)
    return section.items.some(item => {
      const itemPath = item.href.split('?')[0];
      const currentPath = location.pathname;
      const currentFullPath = location.pathname + location.search;

      // Exact match with query params
      if (currentFullPath === item.href) {
        return true;
      }

      // Path match without query params
      return currentPath === itemPath;
    });
  };

  // Determine if a section should be expanded
  const isSectionExpanded = (section: typeof sidebarSections[0]) => {
    return hoveredSection === section.title || isSectionActive(section);
  };

  return (
    <div className="layout" style={{ height: "100%", width: "100%" }}>
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
            <ColorModeButton />
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }} onClick={closeMobileMenu}>
              (O)KaaSan
              
              {/* <br></br>
              (お)母さん */}
            </Link>
          </h2>
        </div>
        <nav className="sidebar-nav">
          {dynamicSidebarSections.map((section) => (
            <div
              key={section.title}
              className={`nav-section ${isSectionExpanded(section) ? 'expanded' : 'collapsed'}`}
              onMouseEnter={() => setHoveredSection(section.title)}
              onMouseLeave={() => setHoveredSection(null)}
            >
              <Link
                to={section.href}
                className={`nav-section-title ${location.pathname === section.href ? 'active-section' : ''}`}
                onClick={closeMobileMenu}
              >
                <ChevronIcon isExpanded={isSectionExpanded(section)} />
                {section.title}
              </Link>
              <div className="nav-section-items">
                {section.items.map((item) => {
                  const itemPath = item.href.split('?')[0];
                  const currentFullPath = location.pathname + location.search;
                  const isActive = currentFullPath === item.href || location.pathname === itemPath;

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={closeMobileMenu}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="main-content" style={{ height: "100%", width: "100%" }}>
        <div className="content-wrapper" style={{ height: "100%", width: "100%" }}>
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
