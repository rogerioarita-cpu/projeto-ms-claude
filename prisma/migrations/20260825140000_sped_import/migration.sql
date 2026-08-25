-- CreateEnum
CREATE TYPE "sped_file_type" AS ENUM ('efd_icms_ipi', 'efd_contribuicoes');

-- CreateEnum
CREATE TYPE "sped_file_status" AS ENUM ('sucesso', 'aviso', 'erro');

-- CreateTable
CREATE TABLE "sped_files" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "type" "sped_file_type" NOT NULL,
    "status" "sped_file_status" NOT NULL DEFAULT 'sucesso',
    "fileName" TEXT NOT NULL,
    "fileSizeKb" INTEGER NOT NULL DEFAULT 0,
    "companyName" TEXT,
    "cnpj" TEXT,
    "ie" TEXT,
    "uf" TEXT,
    "periodStart" TEXT,
    "periodEnd" TEXT,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "warningsCount" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "extracted" JSONB,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sped_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sped_files_projectId_idx" ON "sped_files"("projectId");

-- CreateIndex
CREATE INDEX "sped_files_type_idx" ON "sped_files"("type");

-- AddForeignKey
ALTER TABLE "sped_files" ADD CONSTRAINT "sped_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sped_files" ADD CONSTRAINT "sped_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
