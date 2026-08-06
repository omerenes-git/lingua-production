import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Health check — AI işlemleri tarayıcıda Supabase Edge Function'a
// (lingua-web-api) yönlendirildiği için bu sunucu yalnızca statik dosya
// sunar; burada Gemini/OpenAI çağrısı yapılmaz.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', backend: 'supabase-edge' });
});

// Vite or static serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lingua Production Coach running at http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
