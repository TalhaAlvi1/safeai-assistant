# Deploying SafeAI Backend to Vercel

This document explains how to properly deploy your SafeAI backend to Vercel.

## Overview

Your original backend was built as a traditional Express.js server, but Vercel requires a serverless function architecture. This repository includes a restructured version of your backend that works with Vercel's serverless functions.

## File Structure

```
backend/
├── api/                    # Vercel serverless functions
│   ├── index.js           # Root endpoint
│   ├── health.js          # Health check
│   ├── ready.js           # Ready check
│   ├── live.js            # Live check
│   ├── inline/
│   │   └── index.js       # Inline text analysis
│   ├── documents/
│   │   └── index.js       # Document processing
│   ├── personas/
│   │   └── index.js       # Persona management
│   ├── prompts/
│   │   └── index.js       # Prompt management
│   ├── auth/
│   │   └── index.js       # Authentication
│   ├── admin/
│   │   └── index.js       # Admin routes
│   ├── platform/
│   │   └── index.js       # Platform admin routes
│   ├── public/
│   │   └── index.js       # Public routes
│   ├── telemetry/
│   │   └── index.js       # Telemetry tracking
│   └── _lib/              # Shared utilities
│       ├── requestHandler.js
│       ├── auth.js
│       ├── database.js
│       └── telemetryService.js
├── vercel.json            # Vercel configuration
└── package.json
```

## Deployment Steps

### 1. Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### 2. Navigate to the backend directory
```bash
cd backend
```

### 3. Deploy to Vercel
```bash
vercel --prod
```

Or simply push your code to a connected GitHub repository for automatic deployment.

### 4. Set Environment Variables

After deployment, set these environment variables in your Vercel dashboard:

- `GEMINI_API_KEY`: Your Google Gemini API key
- `OPENAI_API_KEY`: Your OpenAI API key (if needed)
- `DATABASE_URL`: PostgreSQL database URL (if using a database)
- `JWT_SECRET`: Secret for JWT tokens (should be a strong random string)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `https://your-frontend.com,https://*.vercel.app,https://chat.openai.com,https://claude.ai,https://gemini.google.com`)

## API Endpoints

After deployment, your API endpoints will be available at:
- `https://your-project-name.vercel.app/` - Main endpoint
- `https://your-project-name.vercel.app/health` - Health check
- `https://your-project-name.vercel.app/ready` - Ready check
- `https://your-project-name.vercel.app/live` - Live check
- `https://your-project-name.vercel.app/inline/check` - Inline text analysis
- `https://your-project-name.vercel.app/telemetry/event` - Telemetry tracking
- `https://your-project-name.vercel.app/telemetry/action` - Telemetry action tracking

## Database Configuration

This backend supports PostgreSQL database connections. For free PostgreSQL options, consider:
- Supabase (https://supabase.com/)
- PlanetScale (https://planetscale.com/)
- ElephantsQL (https://www.elephantsql.com/)

## Updating Frontend Configuration

After deployment, update your frontend files to use the new Vercel backend URL:

```bash
node update_frontend_urls.js https://your-project-name.vercel.app
```

## Notes

1. **Cold Starts**: Serverless functions may have cold starts. For better performance, consider upgrading to a Pro account for longer execution times.

2. **Database Connections**: The database utility is optimized for serverless environments with single connections.

3. **Background Jobs**: The retention job from your original setup won't work in serverless. Consider using a cron job service or a separate persistent service for background tasks.

4. **File Uploads**: If you need file upload functionality, you'll need to implement it using Vercel's API functions with appropriate storage services.

## Troubleshooting

If you encounter issues:

1. Check Vercel logs in your dashboard
2. Verify all environment variables are set correctly
3. Ensure CORS settings allow your frontend domains
4. Check that your database URL is accessible from Vercel's network

For more help, visit the Vercel documentation: https://vercel.com/docs