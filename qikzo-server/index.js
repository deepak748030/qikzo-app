require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const { initSockets } = require('./src/sockets');

// When invoked directly (`node index.js`), spin up an HTTP + Socket.io server.
// When imported (Vercel serverless), just export the Express app.
if (require.main === module) {
    const server = http.createServer(app);
    initSockets(server, { corsOrigin: env.CORS_ORIGIN });
    connectDB()
        .then(() => {
            server.listen(env.PORT, () => {
                // eslint-disable-next-line no-console
                console.log(`⚡ Qikzo API ready on http://localhost:${env.PORT}`);
            });
        })
        .catch((err) => {
            // eslint-disable-next-line no-console
            console.error('Failed to start Qikzo server:', err);
            process.exit(1);
        });
}

module.exports = app;
