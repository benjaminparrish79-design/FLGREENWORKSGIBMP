import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to companies table */
  companyId: int("companyId").notNull(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["owner", "manager", "crew", "admin"]).default("crew").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Company table
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  subscriptionPlan: varchar("subscriptionPlan", { length: 64 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Crews table
 */
export const crews = mysqlTable("crews", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  crewName: varchar("crewName", { length: 255 }).notNull(),
  employeeName: varchar("employeeName", { length: 255 }),
  vehicleId: varchar("vehicleId", { length: 255 }),
  deviceId: varchar("deviceId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Crew = typeof crews.$inferSelect;
export type InsertCrew = typeof crews.$inferInsert;

/**
 * Properties table
 */
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 255 }),
  zip: varchar("zip", { length: 10 }),
  gpsLat: varchar("gpsLat", { length: 255 }),
  gpsLong: varchar("gpsLong", { length: 255 }),
  squareFootage: int("squareFootage"),
  waterBodyDistance: int("waterBodyDistance"),
  fertilizerSchedule: text("fertilizerSchedule"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Applications table
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  crewId: int("crewId"),
  userId: int("userId").notNull(),
  productName: varchar("productName", { length: 255 }),
  nitrogenPercent: int("nitrogenPercent"),
  applicationRate: int("applicationRate"),
  totalNitrogen: int("totalNitrogen"),
  weatherConditions: text("weatherConditions"),
  bufferZoneVerified: int("bufferZoneVerified"), // 1 = true, 0 = false
  gpsLat: varchar("gpsLat", { length: 255 }),
  gpsLong: varchar("gpsLong", { length: 255 }),
  photoUrl: text("photoUrl"),
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Reports table
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  companyId: int("companyId").notNull(),
  pdfUrl: text("pdfUrl"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * County Rules table
 */
export const countyRules = mysqlTable("countyRules", {
  id: int("id").autoincrement().primaryKey(),
  countyName: varchar("countyName", { length: 255 }).notNull().unique(),
  nitrogenLimitPer1000sqft: int("nitrogenLimitPer1000sqft"),
  blackoutStart: varchar("blackoutStart", { length: 255 }),
  blackoutEnd: varchar("blackoutEnd", { length: 255 }),
  bufferZoneFt: int("bufferZoneFt"),
  slowReleaseRequired: int("slowReleaseRequired"), // 1 = true, 0 = false
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CountyRule = typeof countyRules.$inferSelect;
export type InsertCountyRule = typeof countyRules.$inferInsert;

/**
 * Invites table
 */
export const invites = mysqlTable("invites", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  companyId: int("companyId").notNull(),
  role: mysqlEnum("role", ["owner", "manager", "crew"]).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;

/**
 * Subscription tracking table for RevenueCat integration
 * Stores subscription status, entitlements, and renewal information
 */
export const subscriptions = mysqlTable("subscriptions", {
  /** Unique subscription record ID */
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** RevenueCat customer ID */
  revenueCatCustomerId: varchar("revenueCatCustomerId", { length: 255 }).notNull().unique(),
  /** Subscription status: active, expired, cancelled */
  status: mysqlEnum("status", ["active", "expired", "cancelled", "pending"]).default("pending").notNull(),
  /** Entitlement ID (e.g., 'pro_access') */
  entitlementId: varchar("entitlementId", { length: 64 }).default("pro_access").notNull(),
  /** Product ID from the store */
  productId: varchar("productId", { length: 255 }),
  /** Subscription expiration date */
  expiresAt: timestamp("expiresAt"),
  /** Whether subscription will auto-renew */
  autoRenew: int("autoRenew").default(1).notNull(), // 1 = true, 0 = false
  /** Original transaction ID from the store */
  originalTransactionId: varchar("originalTransactionId", { length: 255 }),
  /** Latest transaction ID */
  latestTransactionId: varchar("latestTransactionId", { length: 255 }),
  /** Purchase date */
  purchasedAt: timestamp("purchasedAt"),
  /** Cancellation date */
  cancelledAt: timestamp("cancelledAt"),
  /** Last renewal date */
  lastRenewalAt: timestamp("lastRenewalAt"),
  /** Store platform: ios, android */
  platform: mysqlEnum("platform", ["ios", "android", "web"]),
  /** Subscription price in cents */
  priceInCents: int("priceInCents"),
  /** Currency code (e.g., 'USD') */
  currency: varchar("currency", { length: 3 }),
  /** Additional metadata stored as JSON string */
  metadata: text("metadata"),
  /** Record creation timestamp */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** Last update timestamp */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Subscription events table for audit logging
 * Tracks all subscription-related events for analytics and debugging
 */
export const subscriptionEvents = mysqlTable("subscriptionEvents", {
  /** Unique event ID */
  id: int("id").autoincrement().primaryKey(),
  /** Foreign key to subscriptions table */
  subscriptionId: int("subscriptionId").notNull(),
  /** Foreign key to users table */
  userId: int("userId").notNull(),
  /** Event type: purchase, renewal, cancellation, upgrade, downgrade, restoration */
  eventType: mysqlEnum("eventType", [
    "purchase",
    "renewal",
    "cancellation",
    "upgrade",
    "downgrade",
    "restoration",
    "expiration",
    "failure",
  ]).notNull(),
  /** Event status: success, failed, pending */
  eventStatus: mysqlEnum("eventStatus", ["success", "failed", "pending"]).default("success").notNull(),
  /** Previous subscription status (for state transitions) */
  previousStatus: varchar("previousStatus", { length: 64 }),
  /** New subscription status (for state transitions) */
  newStatus: varchar("newStatus", { length: 64 }),
  /** Amount involved in the event (in cents) */
  amountInCents: int("amountInCents"),
  /** Error message if event failed */
  errorMessage: text("errorMessage"),
  /** Additional event data as JSON string */
  metadata: text("metadata"),
  /** Record creation timestamp */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** Last update timestamp */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type InsertSubscriptionEvent = typeof subscriptionEvents.$inferInsert;
