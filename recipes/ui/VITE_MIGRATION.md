# Vite Migration Guide

This project has been successfully migrated from Create React App to Vite! 🚀

## What Changed

### Dependencies
- **Removed**: `react-scripts`
- **Added**: `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`

### Configuration Files
- **Added**: `vite.config.ts` - Main Vite configuration
- **Added**: `vitest.config.ts` - Testing configuration  
- **Added**: `tsconfig.node.json` - Node.js TypeScript config
- **Updated**: `tsconfig.json` - Updated for Vite compatibility
- **Updated**: `package.json` - New scripts and dependencies

### File Structure Changes
- **Moved**: `src/index.tsx` → `src/main.tsx` (Vite convention)
- **Moved**: `public/index.html` → `index.html` (root level)
- **Added**: `src/vite-env.d.ts` - Vite environment types
- **Removed**: `src/react-app-env.d.ts` - CRA specific file

### Scripts
- `npm run dev` - Start development server (was `npm start`)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI

## Getting Started

1. **Install Node.js and npm** (if not already installed):
   ```bash
   # On Ubuntu/Debian:
   sudo apt install nodejs npm
   
   # Or install the latest LTS version from nodejs.org
   ```

2. **Install dependencies**:
   ```bash
   cd recipes/ui
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:3000

## Key Benefits of Vite

- ⚡ **Lightning fast** - Instant server start and HMR
- 🛠️ **Rich features** - TypeScript, JSX, CSS and more out of the box
- 📦 **Optimized builds** - Rollup-based production builds
- 🔧 **Simple config** - Minimal configuration required
- 🧪 **Modern testing** - Vitest for unit testing

## API Proxy

The Vite config includes a proxy to your Flask backend:
- Frontend: http://localhost:3000
- Backend API calls to `/api/*` are proxied to http://localhost:5000

## Path Aliases

You can now use `@/` as an alias for the `src/` directory:
```typescript
import MyComponent from '@/components/MyComponent'
```

## Troubleshooting

If you encounter any issues:

1. **Clear cache**: `rm -rf node_modules package-lock.json && npm install`
2. **Check Node version**: Ensure you're using Node.js 16+ 
3. **Port conflicts**: Change the port in `vite.config.ts` if 3000 is in use

## Next Steps

The migration is complete! Your React app is now powered by Vite and ready for development. 