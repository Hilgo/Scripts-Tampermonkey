# 📜 Scripts Tampermonkey

Repositório com scripts personalizados para uso no Tampermonkey, focados em melhorar a usabilidade, navegação e produtividade em diferentes sistemas web.

![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Script-blue)
---

## 📦 Requisitos

Para utilizar os scripts, é necessário instalar o:

- Tampermonkey (extensão de navegador)


Disponível para:
- Chrome
- Edge
- Firefox

---

## 📂 Estrutura do Repositório
```
Scripts Tampermonkey/
|-- README.md
|-- Educação Profissional/
|---- melhorias_navegacao.user.js
|-- Sala do Futuro/
|---- lançar_notas_planilha.user.js
```
---

## 🎯 Script: Melhorias de Navegação - Educação Profissional

Script voltado para o ambiente Moodle da Educação Profissional do estado de São Paulo.

### ✨ Funcionalidades

- 📝 Destaque visual nos **Registros da Aula**
- 📌 Breadcrumb fixo com transparência e melhor visualização
- 🧭 Correção de breadcrumb (caminho dos links do site) em páginas de relatório
- 📋 Botão para listar todos os links de registros da disciplina
- 📋 Copiar automaticamente os links dos registros
- 📥 Botão flutuante para exportação rápida de relatório de conclusão de atividades (CSV)
- ⚠️ Notificação de **atividades que precisam ser avaliadas** na página do registro
- 🚀 Acesso rápido ao botão **"Avaliar"**

---

## 🎯 Script: Lançamento de Notas por Planilha - Sala do Futuro

Script para automação de lançamento de notas de estudantes no sistema "Sala do Futuro" da educação de São Paulo, permite lançarmos várias notas de uma vez seguindo uma tabela com nomes dos estudantes e as notas.

### ✨ Funcionalidades

- ➕ Adiciona um botão "Lançar notas por planilha" na página de lançamento de avaliações
- 📋 Abre uma janela para colar dados de uma planilha (Excel ou similar)
- 📊 Processa a tabela colada (primeira coluna: nome do estudante; segunda coluna: nota)
- ✅ Aplica as notas automaticamente nos campos correspondentes da tabela do sistema
- ⚠️ Destaque visual nos campos preenchidos (borda verde)
- 🔍 **Validação: verifique os valores antes de salvar**

### 📋 Como Usar

1. Na página de lançamento de avaliações (`https://saladofuturoprofessor.educacao.sp.gov.br/diario-classe__avalicao___lancamentoDetalhes`), clique no botão "Lançar notas por planilha".
2. Cole a tabela no campo indicado (copie de uma planilha com nomes na coluna 1 e notas na coluna 2).
3. Clique em "Aplicar Notas" para preencher os campos automaticamente.

**Atenção**: Sempre valide os valores inseridos para evitar erros.

---

## 🚀 Instalação

### Método 1 (Recomendado)

1. Acesse o arquivo no GitHub
2. Clique em **[Raw](https://github.com/Hilgo/Scripts-Tampermonkey/raw/refs/heads/main/Sala%20do%20Futuro/lan%C3%A7ar_notas_planilha.user.js)** para o script Sala do Futuro Ou clique em **[Raw](https://github.com/Hilgo/Scripts-Tampermonkey/raw/refs/heads/main/Educa%C3%A7%C3%A3o%20Profissional/melhorias_navegacao.user.js)** para o script da melhoria de navegação.
3. O Tampermonkey abrirá automaticamente
4. Clique em **Instalar**

---

### Método 2 (manual)

1. Abra o Tampermonkey
2. Clique em **Criar novo script**
3. Cole o conteúdo do arquivo `melhorias_navegacao.user.js` ou `lançar_notas_planilha.user.js`
4. Salve

---

## 🔄 Atualizações

Se configurado com `@updateURL` e `@downloadURL`, o script poderá ser atualizado automaticamente via Tampermonkey.

---

## 📌 Observações

- Scripts desenvolvidos para uso pessoal e educacional
- Podem sofrer alterações conforme mudanças nos ambientes
- Compatíveis com os portais:
  - https://educacaoprofissional.educacao.sp.gov.br/
  - https://saladofuturoprofessor.educacao.sp.gov.br/

---

## 👨‍💻 Autor

Lucas Palma Stabile

---

## 📄 Licença

Uso livre para fins educacionais.