export function auditLog(opts: {
  usuarioId?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  detalhes?: any;
  meta?: { ip?: string; userAgent?: string } | null;
}) {
  return {
    usuarioId: opts.usuarioId ?? null,
    acao: opts.acao,
    entidade: opts.entidade,
    entidadeId: opts.entidadeId ?? null,
    detalhes: opts.detalhes ?? null,
    ip: opts.meta?.ip ?? null,
    userAgent: opts.meta?.userAgent ?? null,
  };
}
