import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { name: 'Home', href: '/' },
  { name: 'All Recipes', href: '/recipes' },
  { name: 'My Favorites', href: '/favorites' },
  { name: 'My Recipes', href: '/my-recipes' },
  { name: 'Settings', href: '/settings' },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
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
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="main-content">
        <div className="content-wrapper">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
