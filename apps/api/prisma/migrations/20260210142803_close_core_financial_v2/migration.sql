-- CreateEnum
CREATE TYPE "StatusPlanoParcelamento" AS ENUM ('ATIVO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusParcela" AS ENUM ('PENDENTE', 'PAGA', 'CANCELADA');

-- DropForeignKey
ALTER TABLE "parcelas" DROP CONSTRAINT "parcelas_transacaoId_fkey";

-- AlterTable
ALTER TABLE "parcelas" ADD COLUMN     "status" "StatusParcela" NOT NULL DEFAULT 'PENDENTE',
ALTER COLUMN "transacaoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "planos_parcelamento" ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "canceladoMotivo" TEXT,
ADD COLUMN     "status" "StatusPlanoParcelamento" NOT NULL DEFAULT 'ATIVO';

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "transacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
