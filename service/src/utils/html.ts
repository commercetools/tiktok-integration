const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

/** Escapes text for use inside HTML element content or a quoted attribute. */
export const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => ESCAPES[char] as string);

const STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f4f6f8; min-height: 100vh; display: flex;
    align-items: center; justify-content: center; padding: 20px;
  }
  .card {
    background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    max-width: 560px; width: 100%; padding: 40px; text-align: center;
  }
  h1 { color: #1a202c; font-size: 26px; margin-bottom: 12px; }
  p { color: #4a5568; font-size: 16px; line-height: 1.6; }
  .detail {
    margin-top: 24px; padding: 16px; border-radius: 8px; text-align: left;
    font-family: Menlo, Monaco, monospace; font-size: 14px; word-break: break-word;
  }
  .success .detail { background: #f0fff4; color: #22543d; border-left: 4px solid #38a169; }
  .error .detail { background: #fff5f5; color: #742a2a; border-left: 4px solid #e53e3e; }
`;

const page = (kind: 'success' | 'error', title: string, intro: string, detail: string): string =>
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${STYLE}</style>
</head>
<body>
  <main class="card ${kind}">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(intro)}</p>
    <div class="detail">${escapeHtml(detail)}</div>
  </main>
</body>
</html>`;

export const renderSuccessPage = (shopName: string, notes: string[] = []): string =>
  page(
    'success',
    'TikTok Shop authorized',
    'You can close this window and return to the Merchant Center.',
    [`Shop: ${shopName}`, ...notes].join('\n'),
  );

export const renderErrorPage = (message: string, statusCode: number): string =>
  page(
    'error',
    'Authorization failed',
    `The request could not be completed (${statusCode}). Return to the Merchant Center and try again.`,
    message,
  );
