-- CreateTable
CREATE TABLE "planos_parcelamento" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "numeroParcelas" INTEGER NOT NULL,
    "primeiraCompetencia" TEXT NOT NULL,
    "metodoPagamento" TEXT,
    "estabelecimento" TEXT,
    "usuarioId" TEXT NOT NULL,
    "contaId" TEXT,
    "categoriaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_parcelamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "competencia" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "vencimento" TIMESTAMP(3),
    "planoId" TEXT NOT NULL,
    "transacaoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planos_parcelamento_usuarioId_idx" ON "planos_parcelamento"("usuarioId");

-- CreateIndex
CREATE INDEX "planos_parcelamento_contaId_idx" ON "planos_parcelamento"("contaId");

-- CreateIndex
CREATE INDEX "planos_parcelamento_categoriaId_idx" ON "planos_parcelamento"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "parcelas_transacaoId_key" ON "parcelas"("transacaoId");

-- CreateIndex
CREATE INDEX "parcelas_planoId_idx" ON "parcelas"("planoId");

-- CreateIndex
CREATE INDEX "parcelas_competencia_idx" ON "parcelas"("competencia");

-- CreateIndex
CREATE UNIQUE INDEX "parcelas_planoId_numero_key" ON "parcelas"("planoId", "numero");

-- AddForeignKey
ALTER TABLE "planos_parcelamento" ADD CONSTRAINT "planos_parcelamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_parcelamento" ADD CONSTRAINT "planos_parcelamento_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_parcelamento" ADD CONSTRAINT "planos_parcelamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_parcelamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_transacaoId_fkey" FOREIGN KEY ("transacaoId") REFERENCES "transacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
