/**
 * Renders an HTML page with a highlighted code for the user to copy
 * @param code - The code to display and highlight
 * @param title - The title of the page (default: "Authorization Code")
 * @returns HTML string
 */
export const renderCodeCopyPage = (
  code: string,
  title: string = 'Authorization Code',
): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }
        
        h1 {
            color: #2d3748;
            margin-bottom: 12px;
            font-size: 28px;
            font-weight: 600;
        }
        
        .instruction {
            color: #718096;
            margin-bottom: 32px;
            font-size: 16px;
            line-height: 1.6;
        }
        
        .code-container {
            background: #f7fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
        }
        
        .code-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }
        
        .code {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 18px;
            color: #2d3748;
            word-break: break-all;
            background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 600;
            letter-spacing: 0.5px;
            line-height: 1.8;
        }
        
        .copy-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 14px 32px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .copy-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        
        .copy-button:active {
            transform: translateY(0);
        }
        
        .copy-button.copied {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        }
        
        .success-message {
            color: #38a169;
            font-size: 14px;
            margin-top: 16px;
            opacity: 0;
            transition: opacity 0.3s ease;
            font-weight: 500;
        }
        
        .success-message.show {
            opacity: 1;
        }
        
        .icon {
            display: inline-block;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 ${escapeHtml(title)}</h1>
        <p class="instruction">
            <strong>Please copy the code below</strong> and use it to complete your authorization process.
        </p>
        
        <div class="code-container">
            <div class="code" id="code">${escapeHtml(code)}</div>
        </div>
        
        <button class="copy-button" id="copyButton" onclick="copyCode()">
            <span class="icon">📋</span>
            Copy Code
        </button>
        
        <div class="success-message" id="successMessage">
            <span class="icon">✅</span>
            Code copied to clipboard!
        </div>
    </div>
    
    <script>
        function copyCode() {
            const codeElement = document.getElementById('code');
            const button = document.getElementById('copyButton');
            const successMessage = document.getElementById('successMessage');
            const code = codeElement.textContent;
            
            navigator.clipboard.writeText(code).then(() => {
                button.classList.add('copied');
                button.innerHTML = '<span class="icon">✅</span> Copied!';
                successMessage.classList.add('show');
                
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML = '<span class="icon">📋</span> Copy Code';
                    successMessage.classList.remove('show');
                }, 3000);
            }).catch(err => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = code;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    button.classList.add('copied');
                    button.innerHTML = '<span class="icon">✅</span> Copied!';
                    successMessage.classList.add('show');
                    
                    setTimeout(() => {
                        button.classList.remove('copied');
                        button.innerHTML = '<span class="icon">📋</span> Copy Code';
                        successMessage.classList.remove('show');
                    }, 3000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
                document.body.removeChild(textArea);
            });
        }
    </script>
</body>
</html>
  `.trim();
};

/**
 * Renders an HTML error page with a user-friendly error message
 * @param errorMessage - The error message to display
 * @param statusCode - The HTTP status code (default: 500)
 * @param title - The title of the error page (default: "Error")
 * @returns HTML string
 */
export const renderErrorPage = (
  errorMessage: string,
  statusCode: number = 500,
  title: string = 'Error',
): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }
        
        .error-icon {
            font-size: 64px;
            margin-bottom: 24px;
            animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
        
        h1 {
            color: #2d3748;
            margin-bottom: 12px;
            font-size: 28px;
            font-weight: 600;
        }
        
        .status-code {
            color: #e53e3e;
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 16px;
            background: linear-gradient(120deg, #f093fb 0%, #f5576c 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .error-message {
            background: #fff5f5;
            border-left: 4px solid #e53e3e;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
            text-align: left;
        }
        
        .error-message-title {
            color: #c53030;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .error-message-text {
            color: #742a2a;
            font-size: 15px;
            line-height: 1.6;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            word-break: break-word;
        }
        
        .help-text {
            color: #718096;
            font-size: 14px;
            line-height: 1.6;
            margin-top: 24px;
        }
        
        .back-button {
            margin-top: 24px;
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .back-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">⚠️</div>
        <div class="status-code">${statusCode}</div>
        <h1>${escapeHtml(title)}</h1>
        
        <div class="error-message">
            <div class="error-message-title">Error Details</div>
            <div class="error-message-text">${escapeHtml(errorMessage)}</div>
        </div>
        
        <p class="help-text">
            If this problem persists, please contact your system administrator or try again later.
        </p>
        
        <a href="javascript:history.back()" class="back-button">
            ← Go Back
        </a>
    </div>
</body>
</html>
  `.trim();
};

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param text - The text to escape
 * @returns Escaped HTML string
 */
const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};
