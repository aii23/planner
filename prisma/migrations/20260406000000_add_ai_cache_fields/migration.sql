-- AlterTable: add AI review cache to weekly_plans
ALTER TABLE "weekly_plans" ADD COLUMN "weekly_review" JSONB;

-- AlterTable: add daily briefing cache to daily_plans
ALTER TABLE "daily_plans" ADD COLUMN "daily_briefing" JSONB;
