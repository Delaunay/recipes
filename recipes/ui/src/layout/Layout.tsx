import React from 'react';
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
  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">RecipeBook</h2>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <a key={item.name} href={item.href} className="nav-item">
              {item.name}
            </a>
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
