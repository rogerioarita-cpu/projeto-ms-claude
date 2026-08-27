/*
  Warnings:

  - You are about to drop the `sped_files` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sped_files" DROP CONSTRAINT "sped_files_projectId_fkey";

-- DropForeignKey
ALTER TABLE "sped_files" DROP CONSTRAINT "sped_files_uploadedById_fkey";

-- DropTable
DROP TABLE "sped_files";

-- DropEnum
DROP TYPE "sped_file_status";

-- DropEnum
DROP TYPE "sped_file_type";
