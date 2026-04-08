import * as cheerio from "cheerio";
import fs from "fs";

async function testInfo() {
  const url = "https://vegamovies.vodka/download-bloodhounds-netflix-web-series/";
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await response.text();
  fs.writeFileSync('info.html', html);
  
  const $ = cheerio.load(html);
  
  console.log("Title:", $('h1').text().trim() || $('title').text().trim());
  
  // Try to find info block
  const infoText = $('.entry-content').text().substring(0, 1000);
  console.log("Info text snippet:", infoText.replace(/\n+/g, ' ').substring(0, 200));
  
  // Find download links
  console.log("Download Links:");
  $('.entry-content a').each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr('href');
      if (href && (text.toLowerCase().includes('download') || href.includes('link') || $(el).hasClass('button') || $(el).find('button').length > 0)) {
          console.log(`- [${text}](${href})`);
      }
  });
}

testInfo();
