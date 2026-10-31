# Ouvidoria Municipal — homologação

Nova área em `/ouvidoria/`, preservando o canal oficial W3 e o e-SIC.

- Reclamação, denúncia, solicitação de serviço, sugestão e elogio.
- Secretaria do catálogo ativo ou Outros com explicação obrigatória.
- Identificação pela mesma conta do e-SIC nos tipos regulares.
- Denúncia sem conta vinculada, enviada com cliente separado sem sessão; consulta por protocolo e chave aleatória de 256 bits. Somente o hash da chave é armazenado. A chave não é gravada pelo aplicativo em URL ou armazenamento local e não pode ser recuperada pela equipe. O provedor de infraestrutura pode manter registros técnicos; não prometer anonimato absoluto.
- Fila administrativa exclusiva dos administradores ativos, filtros, paginação de 25 registros e indicadores de manifestações em aberto por secretaria.
- Encaminhamento, resposta, arquivamento e histórico auditado. Não há acesso direto de escrita para cidadãos nem leitura direta para visitantes.
- Limitação global de volume para os endpoints públicos; não substitui CAPTCHA ou proteção contra abuso. Avaliar proteção adicional e rotinas de retenção antes de abertura oficial.

Validação: 46 testes Node incluindo regressões do e-SIC e do service worker; teste transacional no Supabase real para denúncia anônima, chave incorreta, isolamento entre cidadãos, permissões, encaminhamento, resposta e histórico, revertendo todas as fixtures. Conferência de registro e consulta no navegador com dados fictícios.

Prazos, autoridades específicas, anexos, avisos por e-mail e migração do fornecedor antigo não estão incluídos nesta primeira etapa. A operação oficial exige validar responsabilidades e fluxo com a Ouvidoria. Não substituir automaticamente o canal existente.
