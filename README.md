# Vegamovies API

This project provides a scraper API for Vegamovies, built with Express (for local/VPS deployment) and Cloudflare Workers (for edge deployment).

## Deployment

### Cloudflare Workers (Recommended)
This API is optimized for Cloudflare Workers to bypass 403 Forbidden errors caused by Datacenter IPs. 

1. Push this repository to GitHub.
2. Go to the Cloudflare Dashboard -> Workers & Pages.
3. Create a new Worker and connect it to your GitHub repository.
4. Cloudflare will automatically deploy the `worker.ts` file using the `wrangler.toml` configuration.

### Vercel (Frontend Only)
You can deploy the frontend to Vercel. Make sure to set the `VITE_API_BASE_URL` environment variable in Vercel to point to your deployed Cloudflare Worker URL.

### Local Development
```bash
npm install
npm run dev
```
