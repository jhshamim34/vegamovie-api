import * as cheerio from "cheerio";

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
};

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/search') {
        const query = url.searchParams.get('q');
        if (!query) return jsonResponse({ error: "Missing query parameter 'q'" }, 400);

        const targetUrl = `https://vegamovies.vodka/search.php?q=${encodeURIComponent(query)}`;
        const response = await fetchWithHeaders(targetUrl);
        if (!response.ok) throw new Error(`Failed to fetch from vegamovies. Status: ${response.status}`);

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
                
                if (id && title) results.push({ id, title, image, quality, imdb });
            });
        }

        return jsonResponse({ success: true, query, source_url: targetUrl, data: results });
      }

      if (path === '/api/info') {
        const id = url.searchParams.get('id');
        if (!id) return jsonResponse({ error: "Missing id parameter" }, 400);

        const targetUrl = `https://vegamovies.vodka/${id}/`;
        const response = await fetchWithHeaders(targetUrl);
        if (!response.ok) throw new Error(`Failed to fetch from vegamovies. Status: ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);
        const title = $('h1.entry-title').text().trim() || $('title').text().trim();
        
        let imdbId = '', language = '', quality = '', seasons = '';
        $('.page-body p').each((i, el) => {
            const text = $(el).text();
            if (text.includes('IMDb Rating:')) imdbId = text.match(/IMDb Rating:\s*([0-9.]+)/i)?.[1] || '';
            if (text.includes('Language:')) language = text.match(/Language:\s*([^<]+)/i)?.[1]?.trim() || '';
            if (text.includes('Quality:')) quality = text.match(/Quality:\s*([^<]+)/i)?.[1]?.trim() || '';
            if (text.includes('Season:')) seasons = text.match(/Season:\s*([^<]+)/i)?.[1]?.trim() || '';
        });

        const description = $('.page-body p').first().text().trim();
        const images: string[] = [];
        $('.page-body img').each((i, el) => {
            const src = $(el).attr('data-src') || $(el).attr('src');
            if (src && !src.startsWith('data:')) images.push(src);
        });

        return jsonResponse({
          success: true, id, source_url: targetUrl,
          data: { title, imdb_id: imdbId, language, quality, seasons, description, images }
        });
      }

      if (path === '/api/movies' || path === '/api/series' || path === '/api/latest-releases') {
        const pageStr = url.searchParams.get('page');
        const page = pageStr ? parseInt(pageStr) : 1;
        
        let targetUrl = "https://vegamovies.vodka/";
        if (path === '/api/movies') targetUrl = "https://vegamovies.vodka/dual-audio-movies/";
        if (path === '/api/series') targetUrl = "https://vegamovies.vodka/dual-audio-series/";
        
        if (page > 1) targetUrl += `page/${page}/`;

        const response = await fetchWithHeaders(targetUrl);
        if (!response.ok) throw new Error(`Failed to fetch from vegamovies. Status: ${response.status}`);

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
            
            if (id && title) items.push({ id, title, image, quality, imdb });
        });

        let totalPages = 1;
        $('.pagination a, .nav-links a, .page-numbers').each((i, el) => {
            const num = parseInt($(el).text().trim().replace(/,/g, ''));
            if (!isNaN(num) && num > totalPages) totalPages = num;
        });

        return jsonResponse({ success: true, page, total_pages: totalPages, source_url: targetUrl, data: items });
      }

      if (path === '/api/download') {
        const id = url.searchParams.get('id');
        const quality = url.searchParams.get('quality');
        const se = url.searchParams.get('se');
        
        if (!id || !quality) return jsonResponse({ error: "Missing id or quality parameter" }, 400);

        const targetUrl = `https://vegamovies.vodka/${id}/`;
        const response = await fetchWithHeaders(targetUrl);
        if (!response.ok) throw new Error(`Failed to fetch from vegamovies. Status: ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);
        
        let targetNexdriveUrl = '';
        let matchedSection = '';

        $('.page-body h3, .page-body h4, .page-body h5').each((i, el) => {
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
                            if (linkText.includes('v-cloud') || linkText.includes('vcloud')) targetNexdriveUrl = href;
                        }
                    });
                    if (targetNexdriveUrl) break;
                    nextEl = nextEl.next();
                }
                if (!targetNexdriveUrl && fallbackUrl) targetNexdriveUrl = fallbackUrl;
            }
        });

        if (!targetNexdriveUrl) return jsonResponse({ success: false, error: "Could not find matching download section." }, 404);

        const nexRes = await fetchWithHeaders(targetNexdriveUrl);
        const nexHtml = await nexRes.text();
        const _$ = cheerio.load(nexHtml);
        const vcloudLinks: { title: string, url: string }[] = [];
        
        _$('.page-body a, .entry-inner a').each((i, el) => {
            const href = _$(el).attr('href');
            if (href && href.includes('vcloud.zip')) {
                let episodeName = "Download";
                const prevH4 = _$(el).closest('p').prevAll('h4').first();
                if (prevH4.length) episodeName = prevH4.text().trim().replace(/[-:]/g, '').trim();
                vcloudLinks.push({ title: episodeName, url: href });
            }
        });

        const finalLinks: any[] = [];
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
                                        try { finalUrl = Buffer.from(href.split('re.php?l=')[1], 'base64').toString('utf-8'); } catch(e) {}
                                    }
                                    finalLinks.push({ episode: link.title, server: text, url: finalUrl });
                                }
                            });
                        }
                    }
                }
            } catch (e) {}
        }));

        finalLinks.sort((a, b) => a.episode.localeCompare(b.episode));
        return jsonResponse({ success: true, id, quality, season: se || null, matched_section: matchedSection, nexdrive_url: targetNexdriveUrl, data: finalLinks });
      }

      // If it's not an API route, return 404 or serve a basic message
      return jsonResponse({ error: "Not Found", message: "API is running. Use /api/search, /api/movies, etc." }, 404);

    } catch (error: any) {
      console.error("Worker Error:", error);
      return jsonResponse({ success: false, error: error.message }, 500);
    }
  }
};
