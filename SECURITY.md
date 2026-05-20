# Política de Segurança

## Como reportar uma vulnerabilidade

Se você descobriu uma vulnerabilidade neste projeto, **por favor não abra uma issue pública**. Use um dos canais privados abaixo:

1. **GitHub Security Advisories** (recomendado): abra um relatório privado em
   [github.com/virtcaio/organizacao-financeira/security/advisories/new](https://github.com/virtcaio/organizacao-financeira/security/advisories/new).
2. **Email**: como alternativa, envie um e-mail descrevendo o problema. Pegue o contato do mantenedor no perfil [@virtcaio](https://github.com/virtcaio).

Tente incluir:

- Descrição clara da vulnerabilidade
- Passos pra reproduzir
- Versão / commit afetado
- Impacto estimado (quem é afetado, em que escala)
- Sugestão de correção, se tiver

## Escopo

Estão **dentro do escopo**:

- Bypass de autenticação (Auth.js, sessão JWT)
- Bypass de RLS / acesso cruzado entre usuários no Supabase
- Vazamento da chave Anthropic do usuário através do servidor ou logs
- XSS via output da IA renderizado sem sanitização
- Injeção SQL via inputs não validados
- CSRF em Server Actions / Route Handlers
- Falhas de autorização em endpoints `/api/*`

**Fora do escopo**:

- Vulnerabilidades em dependências com fix upstream ainda pendente (ex.: aviso atual de `postcss` moderate)
- Uso indevido por self-hosters (você é responsável pela sua instância)
- Engenharia social contra usuários individuais
- Problemas que dependem de comprometimento prévio da máquina do usuário ou do navegador

## Tempo de resposta

Este é um projeto pessoal mantido em melhor esforço. Esperamos:

- Acusar recebimento em até 7 dias
- Investigar e responder com posicionamento em até 30 dias
- Coordenar divulgação responsável quando aplicável

## Boas práticas pra quem hospeda a própria instância

Como é um projeto **self-hosted**, parte da segurança depende de você:

- Use uma senha forte no Supabase e rotacione periodicamente
- Habilite RLS em todas as tabelas (já vem habilitado pelo `migrations/`)
- Use `service_role` apenas no servidor (variável `SUPABASE_SERVICE_ROLE_KEY`) — nunca no client
- Não exponha o `NEXTAUTH_SECRET` e mantenha pelo menos 32 bytes
- Mantenha o Next.js e dependências atualizadas (`pnpm update`)
- Avalie ativar 2FA na sua conta Anthropic, GitHub e Vercel

## Modelo de ameaça

O projeto guarda **dados financeiros pessoais**. O modelo de ameaça assume:

- O servidor (Vercel + Supabase) é confiável pra fins de armazenamento
- A chave Anthropic do usuário **nunca é persistida** no banco — só passa pelo header `x-anthropic-key` em cada chamada e é descartada
- PDFs/comprovantes enviados pra IA passam pela Anthropic (zero data retention é configurável na sua conta Anthropic)
- O modelo de IA pode alucinar valores em transações importadas — sempre revise antes de salvar
