-- AlterTable
ALTER TABLE "Watchlist" ADD COLUMN     "lastViewedAt" TIMESTAMP(3),
ADD COLUMN     "viewLens" JSONB;
