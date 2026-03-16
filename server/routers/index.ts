import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { applications, companies, crews, properties, users, countyRules, reports } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { checkCompliance } from "../compliance/engine";
import { getWeather } from "../../lib/weather";

export const appRouter = router({
  // ─── Company ───────────────────────────────────────────────────────────────
  createCompany: publicProcedure
    .input(z.object({ companyName: z.string(), ownerEmail: z.string() }))
    .mutation(async ({ input }) => {
      const [newCompany] = await db
        .insert(companies)
        .values({ companyName: input.companyName, ownerUserId: 0 })
        .returning();
      return newCompany;
    }),

  // ─── Auth ──────────────────────────────────────────────────────────────────
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (!user) {
        throw new Error("Invalid credentials");
      }
      // NOTE: Replace mock token with a real JWT in production
      return { token: "mock-jwt-token" };
    }),

  // ─── Properties ────────────────────────────────────────────────────────────
  createProperty: publicProcedure
    .input(
      z.object({
        companyId: z.number(),
        address: z.string(),
        squareFootage: z.number(),
        gpsLat: z.string(),
        gpsLong: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const [newProperty] = await db.insert(properties).values(input).returning();
      return newProperty;
    }),

  getCompanyProperties: publicProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(properties)
        .where(eq(properties.companyId, input.companyId));
    }),

  getPropertyNitrogenUsage: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input: _input }) => {
      // TODO: Aggregate from applications table
      return { yearLimit: 4, appliedAmount: 2.7, remainingAmount: 1.3 };
    }),

  // ─── Applications ──────────────────────────────────────────────────────────
  logFertilizerApplication: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        crewId: z.number(),
        userId: z.number(),
        productName: z.string(),
        nitrogenPercent: z.number(),
        applicationRate: z.number(),
        gpsLat: z.string(),
        gpsLong: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const totalNitrogen = Math.round((input.applicationRate * input.nitrogenPercent) / 100);
      const [newApplication] = await db
        .insert(applications)
        .values({ ...input, totalNitrogen })
        .returning();
      return newApplication;
    }),

  // ─── Compliance ────────────────────────────────────────────────────────────
  checkCompliance: publicProcedure
    .input(
      z.object({
        propertyId: z.number(),
        applicationRate: z.number(),
        nitrogenPercent: z.number(),
      })
    )
    .query(async ({ input }) => {
      const [property] = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      const [countyRule] = await db
        .select()
        .from(countyRules)
        .where(eq(countyRules.countyName, "MockCounty"))
        .limit(1);

      if (!property || !countyRule) {
        throw new Error("Property or County Rule not found");
      }

      const complianceData = {
        rainForecast: 0.1,
        waterDistance: property.waterBodyDistance ?? 100,
        nitrogenApplied: (input.applicationRate * input.nitrogenPercent) / 100,
        maxNitrogenAllowed: countyRule.nitrogenLimitPer1000sqft ?? 5,
        blackoutSeason: false,
      };

      return checkCompliance(complianceData);
    }),

  generateComplianceReport: publicProcedure
    .input(z.object({ applicationId: z.number() }))
    .mutation(async ({ input }) => {
      const [application] = await db
        .select()
        .from(applications)
        .where(eq(applications.id, input.applicationId))
        .limit(1);

      if (!application) {
        throw new Error("Application not found");
      }

      const pdfUrl = `/reports/${input.applicationId}.pdf`;

      await db
        .insert(reports)
        .values({ applicationId: input.applicationId, companyId: 0, pdfUrl })
        .returning();

      return { pdfUrl };
    }),

  // ─── Crews ─────────────────────────────────────────────────────────────────
  createCrew: publicProcedure
    .input(z.object({ companyId: z.number(), crewName: z.string(), employeeName: z.string() }))
    .mutation(async ({ input }) => {
      const [newCrew] = await db.insert(crews).values(input).returning();
      return newCrew;
    }),

  // ─── Weather ───────────────────────────────────────────────────────────────
  getWeatherCheck: publicProcedure
    .input(z.object({ lat: z.number(), lon: z.number() }))
    .query(async ({ input }) => {
      return getWeather(input.lat, input.lon);
    }),
});

export type AppRouter = typeof appRouter;
