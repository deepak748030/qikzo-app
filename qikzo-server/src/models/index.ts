// Central re-export of every Mongoose model. Importing this once at boot (see
// server.ts) also has the side-effect of registering all schemas, which is
// required before `mongoose.modelNames()` / `syncIndexes()` will see them.

export { default as User } from './User';
export { default as Rider } from './Rider';
export { default as Vehicle } from './Vehicle';
export { default as VehicleType } from './VehicleType';
export { default as Otp } from './Otp';
export { default as RefreshToken } from './RefreshToken';
export { default as Device } from './Device';
export { default as Booking } from './Booking';
export { default as RideRequest } from './RideRequest';
export { default as Trip } from './Trip';
export { default as RideHistory } from './RideHistory';
export { default as Category } from './Category';
export { default as PromoBanner } from './PromoBanner';
export { default as Promo } from './Promo';
export { default as Coupon } from './Coupon';
export { default as CouponRedemption } from './CouponRedemption';
export { default as SavedPlace } from './SavedPlace';
export { default as Address } from './Address';
export { default as LocationHistory } from './LocationHistory';
export { default as Wallet } from './Wallet';
export { default as WalletTransaction } from './WalletTransaction';
export { default as Payment } from './Payment';
export { default as Payout } from './Payout';
export { default as Notification } from './Notification';
export { default as Review } from './Review';
export { default as SupportTicket } from './SupportTicket';
export { default as Chat } from './Chat';
export { default as Message } from './Message';
export { default as EmergencyContact } from './EmergencyContact';
export { default as Document } from './Document';
export { default as KYC } from './KYC';
export { default as Settings } from './Settings';
export { default as AppSettings } from './AppSettings';
export { default as RewardConfig } from './RewardConfig';
export { default as Referral } from './Referral';
export { default as Migration } from './Migration';
