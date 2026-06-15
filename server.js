const express = require('express');
const path = require('path');
const store = require('./lib/checkinsStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/checkin', async (req, res) => {
  try {
    const result = await store.addCheckin();

    if (!result.ok) {
      return res.status(409).json({
        error: result.error,
        message: result.message,
        record: result.record,
      });
    }

    res.status(201).json(result.record);
  } catch (err) {
    console.error('POST /api/checkin failed:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to save check-in.' });
  }
});

app.get('/api/checkins', async (req, res) => {
  try {
    const checkins = await store.listCheckins();
    res.json(checkins);
  } catch (err) {
    console.error('GET /api/checkins failed:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to load check-ins.' });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const status = await store.getStatus();
    res.json(status);
  } catch (err) {
    console.error('GET /api/status failed:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to load status.' });
  }
});

app.delete('/api/checkins/:date', async (req, res) => {
  try {
    const result = await store.deleteCheckin(req.params.date);

    if (!result.ok) {
      const status = result.error === 'not_found' ? 404 : 400;
      return res.status(status).json({
        error: result.error,
        message: result.message,
      });
    }

    res.json(result.record);
  } catch (err) {
    console.error('DELETE /api/checkins/:date failed:', err);
    res.status(500).json({ error: 'server_error', message: 'Failed to delete check-in.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Self check-in app running at http://localhost:${PORT}`);
  console.log(`Timezone: ${store.TIMEZONE}`);
});
