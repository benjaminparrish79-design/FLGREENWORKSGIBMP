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
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

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
});

export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type InsertSubscriptionEvent = typeof subscriptionEvents.$inferInsert;
