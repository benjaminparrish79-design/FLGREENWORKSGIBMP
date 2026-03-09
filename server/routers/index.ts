import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { applications, companies, crews, properties, users, countyRules, invites } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { checkCompliance } from "../compliance/engine";
import { getWeather } from "../../lib/weather";

export const appRouter = router({
  // Company Endpoints
  createCompany: publicProcedure
    .input(z.object({ companyName: z.string(), ownerEmail: z.string() }))
    .mutation(async ({ input }) => {
      const newCompany = await db.insert(companies).values({ companyName: input.companyName, ownerUserId: 0 }).returning().get(); // ownerUserId will be updated after user creation
      return newCompany;
    }),

  // Auth Endpoints
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      // Placeholder for actual authentication logic
      // In a real app, you'd verify password hash and return a JWT
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();
      if (!user) {
        throw new Error("Invalid credentials");
      }
      return { token: "mock-jwt-token" };
    }),

  // Property Endpoints
  createProperty: publicProcedure
    .input(z.object({
      companyId: z.number(),
      address: z.string(),
      squareFootage: z.number(),
      gpsLat: z.string(),
      gpsLong: z.string(),
    }))
    .mutation(async ({ input }) => {
      const newProperty = await db.insert(properties).values(input).returning().get();
      // Backend automatically loads county fertilizer rules (placeholder)
      return newProperty;
    }),

  getCompanyProperties: publicProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      return db.select().from(properties).where(eq(properties.companyId, input.companyId)).all();
    }),

  getPropertyNitrogenUsage: publicProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      // Placeholder for actual nitrogen usage calculation
      return { yearLimit: 4, appliedAmount: 2.7, remainingAmount: 1.3 };
    }),

  // Application Endpoints
  logFertilizerApplication: publicProcedure
    .input(z.object({
      propertyId: z.number(),
      crewId: z.number(),
      userId: z.number(),
      productName: z.string(),
      nitrogenPercent: z.number(),
      applicationRate: z.number(),
      gpsLat: z.string(),
      gpsLong: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Placeholder for total nitrogen calculation and compliance check
      const totalNitrogen = (input.applicationRate * input.nitrogenPercent) / 100; // Simplified calculation
      const newApplication = await db.insert(applications).values({ ...input, totalNitrogen }).returning().get();
      return newApplication;
    }),

  // Compliance Endpoints
  checkCompliance: publicProcedure
    .input(z.object({
      propertyId: z.number(),
      applicationRate: z.number(),
      nitrogenPercent: z.number(),
    }))
    .query(async ({ input }) => {
      // Placeholder for fetching actual data for compliance check
      const property = await db.select().from(properties).where(eq(properties.id, input.propertyId)).get();
      const countyRule = await db.select().from(countyRules).where(eq(countyRules.countyName, "MockCounty")).get(); // Mock county

      if (!property || !countyRule) {
        throw new Error("Property or County Rule not found");
      }

      const complianceData = {
        rainForecast: 0.1, // Mock data
        waterDistance: property.waterBodyDistance || 100, // Mock data
        nitrogenApplied: (input.applicationRate * input.nitrogenPercent) / 100, // Simplified
        maxNitrogenAllowed: countyRule.nitrogenLimitPer1000sqft || 5, // Mock data
        blackoutSeason: false, // Mock data
      };
      return checkCompliance(complianceData);
    }),

  generateComplianceReport: publicProcedure
    .input(z.object({ applicationId: z.number() }))
    .mutation(async ({ input }) => {
      // Placeholder for PDF generation and storage
      const application = await db.select().from(applications).where(eq(applications.id, input.applicationId)).get();
      if (!application) {
        throw new Error("Application not found");
      }
      const pdfUrl = `/reports/${input.applicationId}.pdf`; // Mock URL
      await db.insert(reports).values({ applicationId: input.applicationId, companyId: 0, pdfUrl }).returning().get(); // companyId will be updated
      return { pdfUrl };
    }),

  // Crew Endpoints
  createCrew: publicProcedure
    .input(z.object({ companyId: z.number(), crewName: z.string(), employeeName: z.string() }))
    .mutation(async ({ input }) => {
      const newCrew = await db.insert(crews).values(input).returning().get();
      return newCrew;
    }),

  // Weather Endpoints
  getWeatherCheck: publicProcedure
    .input(z.object({ lat: z.number(), lon: z.number() }))
    .query(async ({ input }) => {
      return getWeather(input.lat, input.lon);
    }),
});

export type AppRouter = typeof appRouter;
