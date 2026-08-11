// src/lib/uploads-shared.ts
//
// Upload limits shared by BOTH sides of the boundary: the client staging
// field checks them before uploading, the server (lib/uploads.ts) enforces
// them authoritatively. Keep in one place so they can never drift.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
