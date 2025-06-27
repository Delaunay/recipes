# GitHub Pages Deployment Setup

This document explains how to configure your GitHub repository to work with the automated GitHub Pages deployment workflow.

## Prerequisites

Before the deployment workflow can work, you need to configure GitHub Pages in your repository settings.

## Configuration Steps

### 1. Enable GitHub Pages

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions**

### 2. Branch Protection (Optional but Recommended)

For production deployments, consider setting up branch protection:

1. Go to **Settings** → **Branches**
2. Add a branch protection rule for your main branch (`main` or `master`)
3. Enable "Require status checks to pass before merging"
4. Select the build job from the deployment workflow

## How the Workflow Works

The deployment workflow (`.github/workflows/deploy.yml`) performs the following steps:

### Build Phase
1. **Environment Setup**: Sets up Python 3.9 and Node.js 18
2. **Dependency Installation**: 
   - Installs Python dependencies (Flask, requests, etc.)
   - Installs Node.js dependencies for the React frontend
3. **Static Site Generation**: Runs `scripts/static_generator.py` which:
   - Starts a local Flask server
   - Crawls all API endpoints and saves JSON responses
   - Builds the React frontend using Vite
   - Creates static HTML files for SPA routing
   - Copies uploaded files and creates hosting configurations

### Deploy Phase
1. **Pages Configuration**: Sets up GitHub Pages environment
2. **Artifact Upload**: Uploads the `static_build` directory
3. **Deployment**: Deploys to GitHub Pages

## Triggering Deployments

The workflow triggers on:
- **Push to main/master**: Automatic deployment
- **Pull Requests**: Build-only (no deployment)
- **Manual Trigger**: Via GitHub Actions tab → "Run workflow"

## Accessing Your Site

Once deployed, your static website will be available at:
```
https://<username>.github.io/<repository-name>/
```

Or if you have a custom domain configured:
```
https://your-custom-domain.com/
```

## Troubleshooting

### Common Issues

1. **Build Fails - Python Dependencies**
   - Check that all required dependencies are listed in `requirements.txt` or `recipes/requirements.txt`
   - Verify that the `static_generator.py` script can run locally

2. **Build Fails - Node.js Dependencies**
   - Ensure `recipes/ui/package.json` has all required dependencies
   - Check that the Vite build command works locally: `cd recipes/ui && npm run build`

3. **Deployment Fails - Permissions**
   - Verify that GitHub Pages is configured to use "GitHub Actions" as source
   - Check repository permissions allow GitHub Actions to deploy

4. **Site Not Loading**
   - Check the browser console for errors
   - Verify that API calls are pointing to the correct static JSON files
   - Ensure SPA routing is working with the generated `index.html` files

### Debugging Steps

1. **Check Workflow Logs**: Go to Actions tab and review the build/deploy logs
2. **Test Locally**: Run `python scripts/static_generator.py` locally to test
3. **Verify Output**: Check that `static_build/` directory contains expected files
4. **API Endpoints**: Verify that API JSON files are generated in `static_build/api/`

## Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to your repository root with your domain
2. Configure DNS settings with your domain provider
3. Go to **Settings** → **Pages** and add your custom domain

## Environment Variables

The workflow sets the following environment variables:
- `PYTHONPATH`: Set to workspace root for proper module imports
- `VITE_API_URL`: Set to `/api` for static API endpoint routing

If your application requires additional environment variables, add them to the workflow under the "Build static website" step. 