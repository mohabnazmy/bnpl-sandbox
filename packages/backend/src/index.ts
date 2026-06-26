import { createApp } from './app';
import { config } from './config';

createApp().listen(config.port, () => {
  console.log(`[bnpl-backend] listening on http://localhost:${config.port}`);
});
