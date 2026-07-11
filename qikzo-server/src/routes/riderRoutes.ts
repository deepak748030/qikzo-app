import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import riderController from '../controllers/riderController';
import riderExtraController from '../controllers/riderExtraController';
import {
    updateRiderStatusSchema,
    updateRiderLocationSchema,
    updateRiderVehicleSchema,
    bookingActionSchema,
} from '../validators/riderSelfValidators';
import {
    uploadDocumentSchema,
    submitKycSchema,
    setPayoutMethodSchema,
    requestPayoutSchema,
} from '../validators/riderExtraValidators';

const router = Router();

// --- Self-service (rider app) — must come BEFORE `/:id` to avoid the
// dynamic route swallowing `/me`. ---
router.get('/me', requireAuth, riderController.me);
router.patch('/me/status', requireAuth, validate(updateRiderStatusSchema), riderController.updateStatus);
router.patch('/me/location', requireAuth, validate(updateRiderLocationSchema), riderController.updateLocation);
router.patch('/me/vehicle', requireAuth, validate(updateRiderVehicleSchema), riderController.updateVehicle);
router.get('/me/incoming', requireAuth, riderController.incoming);

// Documents + KYC
router.get('/me/documents', requireAuth, riderExtraController.listDocuments);
router.post('/me/documents', requireAuth, validate(uploadDocumentSchema), riderExtraController.uploadDocument);
router.delete('/me/documents/:id', requireAuth, riderExtraController.deleteDocument);
router.get('/me/kyc', requireAuth, riderExtraController.getKyc);
router.post('/me/kyc', requireAuth, validate(submitKycSchema), riderExtraController.submitKyc);

// Payout method + requests + earnings
router.get('/me/payout-method', requireAuth, riderExtraController.getPayoutMethod);
router.put('/me/payout-method', requireAuth, validate(setPayoutMethodSchema), riderExtraController.setPayoutMethod);
router.get('/me/payouts', requireAuth, riderExtraController.listPayouts);
router.post('/me/payouts', requireAuth, validate(requestPayoutSchema), riderExtraController.requestPayout);
router.get('/me/earnings', requireAuth, riderExtraController.earnings);

// Booking accept/decline — living under /riders/bookings/:id keeps them
// distinct from the customer-side /bookings/:id/cancel endpoint and makes it
// clear these are rider-scoped actions.
router.post('/bookings/:id/accept', requireAuth, riderController.acceptBooking);
router.post('/bookings/:id/decline', requireAuth, validate(bookingActionSchema), riderController.declineBooking);

// --- Public (customer app) ---
router.get('/available', requireAuth, riderController.listAvailable);
router.get('/nearby', requireAuth, riderController.nearby);
router.get('/:id', requireAuth, riderController.getPublic);

export default router;
