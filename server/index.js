import app from './app.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Studypeak API listening on http://127.0.0.1:${PORT}`);
});
