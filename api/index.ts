import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import * as cheerio from "cheerio";

const app = express();

// Helper to bypass basic Cloudflare/WAF blocks
const fetchWithHeaders = async (url: string) => {
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    }
  });
};

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting to prevent crashes/abuse
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later." }
});

// Apply rate limiter to all API routes
app.use('/api', limiter);

// API route for search
app.get("/api/search", async (req, res) => {
  const query = req.query.q as string;
  
  if (!query) {
    return res.status(400).json({ error: "Missing query parameter 'q'" });
  }

  try {
    const url = `https://vegamovies.vodka/search.php?q=${encodeURIComponent(query)}`;
    const response = await fetchWithHeaders(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch from vegamovies. Status: ${response.status}`);
    }

    const jsonData = await response.json();
    const results: any[] = [];
    
    if (jsonData && jsonData.hits) {
        jsonData.hits.forEach((hit: any) => {
            const doc = hit.document;
            if (!doc) return;
            
            const href = doc.permalink || '';
            const id = href.replace('https://vegamovies.vodka/', '').replace(/\//g, '');
            const title = doc.post_title || 'Unknown Title';
            const image = doc.post_thumbnail || '';
            
            // Try to extract quality from title or categories
            let quality = 'HD';
            const titleLower = title.toLowerCase();
            if (titleLower.includes('2160p') || titleLower.includes('4k')) quality = '4K';
            else if (titleLower.includes('1080p')) quality = '1080p';
            else if (titleLower.includes('720p')) quality = '720p';
            else if (titleLower.includes('480p')) quality = '480p';
            else if (doc.category && Array.isArray(doc.category)) {
                if (doc.category.includes('1080p')) quality = '1080p';
                else if (doc.category.includes('720p')) quality = '720p';
                else if (doc.category.includes('480p')) quality = '480p';
            }
            
            const imdb = doc.imdb_id || '';
            
            if (id && title) {
                results.push({
                    id,
                    title,
                    image,
                    quality,
                    imdb
                });
            }
        });
    }

    res.json({
      success: true,
      query,
      source_url: url,
      data: results
    });

  } catch (error: any) {
    console.error("Search Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API route for getting movie info
app.get("/api/info", async (req, res) => {
  const id = req.query.id as string;
  
  if (!id) {
    return res.status(400).json({ error: "Missing id parameter" });
  }

  try {
    const url = `https://vegamovies.vodka/${id}/`;
    const response = await fetchWithHeaders(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch from vegamovies. Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const title = $('h1.entry-title').text().trim() || $('title').text().trim();
    
    // Extract metadata
    let imdbId = '';
    let language = '';
    let quality = '';
    let seasons = '';
    
    $('.page-body p').each((i, el) => {
        const text = $(el).text();
        if (text.includes('IMDb Rating:')) {
            const match = text.match(/IMDb Rating:\s*([0-9.]+)/i);
            if (match) imdbId = match[1];
        }
        if (text.includes('Language:')) {
            const match = text.match(/Language:\s*([^<]+)/i);
            if (match) language = match[1].trim();
        }
        if (text.includes('Quality:')) {
            const match = text.match(/Quality:\s*([^<]+)/i);
            if (match) quality = match[1].trim();
        }
        if (text.includes('Season:')) {
            const match = text.match(/Season:\s*([^<]+)/i);
            if (match) seasons = match[1].trim();
        }
    });

    // Description
    const description = $('.page-body p').first().text().trim();

    // Images
    const images: string[] = [];
    $('.page-body img').each((i, el) => {
        const src = $(el).attr('data-src') || $(el).attr('src');
        if (src && !src.startsWith('data:')) {
            images.push(src);
        }
    });

    res.json({
      success: true,
      id,
      source_url: url,
      data: {
          title,
          imdb_id: imdbId,
          language,
          quality,
          seasons,
          description,
          images
      }
    });
  } catch (error: any) {
    console.error("Info Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API route for movies list
app.get("/api/movies", async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  
  try {
    let url = "https://vegamovies.vodka/dual-audio-movies/";
    if (page > 1) {
      url += `page/${page}/`;
    }

    const response = await fetchWithHeaders(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch from vegamovies. Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items: any[] = [];
    
    $('.movies-grid a').each((i, el) => {
        const href = $(el).attr('href');
        if (!href || !href.includes('vegamovies.vodka')) return;
        
        const id = href.replace('https://vegamovies.vodka/', '').replace(/\//g, '');
        const title = $(el).find('.poster-title').text().trim() || $(el).find('img').attr('alt')?.trim() || 'Unknown Title';
        const image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
        const quality = $(el).find('.poster-quality').text().trim();
        const imdb = $(el).find('.imdb-score').text().trim();
        
        if (id && title) {
            items.push({
                id,
                title,
                image,
                quality,
                imdb
            });
        }
    });

    let totalPages = 1;
    $('.pagination a, .nav-links a, .page-numbers').each((i, el) => {
        const text = $(el).text().trim();
        const num = parseInt(text.replace(/,/g, ''));
        if (!isNaN(num) && num > totalPages) {
            totalPages = num;
        }
    });

    res.json({
      success: true,
      page,
      total_pages: totalPages,
      source_url: url,
      data: items
    });

  } catch (error: any) {
    console.error("Movies Extraction Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API route for series list
app.get("/api/series", async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  
  try {
    let url = "https://vegamovies.vodka/dual-audio-series/";
    if (page > 1) {
      url += `page/${page}/`;
    }

    const response = await fetchWithHeaders(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch from vegamovies. Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items: any[] = [];
    
    $('.movies-grid a').each((i, el) => {
        const href = $(el).attr('href');
        if (!href || !href.includes('vegamovies.vodka')) return;
        
        const id = href.replace('https://vegamovies.vodka/', '').replace(/\//g, '');
        const title = $(el).find('.poster-title').text().trim() || $(el).find('img').attr('alt')?.trim() || 'Unknown Title';
        const image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
        const quality = $(el).find('.poster-quality').text().trim();
        const imdb = $(el).find('.imdb-score').text().trim();
        
        if (id && title) {
            items.push({
                id,
                title,
                image,
                quality,
                imdb
            });
        }
    });

    let totalPages = 1;
    $('.pagination a, .nav-links a, .page-numbers').each((i, el) => {
        const text = $(el).text().trim();
        const num = parseInt(text.replace(/,/g, ''));
        if (!isNaN(num) && num > totalPages) {
            totalPages = num;
        }
    });

    res.json({
      success: true,
      page,
      total_pages: totalPages,
      source_url: url,
      data: items
    });

  } catch (error: any) {
    console.error("Series Extraction Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API route for latest releases
app.get("/api/latest-releases", async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  
  try {
    let url = "https://vegamovies.vodka/";
    if (page > 1) {
      url += `page/${page}/`;
    }

    const response = await fetchWithHeaders(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch from vegamovies. Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items: any[] = [];
    
    $('.movies-grid a').each((i, el) => {
        const href = $(el).attr('href');
        if (!href || !href.includes('vegamovies.vodka')) return;
        
        const id = href.replace('https://vegamovies.vodka/', '').replace(/\//g, '');
        const title = $(el).find('.poster-title').text().trim() || $(el).find('img').attr('alt')?.trim() || 'Unknown Title';
        const image = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
        const quality = $(el).find('.poster-quality').text().trim();
        const imdb = $(el).find('.imdb-score').text().trim();
        
        if (id && title) {
            items.push({
                id,
                title,
                image,
                quality,
                imdb
            });
        }
    });

    let totalPages = 1;
    $('.pagination a, .nav-links a, .page-numbers').each((i, el) => {
        const text = $(el).text().trim();
        const num = parseInt(text.replace(/,/g, ''));
        if (!isNaN(num) && num > totalPages) {
            totalPages = num;
        }
    });

    res.json({
      success: true,
      page,
      total_pages: totalPages,
      source_url: url,
      data: items
    });

  } catch (error: any) {
    console.error("Latest Releases Extraction Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API route for getting direct download links
app.get("/api/download", async (req, res) => {
  const id = req.query.id as string;
  const quality = req.query.quality as string;
  const se = req.query.se as string;
  
  if (!id || !quality) {
    return res.status(400).json({ error: "Missing id or quality parameter" });
  }

  try {
    const url = `https://vegamovies.vodka/${id}/`;
    const response = await fetchWithHeaders(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch from vegamovies. Status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    let targetNexdriveUrl = '';
    let matchedSection = '';

    $('.page-body h3').each((i, el) => {
        const sectionTitle = $(el).text().trim();
        const sectionTitleLower = sectionTitle.toLowerCase();
        const q = quality.toLowerCase();
        
        let match = sectionTitleLower.includes(q);
        if (se) {
            const s1 = `season ${se}`.toLowerCase();
            const s2 = `s0${se}`.toLowerCase();
            const s3 = `s${se}`.toLowerCase();
            match = match && (sectionTitleLower.includes(s1) || sectionTitleLower.includes(s2) || sectionTitleLower.includes(s3));
        }
        
        if (match && !targetNexdriveUrl) {
            matchedSection = sectionTitle;
            let nextEl = $(el).next();
            let fallbackUrl = '';
            
            while (nextEl.length && nextEl[0].tagName === 'p') {
                nextEl.find('a').each((j, aEl) => {
                    const linkText = $(aEl).text().toLowerCase();
                    const href = $(aEl).attr('href');
                    if (href && href.includes('nexdrive.pro')) {
                        if (!fallbackUrl) fallbackUrl = href;
                        if (linkText.includes('v-cloud') || linkText.includes('vcloud')) {
                            targetNexdriveUrl = href;
                        }
                    }
                });
                if (targetNexdriveUrl) break;
                nextEl = nextEl.next();
            }
            if (!targetNexdriveUrl && fallbackUrl) {
                targetNexdriveUrl = fallbackUrl;
            }
        }
    });

    if (!targetNexdriveUrl) {
        return res.status(404).json({ success: false, error: "Could not find matching download section for the specified quality/season." });
    }

    // Now extract from targetNexdriveUrl
    const nexRes = await fetchWithHeaders(targetNexdriveUrl);
    const nexHtml = await nexRes.text();
    const _$ = cheerio.load(nexHtml);
    
    const vcloudLinks: { title: string, url: string }[] = [];
    
    _$('.page-body a, .entry-inner a').each((i, el) => {
        const href = _$(el).attr('href');
        
        if (href && href.includes('vcloud.zip')) {
            let episodeName = "Download";
            const prevH4 = _$(el).closest('p').prevAll('h4').first();
            if (prevH4.length) {
                episodeName = prevH4.text().trim().replace(/[-:]/g, '').trim();
            }
            vcloudLinks.push({ title: episodeName, url: href });
        }
    });

    const finalLinks: any[] = [];

    // Process vcloud links concurrently
    await Promise.all(vcloudLinks.map(async (link) => {
        try {
            const vcloudRes = await fetchWithHeaders(link.url);
            if (vcloudRes.ok) {
                const vcloudHtml = await vcloudRes.text();
                const urlMatch = vcloudHtml.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/i);
                if (urlMatch && urlMatch[1]) {
                    const redirectUrl = urlMatch[1];
                    const finalRes = await fetchWithHeaders(redirectUrl);
                    if (finalRes.ok) {
                        const finalHtml = await finalRes.text();
                        const __$ = cheerio.load(finalHtml);
                        
                        __$('a').each((i, el) => {
                            const href = __$(el).attr('href');
                            const text = __$(el).text().trim();
                            if (href && (href.includes('r2.cloudflarestorage.com') || href.includes('toxix.buzz') || href.includes('hubcdn.fans') || href.includes('re.php?l='))) {
                                let finalUrl = href;
                                if (href.includes('re.php?l=')) {
                                    try {
                                        const b64 = href.split('re.php?l=')[1];
                                        finalUrl = Buffer.from(b64, 'base64').toString('utf-8');
                                    } catch(e) {}
                                }
                                finalLinks.push({
                                    episode: link.title,
                                    server: text,
                                    url: finalUrl
                                });
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Error processing vcloud link:", link.url, e);
        }
    }));

    // Sort final links by episode
    finalLinks.sort((a, b) => a.episode.localeCompare(b.episode));

    res.json({
        success: true,
        id,
        quality,
        season: se || null,
        matched_section: matchedSection,
        nexdrive_url: targetNexdriveUrl,
        data: finalLinks
    });

  } catch (error: any) {
    console.error("Download Extraction Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
