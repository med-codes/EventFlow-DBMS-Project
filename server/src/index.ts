import { app } from './app';
import { pool } from './db/pool';

const PORT = parseInt(process.env.PORT || '5000', 10);

// Test database connection on server start
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Connected to PostgreSQL successfully');
    app.listen(PORT, () => {
      console.log(`EventFlow backend server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to PostgreSQL:', err);
    process.exit(1);
  });
