// FitMirror PocketBase collections — mirrors the Prisma schema.
// Defines: sessions, tryons, wardrobe_items, usage_logs, admin_settings, payments
import { Collection, Schema } from "pocketbase";

const sessions = new Collection({
  name: "sessions",
  type: "base",
  fields: [
    { name: "created_at", type: "autodate", onCreate: true, onUpdate: false },
    { name: "last_active", type: "autodate", onCreate: true, onUpdate: true },
    { name: "plan", type: "text", required: false, options: { max: 20 } },
  ],
});

const tryons = new Collection({
  name: "tryons",
  type: "base",
  fields: [
    { name: "session", type: "relation", required: true, options: { collection: "sessions", cascadeDelete: true, max: 1 } },
    { name: "person_image_url", type: "url", required: true },
    { name: "garment_image_url", type: "url", required: true },
    { name: "result_image_url", type: "url", required: false },
    { name: "garment_name", type: "text", required: false },
    { name: "report", type: "json", required: false },
    { name: "variations", type: "json", required: false }, // array of result image URLs
    { name: "created_at", type: "autodate", onCreate: true, onUpdate: false },
  ],
});

const wardrobeItems = new Collection({
  name: "wardrobe_items",
  type: "base",
  fields: [
    { name: "session", type: "relation", required: true, options: { collection: "sessions", cascadeDelete: true, max: 1 } },
    { name: "tryon", type: "relation", required: false, options: { collection: "tryons", cascadeDelete: false, max: 1 } },
    { name: "name", type: "text", required: true },
    { name: "notes", type: "text", required: false },
    { name: "person_image_url", type: "url", required: false },
    { name: "garment_image_url", type: "url", required: false },
    { name: "result_image_url", type: "url", required: false },
    { name: "created_at", type: "autodate", onCreate: true, onUpdate: false },
  ],
});

const usageLogs = new Collection({
  name: "usage_logs",
  type: "base",
  fields: [
    { name: "session", type: "relation", required: true, options: { collection: "sessions", cascadeDelete: true, max: 1 } },
    { name: "date", type: "text", required: true, options: { max: 10 } },
    { name: "count", type: "number", required: false },
  ],
});

const adminSettings = new Collection({
  name: "admin_settings",
  type: "base",
  fields: [
    { name: "key", type: "text", required: true, options: { max: 100 } },
    { name: "value", type: "text", required: false },
  ],
});

const payments = new Collection({
  name: "payments",
  type: "base",
  fields: [
    { name: "session", type: "relation", required: true, options: { collection: "sessions", cascadeDelete: true, max: 1 } },
    { name: "amount_cents", type: "number", required: true },
    { name: "currency", type: "text", required: false, options: { max: 10 } },
    { name: "plan", type: "text", required: false, options: { max: 20 } },
    { name: "status", type: "text", required: false, options: { max: 20 } },
    { name: "provider", type: "text", required: false, options: { max: 20 } },
    { name: "provider_payment_id", type: "text", required: false },
    { name: "created_at", type: "autodate", onCreate: true, onUpdate: false },
  ],
});

export const collections = [
  sessions,
  tryons,
  wardrobeItems,
  usageLogs,
  adminSettings,
  payments,
];
