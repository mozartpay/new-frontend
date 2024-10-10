import { LoaderFunction } from "@remix-run/node"; // or "@remix-run/cloudflare" depending on your deployment platform

export let loader: LoaderFunction = async () => {
  // Here you can dynamically generate your sitemap XML
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://mozartpay.com/</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>
    <url>
      <loc>https://mozartpay.com/contact</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
    </url>
    <url>
      <loc>https://mozartpay.com/blog</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
    </url>
    <url>
      <loc>https://mozartpay.com/privacy</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
    </url>
  </urlset>`;
  

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
};
