-- CreateTable
CREATE TABLE "orcamentos" (
    "id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "limite" DECIMAL(65,30) NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_orcamento" (
    "id" TEXT NOT NULL,
    "percentual" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "orcamentoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orcamentos_usuarioId_competencia_idx" ON "orcamentos"("usuarioId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_usuarioId_categoriaId_competencia_key" ON "orcamentos"("usuarioId", "categoriaId", "competencia");

-- CreateIndex
CREATE INDEX "alertas_orcamento_orcamentoId_idx" ON "alertas_orcamento"("orcamentoId");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_orcamento_orcamentoId_percentual_key" ON "alertas_orcamento"("orcamentoId", "percentual");

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_orcamento" ADD CONSTRAINT "alertas_orcamento_orcamentoId_fkey" FOREIGN KEY ("orcamentoId") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
