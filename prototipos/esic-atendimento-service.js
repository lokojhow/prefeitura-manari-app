/**
 * Serviço de atendimento e-SIC do banco Manari conectado.
 * Fail-closed: só habilitar na homologação após publicar RPCs auditadas.
 * O navegador nunca faz SELECT/UPDATE direto em citizen_requests de terceiros.
 */
export function criarAtendimentoEsic(supabase, { homologado = false } = {}) {
  if (!supabase?.rpc || !supabase?.auth?.getUser) throw new Error('Cliente autenticado ausente.');
  async function executar(nome, parametros = {}) {
    if (!homologado) throw new Error('Operação bloqueada até homologação do e-SIC.');
    const { data: { user } = {}, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) throw new Error('Autenticação necessária.');
    const { data, error } = await supabase.rpc(nome, parametros);
    if (error) throw new Error('Operação não autorizada ou temporariamente indisponível.');
    return data;
  }
  function validarId(id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id)))
      throw new Error('Identificador inválido.');
    return id;
  }
  return {
    async fila() {
      const resultado = await executar('esic_portal_fila');
      return Array.isArray(resultado) ? resultado : [];
    },
    async encaminhar(id, departamento) {
      validarId(id);
      if (!departamento || typeof departamento !== 'string') throw new Error('Departamento obrigatório.');
      return executar('esic_admin_encaminhar', {p_id:id,p_department:departamento});
    },
    async responder(id, resposta) {
      validarId(id);
      const texto=String(resposta??'').trim();
      if (texto.length < 10 || texto.length > 15000) throw new Error('Resposta deve ter entre 10 e 15.000 caracteres.');
      return executar('esic_admin_responder', {p_id:id,p_resposta:texto});
    }
  };
}
