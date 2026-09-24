// Entry point: starts the HTTP server.
const createApp = require('./app');

const port = process.env.PORT || 3000;
createApp().listen(port, () => {
  console.log(`Unit Task Tracker running on port ${port} (${process.env.APP_ENV || 'development'})`);
});
