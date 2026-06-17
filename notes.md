# Notes

## Social card URL / Vercel deployment

Open Graph, Twitter/X, LinkedIn, and other social previews use the metadata base URL configured in `app/layout.tsx` to resolve card image URLs.

Vercel deployment URLs are picked up automatically from Vercel environment variables, but if the site uses a custom production domain or is deployed outside Vercel, set:

```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

This keeps `opengraph-image.png` and `twitter-image.png` URLs correct when links are shared.
