/**
 * Mobile API layer entrypoint. Screens should import from here, never from
 * individual files, so we can add cross-cutting concerns (caching, telemetry,
 * mocks) without touching call-sites.
 *
 *   import { api } from '@/lib/api';
 *   const trip = await api.trips.active();
 */
export * from './types';
export { ApiError } from './errors';
export { tokenStore } from './tokenStore';
export { http, onUnauthorized } from './client';
export { API_URL, API_BASE_URL } from './config';

import authApi from './endpoints/auth';
import bookingsApi from './endpoints/bookings';
import ridersApi from './endpoints/riders';
import tripsApi from './endpoints/trips';
import usersApi from './endpoints/users';
import placesApi from './endpoints/places';
import catalogApi from './endpoints/catalog';
import categoryBannersApi from './endpoints/categoryBanners';
import notificationsApi from './endpoints/notifications';

export const api = {
    auth: authApi,
    bookings: bookingsApi,
    riders: ridersApi,
    trips: tripsApi,
    users: usersApi,
    places: placesApi,
    catalog: catalogApi,
    categoryBanners: categoryBannersApi,
    notifications: notificationsApi,
};

export default api;
