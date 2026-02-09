/*
  Warnings:

  - The values [CONTA] on the enum `TipoConta` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrigemTransacao" AS ENUM ('MANUAL', 'PARCELA', 'IMPORTACAO', 'ESTORNO', 'AJUSTE_SALDO');

-- AlterEnum
BEGIN;
CREATE TYPE "TipoConta_new" AS ENUM ('CARTEIRA', 'CONTA_CORRENTE', 'CARTAO');
ALTER TABLE "public"."contas" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "contas" ALTER COLUMN "tipo" TYPE "TipoConta_new" USING ("tipo"::text::"TipoConta_new");
ALTER TYPE "TipoConta" RENAME TO "TipoConta_old";
ALTER TYPE "TipoConta_new" RENAME TO "TipoConta";
DROP TYPE "public"."TipoConta_old";
ALTER TABLE "contas" ALTER COLUMN "tipo" SET DEFAULT 'CARTEIRA';
COMMIT;

-- DropIndex
DROP INDEX "faturas_cartao_contaId_idx";

-- DropIndex
DROP INDEX "faturas_cartao_usuarioId_competencia_idx";

-- AlterTable
ALTER TABLE "contas" ALTER COLUMN "tipo" SET DEFAULT 'CARTEIRA';

-- AlterTable
ALTER TABLE "transacoes" ADD COLUMN     "estornadaEm" TIMESTAMP(3),
ADD COLUMN     "faturaCartaoId" TEXT,
ADD COLUMN     "origem" "OrigemTransacao" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "transacaoOriginalId" TEXT;

-- CreateTable
CREATE TABLE "ajustes_saldo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "motivo" TEXT NOT NULL,
    "referencia" TEXT,
    "transacaoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajustes_saldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhes" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ajustes_saldo_transacaoId_key" ON "ajustes_saldo"("transacaoId");

-- CreateIndex
CREATE INDEX "ajustes_saldo_usuarioId_idx" ON "ajustes_saldo"("usuarioId");

-- CreateIndex
CREATE INDEX "ajustes_saldo_contaId_idx" ON "ajustes_saldo"("contaId");

-- CreateIndex
CREATE INDEX "log_auditoria_usuarioId_idx" ON "log_auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "log_auditoria_acao_idx" ON "log_auditoria"("acao");

-- CreateIndex
CREATE INDEX "faturas_cartao_usuarioId_idx" ON "faturas_cartao"("usuarioId");

-- CreateIndex
CREATE INDEX "faturas_cartao_contaId_competencia_idx" ON "faturas_cartao"("contaId", "competencia");

-- CreateIndex
CREATE INDEX "transacoes_transacaoOriginalId_idx" ON "transacoes"("transacaoOriginalId");

-- CreateIndex
CREATE INDEX "transacoes_faturaCartaoId_idx" ON "transacoes"("faturaCartaoId");

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_transacaoOriginalId_fkey" FOREIGN KEY ("transacaoOriginalId") REFERENCES "transacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_faturaCartaoId_fkey" FOREIGN KEY ("faturaCartaoId") REFERENCES "faturas_cartao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_saldo" ADD CONSTRAINT "ajustes_saldo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_saldo" ADD CONSTRAINT "ajustes_saldo_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_saldo" ADD CONSTRAINT "ajustes_saldo_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "transacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
