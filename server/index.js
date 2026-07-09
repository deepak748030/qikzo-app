require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const env = require('./src/config/env');

const PORT = env.PORT;

// Serverless-friendly: connect on first request via app.js too, but
// also start a listener when run directly (node index.js).
if (require.main === module) {
    connectDB()
        .then(() => {
            app.listen(PORT, () => {
                // eslint-disable-next-line no-console
                console.log(`🚀 API ready on http://localhost:${PORT}`);
            });
        })
        .catch((err) => {
            // eslint-disable-next-line no-console
            console.error('Failed to start server:', err);
            process.exit(1);
        });
}

module.exports = app;
