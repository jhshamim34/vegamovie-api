import * as cheerio from 'cheerio';

async function run() {
  const res = await fetch('https://vegamovies.vodka/download-the-ugly-2025-hindi-dubbed-org-480p-720p-1080p-web-dl/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('nexdrive.pro')) {
          console.log("Link:", href);
          let prev = $(el).closest('p').prev();
          while (prev.length && !['h1','h2','h3','h4','h5','h6'].includes(prev[0].tagName)) {
              prev = prev.prev();
          }
          if (prev.length) {
              console.log(`  Heading (${prev[0].tagName}):`, prev.text().trim());
          }
          console.log("---");
      }
  });
}
run();
