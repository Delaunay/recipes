# GitHub Pages Deployment - Asset Path Fixes

## Issues Resolved

The following fixes have been applied to resolve asset loading issues on GitHub Pages:

### 1. **Incorrect Base Path Configuration**
**Problem**: Vite was building assets with absolute paths (`/assets/...`) instead of relative to the repository (`/recipes/assets/...`)

**Solution**: 
- Updated `recipes/ui/vite.config.ts` to use `VITE_BASE_PATH` environment variable
- Modified `scripts/static_generator.py` to automatically detect GitHub Pages deployment and set correct base path

### 2. **MIME Type Issues**
**Problem**: JavaScript files were being served with `text/html` MIME type instead of `application/javascript`

**Solution**: 
- Added `.nojekyll` file to disable Jekyll processing in GitHub Pages
- Enhanced Vite build configuration for better asset handling

### 3. **SPA Routing on GitHub Pages**
**Problem**: Client-side routes (React Router) were returning 404 errors

**Solution**: 
- Created `404.html` file that serves the main `index.html` for SPA routing
- This allows React Router to handle routing on the client side

### 4. **API Endpoint Path Issues**
**Problem**: Frontend trying to access API endpoints that don't match static JSON file structure

**Solution**:
- Fixed static mode detection in frontend API service
- Corrected JSON file path construction to use proper base URL
- Added comprehensive debugging to identify path mismatches

## What Was Changed

### 1. Vite Configuration (`recipes/ui/vite.config.ts`)
```typescript
// Added base path configuration
base: process.env.VITE_BASE_PATH || '/',

// Enhanced build options for better asset handling
build: {
  // ... improved asset naming and output configuration
}
```

### 2. Static Generator (`scripts/static_generator.py`)
```python
# Auto-detection of GitHub Pages deployment
if any(key in env for key in ['GITHUB_ACTIONS', 'GITHUB_REPOSITORY']):
    repo_name = env.get('GITHUB_REPOSITORY', '').split('/')[-1]
    env["VITE_BASE_PATH"] = f"/{repo_name}/"
    env["VITE_API_URL"] = f"/{repo_name}/api"
```

### 3. Frontend API Service (`recipes/ui/src/services/api.ts`)
```javascript
// Fixed static mode detection for GitHub Pages
const isStaticMode = () => {
  return import.meta.env.PROD && API_BASE_URL.endsWith('/api');
};

// Fixed JSON path construction
jsonPath = `${API_BASE_URL}${endpoint}.json`;
```

### 4. GitHub Actions Workflow (`.github/workflows/deploy.yml`)
```yaml
# Added environment variables for proper detection
env:
  GITHUB_REPOSITORY: ${{ github.repository }}
  GITHUB_ACTIONS: true

# Added build verification step
- name: Verify build output
  run: python scripts/verify_build.py
```

### 5. GitHub Pages Configuration
- Created `.nojekyll` file to prevent Jekyll interference
- Added `404.html` for SPA routing support
- Enhanced logging and debugging throughout the build process

## New Debugging Tools

### 1. **Build Verification Script** (`scripts/verify_build.py`)
Checks that all expected files are created correctly:
```bash
python scripts/verify_build.py
```

### 2. **Local Testing Script** (`scripts/test_static_locally.py`)
Serves the static build locally for testing:
```bash
python scripts/test_static_locally.py
```

### 3. **Enhanced Logging**
- Static generator now logs detailed information about file creation
- Frontend API service includes debug logging (visible in browser console)
- GitHub Actions workflow includes build verification step

## Testing the Fixes

After pushing these changes, your next deployment should resolve:
- ✅ Asset loading errors (JS, CSS files)
- ✅ MIME type issues
- ✅ Client-side routing (React Router)
- ✅ Missing favicon and logo files
- ✅ API endpoint 404 errors
- ✅ Static JSON file loading

## Expected Results

Your site should now load correctly at:
- **Main URL**: `https://delaunay.github.io/recipes/`
- **API Endpoints**: `https://delaunay.github.io/recipes/api/recipes.json`
- **Assets**: `https://delaunay.github.io/recipes/assets/...`

## Local Testing

To test these changes locally before deployment:

```bash
# Method 1: Run static generator and verify
export GITHUB_ACTIONS=true
export GITHUB_REPOSITORY=delaunay/recipes
python scripts/static_generator.py
python scripts/verify_build.py

# Method 2: Test with local server
python scripts/test_static_locally.py
# Opens http://localhost:8000 in your browser
```

## Debugging API Issues

If you're still getting API 404 errors:

1. **Check Browser Console**: Look for debug logs showing:
   ```
   API Request: { endpoint: '/recipes', isStatic: true, apiBaseUrl: '/recipes/api', isProd: true }
   Static API request: { endpoint: '/recipes', jsonPath: '/recipes/api/recipes.json', cleanPath: '/recipes/api/recipes.json' }
   ```

2. **Verify Build Output**: Run the verification script:
   ```bash
   python scripts/verify_build.py
   ```

3. **Test Direct JSON Access**: Try accessing JSON files directly:
   - `https://delaunay.github.io/recipes/api/recipes.json`
   - `https://delaunay.github.io/recipes/api/ingredients.json`

4. **Check GitHub Actions Logs**: Review the build verification step output

## Troubleshooting

If issues persist after deployment:

1. **Check Build Logs**: Review the GitHub Actions workflow logs
2. **Verify Base Path**: Ensure the repository name is correctly detected
3. **Clear Browser Cache**: Hard refresh or open in incognito mode
4. **Check Asset Paths**: Inspect the built HTML to verify asset URLs include `/recipes/`
5. **Test API Endpoints**: Use browser dev tools to check exact URLs being requested
6. **Run Local Tests**: Use the local testing script to verify everything works

## Next Steps

1. **Commit and Push**: The changes are ready to deploy
2. **Monitor Deployment**: Watch the GitHub Actions workflow and build verification
3. **Test Site**: Visit your GitHub Pages URL after deployment
4. **Verify All Features**: Test navigation, API calls, and asset loading
5. **Check Debug Logs**: Use browser dev tools to verify API calls are working correctly 