-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('CONTA', 'CARTAO');

-- CreateEnum
CREATE TYPE "StatusFatura" AS ENUM ('ABERTA', 'FECHADA', 'PAGA');

-- AlterTable
ALTER TABLE "contas" ADD COLUMN     "fechamentoDia" INTEGER,
ADD COLUMN     "tipo" "TipoConta" NOT NULL DEFAULT 'CONTA',
ADD COLUMN     "vencimentoDia" INTEGER;

-- CreateTable
CREATE TABLE "faturas_cartao" (
    "id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "fechamento" TIMESTAMP(3) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusFatura" NOT NULL DEFAULT 'ABERTA',
    "usuarioId" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "totalPrevisto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPago" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faturas_cartao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "faturas_cartao_usuarioId_competencia_idx" ON "faturas_cartao"("usuarioId", "competencia");

-- CreateIndex
CREATE INDEX "faturas_cartao_contaId_idx" ON "faturas_cartao"("contaId");

-- CreateIndex
CREATE UNIQUE INDEX "faturas_cartao_contaId_competencia_key" ON "faturas_cartao"("contaId", "competencia");

-- AddForeignKey
ALTER TABLE "faturas_cartao" ADD CONSTRAINT "faturas_cartao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas_cartao" ADD CONSTRAINT "faturas_cartao_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
