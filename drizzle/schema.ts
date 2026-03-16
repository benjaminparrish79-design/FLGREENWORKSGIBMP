import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 */
export const roleEnum = pgEnum("role", ["owner", "manager", "crew", "admin"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "expired",
  "cancelled",
  "pending",
]);
export const platformEnum = pgEnum("platform", ["ios", "android", "web"]);
export const eventTypeEnum = pgEnum("event_type", [
  "purchase",
  "renewal",
  "cancellation",
  "upgrade",
  "downgrade",
  "restoration",
  "expiration",
  "failure",
]);
export const eventStatusEnum = pgEnum("event_status", ["success", "failed", "pending"]);
export const inviteStatusEnum = pgEnum("invite_status", ["pending", "accepted", "declined"]);
export const inviteRoleEnum = pgEnum("invite_role", ["owner", "manager", "crew"]);

export const users = pgTable("users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  companyId: integer("companyId").notNull(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("crew").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const companies = pgTable("companies", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  ownerUserId: integer("ownerUserId").notNull(),
  subscriptionPlan: varchar("subscriptionPlan", { length: 64 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export const crews = pgTable("crews", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  companyId: integer("companyId").notNull(),
  crewName: varchar("crewName", { length: 255 }).notNull(),
  employeeName: varchar("employeeName", { length: 255 }),
  vehicleId: varchar("vehicleId", { length: 255 }),
  deviceId: varchar("deviceId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Crew = typeof crews.$inferSelect;
export type InsertCrew = typeof crews.$inferInsert;

export const properties = pgTable("properties", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  companyId: integer("companyId").notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 255 }),
  zip: varchar("zip", { length: 10 }),
  gpsLat: varchar("gpsLat", { length: 255 }),
  gpsLong: varchar("gpsLong", { length: 255 }),
  squareFootage: integer("squareFootage"),
  waterBodyDistance: integer("waterBodyDistance"),
  fertilizerSchedule: text("fertilizerSchedule"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

export const applications = pgTable("applications", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  propertyId: integer("propertyId").notNull(),
  crewId: integer("crewId"),
  userId: integer("userId").notNull(),
  productName: varchar("productName", { length: 255 }),
  nitrogenPercent: integer("nitrogenPercent"),
  applicationRate: integer("applicationRate"),
  totalNitrogen: integer("totalNitrogen"),
  weatherConditions: text("weatherConditions"),
  bufferZoneVerified: boolean("bufferZoneVerified").default(false),
  gpsLat: varchar("gpsLat", { length: 255 }),
  gpsLong: varchar("gpsLong", { length: 255 }),
  photoUrl: text("photoUrl"),
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

export const reports = pgTable("reports", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  applicationId: integer("applicationId").notNull(),
  companyId: integer("companyId").notNull(),
  pdfUrl: text("pdfUrl"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

export const countyRules = pgTable("countyRules", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  countyName: varchar("countyName", { length: 255 }).notNull().unique(),
  nitrogenLimitPer1000sqft: integer("nitrogenLimitPer1000sqft"),
  blackoutStart: varchar("blackoutStart", { length: 255 }),
  blackoutEnd: varchar("blackoutEnd", { length: 255 }),
  bufferZoneFt: integer("bufferZoneFt"),
  slowReleaseRequired: boolean("slowReleaseRequired").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CountyRule = typeof countyRules.$inferSelect;
export type InsertCountyRule = typeof countyRules.$inferInsert;

export const invites = pgTable("invites", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  companyId: integer("companyId").notNull(),
  role: inviteRoleEnum("role").notNull(),
  status: inviteStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;

export const subscriptions = pgTable("subscriptions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull(),
  revenueCatCustomerId: varchar("revenueCatCustomerId", { length: 255 }).notNull().unique(),
  status: subscriptionStatusEnum("status").default("pending").notNull(),
  entitlementId: varchar("entitlementId", { length: 64 }).default("pro_access").notNull(),
  productId: varchar("productId", { length: 255 }),
  expiresAt: timestamp("expiresAt"),
  autoRenew: boolean("autoRenew").default(true).notNull(),
  originalTransactionId: varchar("originalTransactionId", { length: 255 }),
  latestTransactionId: varchar("latestTransactionId", { length: 255 }),
  purchasedAt: timestamp("purchasedAt"),
  cancelledAt: timestamp("cancelledAt"),
  lastRenewalAt: timestamp("lastRenewalAt"),
  platform: platformEnum("platform"),
  priceInCents: integer("priceInCents"),
  currency: varchar("currency", { length: 3 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const subscriptionEvents = pgTable("subscriptionEvents", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  subscriptionId: integer("subscriptionId").notNull(),
  userId: integer("userId").notNull(),
  eventType: eventTypeEnum("eventType").notNull(),
  eventStatus: eventStatusEnum("eventStatus").default("success").notNull(),
  previousStatus: varchar("previousStatus", { length: 64 }),
  newStatus: varchar("newStatus", { length: 64 }),
  amountInCents: integer("amountInCents"),
  errorMessage: text("errorMessage"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type InsertSubscriptionEvent = typeof subscriptionEvents.$inferInsert;
