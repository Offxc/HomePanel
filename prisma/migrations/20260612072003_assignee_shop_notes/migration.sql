-- AlterTable: add assigneeId to ShoppingItem
ALTER TABLE "ShoppingItem" ADD COLUMN "assigneeId" TEXT;

-- AlterTable: add assigneeId to Note
ALTER TABLE "Note" ADD COLUMN "assigneeId" TEXT;
