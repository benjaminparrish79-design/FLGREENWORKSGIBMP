import { relations } from "drizzle-orm";
import { users, companies, crews, properties, applications, reports, countyRules, invites } from "./schema";

export const userRelations = relations(users, ({ one }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
}));

export const companyRelations = relations(companies, ({ many }) => ({
  users: many(users),
  crews: many(crews),
  properties: many(properties),
  reports: many(reports),
}));

export const crewRelations = relations(crews, ({ one, many }) => ({
  company: one(companies, {
    fields: [crews.companyId],
    references: [companies.id],
  }),
  applications: many(applications),
}));

export const propertyRelations = relations(properties, ({ one, many }) => ({
  company: one(companies, {
    fields: [properties.companyId],
    references: [companies.id],
  }),
  applications: many(applications),
}));

export const applicationRelations = relations(applications, ({ one }) => ({
  property: one(properties, {
    fields: [applications.propertyId],
    references: [properties.id],
  }),
  crew: one(crews, {
    fields: [applications.crewId],
    references: [crews.id],
  }),
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  report: one(reports, {
    fields: [applications.id],
    references: [reports.applicationId],
  }),
}));

export const reportRelations = relations(reports, ({ one }) => ({
  application: one(applications, {
    fields: [reports.applicationId],
    references: [applications.id],
  }),
  company: one(companies, {
    fields: [reports.companyId],
    references: [companies.id],
  }),
}));

export const inviteRelations = relations(invites, ({ one }) => ({
  company: one(companies, {
    fields: [invites.companyId],
    references: [companies.id],
  }),
}));
