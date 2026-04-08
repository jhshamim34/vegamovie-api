import * as cheerio from "cheerio";
import fs from "fs";

async function test() {
  const url = "https://vegamovies.vodka/search.html?q=bloodhounds";
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await response.text();
  fs.writeFileSync('output.html', html);
  
  // Let's also check if there's an API endpoint in the HTML or script tags
  const $ = cheerio.load(html);
  console.log("Scripts:");
  $('script').each((i, el) => {
    const src = $(el).attr('src');
    if (src) console.log("SRC:", src);
    else {
        const content = $(el).html();
        if (content) {
            console.log("INLINE SCRIPT:", content.substring(0, 500));
        }
    }
  });
}

test();
