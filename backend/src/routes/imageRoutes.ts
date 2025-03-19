import { Router } from 'express';
import ImageController from '../controllers/ImageController';
import { HealthController } from '../controllers/HealthController';

const router = Router();
const healthController = new HealthController();


router.get('/health', healthController.healthCheck);
router.get('/health/deep', healthController.deepHealthCheck);

router.post('/', ImageController.uploadImage.bind(ImageController));
router.get('/:imageId', ImageController.getImage.bind(ImageController));

export default router;
