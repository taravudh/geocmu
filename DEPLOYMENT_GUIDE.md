# Map Field Collector - Deployment Guide

## Quick Deployment to Render (Using Built Files)

### Step 1: Prepare Files for GitHub

1. **Create a new GitHub repository:**
   - Go to https://github.com/new
   - Repository name: `map-field-collector`
   - Description: `Professional field data collection application with GPS tracking and measurement tools`
   - Set to Public (for free Render deployment)
   - Initialize with README

2. **Upload the built files:**
   - Download/copy these files from the `dist` folder:
     - `index.html`
     - `assets/` folder (contains all CSS and JS files)
   - Upload them to your GitHub repository

### Step 2: Deploy to Render

1. **Sign up/Login to Render:**
   - Go to https://render.com
   - Sign up with your GitHub account

2. **Create a new Static Site:**
   - Click "New +" → "Static Site"
   - Connect your GitHub repository
   - Configure the deployment:

```yaml
# Render Configuration
Name: map-field-collector
Branch: main
Build Command: # Leave empty (files are pre-built)
Publish Directory: . 
# OR if you upload to a subfolder: dist
```

3. **Environment Variables (if needed):**
   - No environment variables required for this static site

4. **Deploy:**
   - Click "Create Static Site"
   - Render will automatically deploy your site
   - You'll get a URL like: `https://map-field-collector.onrender.com`

## Alternative: Full Source Code Deployment

If you want to deploy the full source code with build process:

### Step 1: Upload Source Files to GitHub

Upload all these files to your GitHub repository:

```
map-field-collector/
├── public/
├── src/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html
└── README.md
```

### Step 2: Configure Render for Node.js

```yaml
# Render Configuration for Source Build
Name: map-field-collector
Environment: Node
Branch: main
Build Command: npm ci && npm run build
Start Command: npx serve -s dist -l $PORT
Publish Directory: dist
```

### Step 3: Environment Variables

Set these in Render dashboard:
- `NODE_ENV`: `production`

## Features Included

✅ **Interactive Mapping** - Multiple map layers (Google Satellite, Hybrid, OpenStreetMap)
✅ **GPS Tracking** - Real-time location with accuracy indicators  
✅ **Drawing Tools** - Markers, lines, polygons, rectangles, circles
✅ **Measurement Tools** - Distance and area measurement
✅ **Attribute Management** - Custom attributes for features
✅ **Data Export** - CSV export with UTF-8 encoding
✅ **Mobile Responsive** - Touch-friendly interface
✅ **Vector Layers** - GeoJSON file support

## GPS Requirements

For GPS functionality to work:
- Site must be served over HTTPS (Render provides this automatically)
- Users must grant location permissions
- Works best on mobile devices with GPS capability

## Custom Domain (Optional)

To use a custom domain:
1. Upgrade to Render's paid plan
2. Add your domain in Render dashboard
3. Configure DNS records as instructed

## Support

- **Live Demo:** Your deployed URL
- **Source Code:** Your GitHub repository
- **Issues:** Create issues in your GitHub repo

---

**Copyright © 2025 The Mapper Co., Ltd. : Dr. Taravudh Tipdecho**