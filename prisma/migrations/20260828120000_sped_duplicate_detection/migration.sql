-- AlterEnum: adiciona o status "duplicado" (arquivo já importado anteriormente)
ALTER TYPE "sped_file_status" ADD VALUE 'duplicado';

-- AlterTable: referência ao arquivo original quando status = 'duplicado'
ALTER TABLE "sped_files" ADD COLUMN "duplicateOfId" TEXT;
