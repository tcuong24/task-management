-- Add soft-delete metadata introduced after the initial production schema.
ALTER TABLE "projects"
ADD COLUMN "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN "deleted_by" UUID;

ALTER TABLE "tasks"
ADD COLUMN "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN "deleted_by" UUID;

CREATE INDEX "idx_projects_org_deleted"
ON "projects"("organization_id", "deleted_at");

CREATE INDEX "idx_tasks_project_deleted"
ON "tasks"("project_id", "deleted_at");

ALTER TABLE "projects"
ADD CONSTRAINT "projects_deleted_by_fkey"
FOREIGN KEY ("deleted_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
ADD CONSTRAINT "tasks_deleted_by_fkey"
FOREIGN KEY ("deleted_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
