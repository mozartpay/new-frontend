import { LoaderFunction } from "@remix-run/node"; // or "@remix-run/cloudflare"

export let loader: LoaderFunction = async () => {
  // Define your robots.txt content here
  
  let robotsTxt = `User-agent: *
Allow: /
Allow: /blog
Allow: /contact
Allow: /privacy
Allow: /terms
Disallow: /admin/

Sitemap: https://mozartpay.com/sitemap.xml
`;



  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
};
