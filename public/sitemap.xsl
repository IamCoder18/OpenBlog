<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <xsl:output method="html" encoding="UTF-8" />
  <xsl:template match="/">
    <html lang="en">
      <head>
        <title>OpenBlog Sitemap</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { background: #f7f8fc; color: #171a2b; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; }
          main { margin: 0 auto; max-width: 72rem; padding: 3rem 1.25rem; }
          h1 { font-size: 2rem; margin: 0 0 .5rem; }
          p { color: #53576b; margin: 0 0 2rem; }
          table { background: white; border-collapse: collapse; border-radius: .75rem; box-shadow: 0 8px 30px rgba(23, 26, 43, .08); overflow: hidden; width: 100%; }
          th, td { border-bottom: 1px solid #e7e8ef; padding: .8rem 1rem; text-align: left; }
          th { background: #f0efff; font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; }
          tr:last-child td { border-bottom: 0; }
          a { color: #5146d8; overflow-wrap: anywhere; }
          .date { color: #686b7c; white-space: nowrap; }
        </style>
      </head>
      <body>
        <main>
          <h1>OpenBlog Sitemap</h1>
          <xsl:choose>
            <xsl:when test="s:sitemapindex">
              <p>This sitemap index links to <xsl:value-of select="count(s:sitemapindex/s:sitemap)" /> sitemap files.</p>
              <table>
                <thead><tr><th>Sitemap</th><th>Last modified</th></tr></thead>
                <tbody>
                  <xsl:for-each select="s:sitemapindex/s:sitemap">
                    <tr>
                      <td><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
                      <td class="date"><xsl:value-of select="s:lastmod" /></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:when>
            <xsl:otherwise>
              <p>This sitemap contains <xsl:value-of select="count(s:urlset/s:url)" /> public URLs.</p>
              <table>
                <thead><tr><th>URL</th><th>Last modified</th></tr></thead>
                <tbody>
                  <xsl:for-each select="s:urlset/s:url">
                    <tr>
                      <td><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
                      <td class="date"><xsl:value-of select="s:lastmod" /></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:otherwise>
          </xsl:choose>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
