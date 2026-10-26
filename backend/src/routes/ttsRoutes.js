import { TTSController } from '../controllers/ttsController.js';

/**
 * Text-To-Speech Neural Proxy Routes
 */
export function registerTTSRoutes(router) {
  router.post('/api/tts/synthesize', TTSController.synthesize);
  router.get('/api/tts/status', TTSController.getStatus);
}
