# Task: Implementação Base - Relógio de Ponto (Face ID, Biometria, Geofencing)

## 📝 Descrição
Criação de uma aplicação web premium para registro de ponto eletrônico com dupla verificação (Geolocalização + Reconhecimento Facial/Biometria/PIN), utilizando Supabase como backend.

## 🛠️ Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS (v4), Framer Motion.
- **Backend/DB**: Supabase (Auth, PostgreSQL, Storage, Edge Functions).
- **IA/ML**: `face-api.js` para reconhecimento facial no cliente.
- **Hardware**: Capacitor (opcional para biometria nativa em Android).

---

## 📅 Plano de Execução (4 Fases)

### Fase 1: Análise e Design de Dados (Analysis)
- [ ] Mapeamento detalhado das entidades: `usuarios`, `empresas`, `registros_ponto`, `escalas`.
- [ ] Definição da estratégia de segurança via RLS (Row Level Security).
- [ ] Modelagem do sistema de validação de geofencing (raio de 30 metros sugerido).

### Fase 2: Estrutura e Backend (Planning)
- [ ] Configuração do projeto Supabase.
- [ ] Implementação do schema SQL (DDL).
- [ ] Configuração do Storage para fotos de referência de face.
- [ ] Criação de `{task-slug}.md` para tarefas específicas de código.

### Fase 3: Frontend e UI/UX (Solutioning)
- [ ] Design System: Cores sofisticadas (Dark Mode, Glassmorphism), tipografia moderna.
- [ ] Desenvolvimento da tela de Login (Admin vs Usuário).
- [ ] **Core**: Desenvolvimento do Dashboard de Picagem (Modo Entrada/Saída inteligente).
- [ ] Integração do `face-api.js` com overlay de câmera futurista.

### Fase 4: Implementação e Testes (Implementation)
- [ ] Implementação lógica de Geofencing (usando Geolocation API).
- [ ] Fluxo de correção de estado (Entrada/Saída) pelo usuário.
- [ ] Painel Administrativo para visualização de logs e fotos.
- [ ] Testes de precisão de reconhecimento facial.

---

## 🎯 Critérios de Aceitação
- O sistema só permite o registro de ponto se estiver dentro do raio geográfico.
- O reconhecimento facial deve comparar com a foto original no Supabase.
- Interface deve ser responsiva (Smartphone, Tablet, Desktop).
- Usuário pode alternar manualmante entre Entrada/Saída se o sistema sugerir errado.
