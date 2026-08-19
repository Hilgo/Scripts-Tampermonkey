// ==UserScript==
// @name         Educação Profissional – Melhorias de Navegação
// @namespace    https://educacaoprofissional.educacao.sp.gov.br/userscripts
// @version      2.0
// @description  Userscript para melhorar a navegação no Moodle da Educação Profissional. Destaca registros de aula, fixa o breadcrumb com transparência, corrige breadcrumbs de relatórios, adiciona um botão flutuante que coleta e permite copiar todos os links de registros da disciplina atual e cria um botão de atalho fixo para exportar relatórios de conclusões de atividades em CSV.
// @author       Hilgo
// @match        https://educacaoprofissional.educacao.sp.gov.br/*
// @icon         https://educacaoprofissional.educacao.sp.gov.br/pluginfile.php/1/theme_boost_union/favicon/64x64/1774361098/favicon.ico
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @require  https://gist.github.com/raw/2625891/waitForKeyElements.js
// @updateURL   https://github.com/Hilgo/Scripts-Tampermonkey/raw/refs/heads/main/Educa%C3%A7%C3%A3o%20Profissional/melhorias_navegacao.user.js
// @downloadURL https://github.com/Hilgo/Scripts-Tampermonkey/raw/refs/heads/main/Educa%C3%A7%C3%A3o%20Profissional/melhorias_navegacao.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let breadcrumbFixed = true;
    let breadcrumbOriginalParent = null;
    let breadcrumbOriginalNextSibling = null;
    let breadcrumbContainer = null;

    const SESSION_KEY_BREADCRUMB_FIXED = 'eduprof_breadcrumbFixed';
    const SESSION_KEY_BOTOES_OCULTOS = 'eduprof_botoesRelatorioOcultos';

    let botaoLinksRegistros = null;
    let botaoLinksRelatorios = null;
    let botaoRelatorioConclusao = null;
    let botaoExportarCSV = null;
    let botoesRelatorioOcultos = false;

    function aplicarFadeEmBotao(botao) {
        botao.style.opacity = "0.65";
        botao.style.transition = "opacity 0.2s ease";

        botao.addEventListener("mouseenter", () => {
            botao.style.opacity = "1";
        });

        botao.addEventListener("mouseleave", () => {
            botao.style.opacity = "0.65";
        });
    }

    function carregarEstadoSession() {
        const breadcrumbState = sessionStorage.getItem(SESSION_KEY_BREADCRUMB_FIXED);
        if (breadcrumbState !== null) {
            breadcrumbFixed = breadcrumbState === 'true';
        }

        const botoesState = sessionStorage.getItem(SESSION_KEY_BOTOES_OCULTOS);
        if (botoesState !== null) {
            botoesRelatorioOcultos = botoesState === 'true';
        }
    }

    function salvarEstadoBreadcrumb() {
        sessionStorage.setItem(SESSION_KEY_BREADCRUMB_FIXED, String(breadcrumbFixed));
    }

    function salvarEstadoBotoes() {
        sessionStorage.setItem(SESSION_KEY_BOTOES_OCULTOS, String(botoesRelatorioOcultos));
    }

    /* --------------------------------------------------
   FUNÇÃO PARA MOSTRAR NOTIFICAÇÕES DE REGISTROS A SEREM AVALIADOS
-------------------------------------------------- */
    function mostrarNotificacaoAvaliacoes(qtd, linkAvaliar) {

        const box = document.createElement("div");

        box.style.position = "fixed";
        box.style.top = "75px";
        box.style.right = "20px";
        box.style.zIndex = "10000";

        box.style.background = "rgba(44, 123, 229, 0.9)";
        box.style.color = "white";
        box.style.padding = "12px 16px";
        box.style.borderRadius = "8px";

        box.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
        box.style.fontSize = "14px";
        box.style.maxWidth = "280px";

        // centralização
        box.style.display = "flex";
        box.style.flexDirection = "column";
        box.style.alignItems = "center";
        box.style.textAlign = "center";

        box.style.transition = "opacity 0.3s ease";

        const texto = document.createElement("div");
        texto.innerHTML = "<strong>⚠️ Avaliações pendentes</strong><br>" +
            qtd + " registro(s) precisam ser avaliados";

        box.appendChild(texto);

        if (linkAvaliar) {

            const botao = document.createElement("a");

            botao.href = linkAvaliar;
            botao.textContent = "Avaliar agora";

            botao.style.display = "inline-block";
            botao.style.marginTop = "10px";
            botao.style.padding = "6px 12px";

            botao.style.background = "white";
            botao.style.color = "#2c7be5";
            botao.style.borderRadius = "4px";
            botao.style.textDecoration = "none";
            botao.style.fontWeight = "bold";

            box.appendChild(botao);
        }

        const fechar = document.createElement("div");
        fechar.textContent = "✖";

        fechar.style.position = "absolute";
        fechar.style.top = "5px";
        fechar.style.right = "8px";
        fechar.style.cursor = "pointer";

        fechar.addEventListener("click", () => {
            box.remove();
        });

        box.appendChild(fechar);

        document.body.appendChild(box);

        setTimeout(() => {
            box.style.opacity = "0.7";
        }, 4000);
    }

    /* --------------------------------------------------
   FUNÇÃO PARA VERIFICAR SE EXISTEM REGISTROS A SEREM VERIFICADOS
-------------------------------------------------- */
    function verificarAvaliacoesPendentes() {

        const linhas = document.querySelectorAll("table.generaltable tr");

        let quantidade = 0;

        linhas.forEach(linha => {

            const th = linha.querySelector("th");
            const td = linha.querySelector("td");

            if (!th || !td) return;

            const titulo = th.textContent.trim();

            if (titulo.includes("Precisa ser avaliado")) {

                quantidade = parseInt(td.textContent.trim()) || 0;

            }

        });

        if (quantidade > 0) {

            const botaoAvaliar = document.querySelector('a[href*="action=grader"]');

            mostrarNotificacaoAvaliacoes(quantidade, botaoAvaliar?.href);
        }

    }

 /* --------------------------------------------------
   OBTÉM O LINK DA EXPORTAÇÃO EM CSV
-------------------------------------------------- */
    function obterLinkExportacaoCSV() {

        const container = document.querySelector(".progress-actions");

        if (!container) return null;

        const links = container.querySelectorAll("a");

        for (const link of links) {

            if (link.href.includes("format=excelcsv")) {
                return link.href;
            }

        }

        return null;

    }

function criarLinksRelatorioCards() {
    if (!window.location.pathname.endsWith('/my/courses.php')) return;
    const cards = document.querySelectorAll('.card.course-card');
    
    if (!cards.length) return;

    function extrairNomeDoCard(card) {
        // tenta aria-label do link
        const link = card.querySelector('a.aalink.coursename');
        if (link) {
            const aria = link.getAttribute('aria-label');
            if (aria) return limparNomeDisciplinaParaExibir(aria);
        }

        // tenta elementos .multiline .sr-only dentro do card-body
        const sr = card.querySelector('.card-body .multiline .sr-only') || card.querySelector('.card-body .sr-only') || card.querySelector('.sr-only');
        if (sr && sr.textContent) return limparNomeDisciplinaParaExibir(sr.textContent.trim());

        // tenta extrair do próprio título/link, mas evitando textContent bruto
        if (link) {
            // procurar spans visíveis que contenham o título
            const visible = link.querySelector('span')?.textContent || link.textContent;
            if (visible) return limparNomeDisciplinaParaExibir(visible.trim());
        }

        // fallback: todo card text
        const cardText = card.textContent || '';
        return limparNomeDisciplinaParaExibir(cardText.trim());
    }

    cards.forEach(card => {
        const courseLink = card.querySelector('a.aalink.coursename');
        if (!courseLink || courseLink.dataset.relatorioLinkAdded) return;

        const nomeExtraido = extrairNomeDoCard(card) || '';
        const textoNormalizado = nomeExtraido.trim();
        if (/Árvore de Materiais|Minha Biblioteca/i.test(textoNormalizado)) return;

        const href = courseLink.href || '';
        const match = href.match(/[?&]id=(\d+)/);
        if (!match) return;

        const courseId = match[1];
        const relatorioUrl = `https://educacaoprofissional.educacao.sp.gov.br/report/progress/index.php?course=${courseId}`;

        const relatorioLink = document.createElement('a');
        relatorioLink.href = relatorioUrl;
        relatorioLink.textContent = '📊 Relatório de Atividade';
        relatorioLink.className = 'aalink ms-2';
        relatorioLink.title = textoNormalizado || 'Relatório de atividade';

        courseLink.insertAdjacentElement('afterend', relatorioLink);
        courseLink.dataset.relatorioLinkAdded = 'true';
    });

    criarBotaoExtrairRelatorios();
}

function removerAcentos(texto) {
    return (texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function formatarTurmaParaArquivo(texto) {
    return removerAcentos(texto || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
}

function formatarDisciplinaParaArquivo(texto) {
    return removerAcentos(texto || "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .join("");
}

function formatarDisciplinaParaChave(texto) {
    return removerAcentos(texto || "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\b\d+\s*(?:BI|BIMESTRE)\b/gi, "")
        .replace(/\d+$/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .join("");
}

function limparNomeDisciplinaParaExibir(texto) {
    if (!texto) return texto;
    let t = texto;
    // remove rótulos comuns que aparecem junto do título
    t = t.replace(/(?:é favorito|Nome da disciplina)/gi, '');
    // remove palavra literal 'Disciplina' no começo
    t = t.replace(/^\s*Disciplina[:\s-]*/i, '');
    // detecta e remove repetições consecutivas ou duplicações inteiras de frases
    let words = t.split(/\s+/).filter(Boolean);
    const normalize = arr => arr.join(' ').replace(/[\p{P}\p{S}]/gu, '').toLowerCase();
    for (let k = Math.floor(words.length / 2); k >= 1; k--) {
        // sequência consecutiva repetida no início: [A A ...]
        if (words.length >= 2 * k) {
            const firstK = words.slice(0, k);
            const nextK = words.slice(k, k * 2);
            if (normalize(firstK) === normalize(nextK)) {
                words.splice(k, k); // remove a repetição consecutiva
                t = words.join(' ');
                break;
            }
        }

        // frase inteira duplicada (metade == metade)
        if (words.length === 2 * k) {
            const firstK = words.slice(0, k);
            const lastK = words.slice(k);
            if (normalize(firstK) === normalize(lastK)) {
                words = firstK.slice();
                t = words.join(' ');
                break;
            }
        }

        // sobreposição: começo igual ao fim
        const start = words.slice(0, k);
        const end = words.slice(-k);
        if (normalize(start) === normalize(end)) {
            words.splice(-k, k);
            t = words.join(' ');
            break;
        }
    }
    // remove indicação de bimestre tipo "- 1º Bimestre" ou "– 1BI"
    t = t.replace(/\s*[-–—]\s*(?:\d+(?:º|°)?\s*(?:bimestre|bi)|[1-4](?:º|°)?\s*bimestre)/gi, '');
    // remove repetições consecutivas de palavras idênticas
    t = t.replace(/\b(\S+)(?:\s+\1\b)+/gi, '$1');
    // colapsa espaços e trim
    t = t.replace(/\s+/g, ' ').trim();
    return t;
}

function gerarChaveDisciplina(texto) {
    if (!texto) return 'SEM_DISCIPLINA';
    // limpa e remove acentos
    let cleaned = limparNomeDisciplinaParaExibir(texto || '');
    cleaned = removerAcentos(cleaned || '').toUpperCase();
    // remove bimestre, números e caracteres não alfanuméricos
    cleaned = cleaned.replace(/\b(?:BI|BIMESTRE)\b/gi, '');
    cleaned = cleaned.replace(/[0-9º°ªª]/g, '');
    cleaned = cleaned.replace(/[^A-Z0-9\s]/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // use primeiras 6 palavras como chave para agrupar variações semelhantes
    const words = cleaned.split(' ').filter(Boolean);
    const key = words.slice(0, 6).join(' ');
    return key || 'SEM_DISCIPLINA';
}

function extrairBimestre(texto) {
    if (!texto) return 'Sem Bimestre';
    const t = (texto || '').toString();
    const m = t.match(/(?:\b|[^\d])(1|2|3|4)(?:º|°|\s)?\s*(?:bimestre|bi)\b/i);
    if (m) return `${m[1]}BI`;
    return 'Sem Bimestre';
}

function formatarBimestreParaArquivo(texto) {
    const valor = removerAcentos(texto || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();

    const match = valor.match(/([1-4])/);
    if (match) {
        return `${match[1]}BI`;
    }

    return "BIMESTRE";
}

function obterSugestaoTurmaDaPagina() {
    const grupo = document.querySelector(".groupselector");
    if (!grupo) return null;

    const select = grupo.querySelector("select");
    const texto = select?.selectedOptions?.[0]?.textContent || grupo.textContent || "";
    const valor = removerAcentos(texto).toUpperCase();

    const match = valor.match(/\b([1-4])(?:ª|º)?\s*SERIE\b/);
    if (match) {
        return match[1];
    }

    return null;
}

function obterGrupoTurmaDaPagina() {
    const grupo = document.querySelector(".groupselector");
    if (!grupo) return null;

    const select = grupo.querySelector("select");
    const texto = select?.selectedOptions?.[0]?.textContent || grupo.textContent || "";
    return texto.trim() || null;
}

function salvarTurmaPadrao(turma, grupoTurma) {
    if (!turma || !grupoTurma) return;
    const chaveGrupo = `eduprof_turmaPadrao_${formatarTurmaParaArquivo(grupoTurma)}`;
    localStorage.setItem(chaveGrupo, turma);
}

function carregarTurmaPadrao(grupoTurma) {
    if (!grupoTurma) return null;
    const chaveGrupo = `eduprof_turmaPadrao_${formatarTurmaParaArquivo(grupoTurma)}`;
    return localStorage.getItem(chaveGrupo);
}

function obterBimestreDaPagina() {
    const header = document.querySelector("#page-header")?.textContent || "";
    const match = header.match(/(?:\b|[^\d])(1|2|3|4)(?:º|°|\s)?\s*(?:bimestre|bi)/i);

    if (match) {
        return `${match[1]}BI`.toUpperCase();
    }

    return null;
}

function gerarNomeArquivoCSV() {
    const disciplina = obterDisciplina();
    const tituloPagina = document.querySelector(".page-header-headings h1")?.textContent?.trim() || "relatorio";
    const nomeDisciplina = disciplina?.nome || tituloPagina || "relatorio";

    const grupoTurma = obterGrupoTurmaDaPagina();
    const turmaPadraoSalva = carregarTurmaPadrao(grupoTurma);
    const sugestaoTurma = obterSugestaoTurmaDaPagina();
    const valorInicialTurma = turmaPadraoSalva || (sugestaoTurma ? sugestaoTurma : "");

    const turma = window.prompt(
        `Digite a turma (ex.: 2DS)${valorInicialTurma ? ` [sugestão: ${valorInicialTurma}]` : ""}`,
        valorInicialTurma
    )?.trim() || "turma";

    if (turma && turma !== turmaPadraoSalva) {
        salvarTurmaPadrao(turma, grupoTurma);
    }

    let bimestre = obterBimestreDaPagina();

    if (!bimestre) {
        bimestre = window.prompt("Digite o bimestre (ex.: 3BI):", "")?.trim() || "bimestre";
    }

    const turmaLimpa = formatarTurmaParaArquivo(turma);
    const disciplinaLimpa = formatarDisciplinaParaArquivo(nomeDisciplina)
        .replace(/bimestre$/i, "")
        .replace(/\s+/g, "")
        .replace(/\d+$/i, "");
    const bimestreLimpo = formatarBimestreParaArquivo(bimestre);

    return `${turmaLimpa || "TURMA"}_${disciplinaLimpa || "Disciplina"}_${bimestreLimpo || "BIMESTRE"}.csv`;
}

async function baixarArquivoComNome(url, nomeArquivo) {
    try {
        const resposta = await fetch(url, { credentials: 'same-origin' });
        if (!resposta.ok) throw new Error(`Falha ao baixar o arquivo: ${resposta.status}`);

        const blob = await resposta.blob();
        const objetoUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = objetoUrl;
        link.download = nomeArquivo;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(objetoUrl), 2000);
    } catch (erro) {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}

/* --------------------------------------------------
   CRIAR UM BOTÃO DE ATALHO PARA CLICAR RAPIDAMENTE NA EXPORTAÇÃO DO RELATÓRIO PARA CSV
-------------------------------------------------- */
    function criarBotaoExportarCSV() {

        const linkCSV = obterLinkExportacaoCSV();

        if (!linkCSV) return;

        const botao = document.createElement("button");

        botao.textContent = "Exportar relatório CSV";

        botao.style.position = "fixed";
        botao.style.right = "20px";
        botao.style.bottom = "12rem";

        botao.style.zIndex = "9999";

        botao.style.padding = "10px 14px";
        botao.style.borderRadius = "8px";
        botao.style.border = "none";

        botao.style.background = "#2c7be5";
        botao.style.color = "white";

        botao.style.cursor = "pointer";
        botao.style.boxShadow = "0 3px 8px rgba(0,0,0,0.3)";

        aplicarFadeEmBotao(botao);

        botao.onclick = () => {
            baixarArquivoComNome(linkCSV, gerarNomeArquivoCSV());
        };

        botaoExportarCSV = botao;

        document.body.appendChild(botao);

    }
/* --------------------------------------------------
   OBTER NOME DA DISCIPLINA PARA EXIBIR AO LISTAR LINKS DOS REGISTROS
-------------------------------------------------- */
    function obterDisciplina() {

        const breadcrumb = document.querySelector(".breadcrumb");
        if (!breadcrumb) return null;

        const itens = breadcrumb.querySelectorAll("li.breadcrumb-item");

        if (itens.length < 2) return null;

        const link = itens[1].querySelector("a");
        if (!link) return null;

        return {
            nome: link.title || link.textContent.trim(),
            url: link.href
        };

    }

/* --------------------------------------------------
   IDENTIFICA REGISTROS E ADICIONA ÍCONE
-------------------------------------------------- */

function ajustarRegistros() {

    const links = document.querySelectorAll("a.courseindex-link");

    links.forEach(link => {

        const texto = link.textContent.trim();

        if (texto.toLowerCase().includes("registro da aula") || texto.toLowerCase().includes("registro de aula")) {

            link.dataset.registro = "true";

            if (!link.dataset.iconAdded) {

                const icon = document.createElement("span");
                icon.textContent = "📝 ";
                icon.style.marginRight = "4px";

                link.prepend(icon);

                link.style.border = "2px solid black";
                link.style.padding = "2px 4px";
                link.style.borderRadius = "4px";

                link.dataset.iconAdded = "true";
            }
        }

    });

}


/* --------------------------------------------------
   FUNÇÃO CENTRAL PARA OBTER LINKS DOS REGISTROS
-------------------------------------------------- */

function obterLinksRegistros() {

    const registros = document.querySelectorAll('a[data-registro="true"]');

    const lista = [];

    registros.forEach(link => {
        lista.push(link.href);
    });

    return lista;
}

function obterLinksRelatoriosCurso() {
    const cards = document.querySelectorAll('.card.course-card');
    const lista = [];

    cards.forEach(card => {
        const courseLink = card.querySelector('a.aalink.coursename');
        if (!courseLink) return;

        // extrai texto fonte preferencialmente de aria-label ou sr-only dentro do card para evitar repetições
        const aria = courseLink.getAttribute('aria-label');
        const sr = card.querySelector('.card-body .multiline .sr-only') || card.querySelector('.card-body .sr-only') || card.querySelector('.sr-only');
        const span = courseLink.querySelector('span');
        const sourceText = (aria && aria.trim()) || (sr && sr.textContent && sr.textContent.trim()) || (span && span.textContent && span.textContent.trim()) || ((courseLink.textContent || '').trim()) || '';

        let nome = limparNomeDisciplinaParaExibir(sourceText);
        let bimestre = extrairBimestre(sourceText);

        if (/Árvore de Materiais|Minha Biblioteca/i.test(nome)) return;

        const href = courseLink.href || '';
        const match = href.match(/[?&]id=(\d+)/);
        if (!match) return;

        const courseId = match[1];
        const relatorioUrl = `https://educacaoprofissional.educacao.sp.gov.br/report/progress/index.php?course=${courseId}`;
        lista.push({ url: relatorioUrl, disciplina: nome, bimestre: bimestre });
    });

    return lista;
}


/* --------------------------------------------------
   BREADCRUMB FIXO
-------------------------------------------------- */

function fixarBreadcrumb() {

    const breadcrumb = document.querySelector(".breadcrumb");
    if (!breadcrumb) return;

    breadcrumbOriginalParent = breadcrumb.parentElement;
    breadcrumbOriginalNextSibling = breadcrumb.nextElementSibling;

    breadcrumbContainer = document.createElement("div");

    breadcrumbContainer.style.position = "fixed";
    breadcrumbContainer.style.top = "63px";
    breadcrumbContainer.style.left = "302px";
    breadcrumbContainer.style.zIndex = "9999";

    breadcrumbContainer.style.background = "#fff";
    breadcrumbContainer.style.padding = "6px 12px";
    breadcrumbContainer.style.border = "1px solid #ddd";
    breadcrumbContainer.style.borderRadius = "6px";
    breadcrumbContainer.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";

    breadcrumbContainer.style.opacity = "0.6";
    breadcrumbContainer.style.transition = "opacity 0.2s ease";

    breadcrumbContainer.addEventListener("mouseenter", () => {
        breadcrumbContainer.style.opacity = "1";
    });

    breadcrumbContainer.addEventListener("mouseleave", () => {
        breadcrumbContainer.style.opacity = "0.6";
    });

    breadcrumbContainer.appendChild(breadcrumb);

    document.body.appendChild(breadcrumbContainer);

    breadcrumbFixed = true;

}

function alternarModoBreadcrumb() {

    const breadcrumb = document.querySelector(".breadcrumb");
    if (!breadcrumb) return;

    if (breadcrumbFixed && breadcrumbContainer) {
        breadcrumbOriginalParent.insertBefore(breadcrumb, breadcrumbOriginalNextSibling);
        breadcrumbContainer.remove();
        breadcrumbFixed = false;
    } else {
        if (!breadcrumbContainer) {
            breadcrumbContainer = document.createElement("div");
            breadcrumbContainer.style.position = "fixed";
            breadcrumbContainer.style.top = "70px";
            breadcrumbContainer.style.left = "100px";
            breadcrumbContainer.style.zIndex = "9999";
            breadcrumbContainer.style.background = "#fff";
            breadcrumbContainer.style.padding = "6px 12px";
            breadcrumbContainer.style.border = "1px solid #ddd";
            breadcrumbContainer.style.borderRadius = "6px";
            breadcrumbContainer.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
            breadcrumbContainer.style.opacity = "0.6";
            breadcrumbContainer.style.transition = "opacity 0.2s ease";
            breadcrumbContainer.addEventListener("mouseenter", () => {
                breadcrumbContainer.style.opacity = "1";
            });
            breadcrumbContainer.addEventListener("mouseleave", () => {
                breadcrumbContainer.style.opacity = "0.6";
            });
        }
        breadcrumbContainer.appendChild(breadcrumb);
        document.body.appendChild(breadcrumbContainer);
        breadcrumbFixed = true;
    }

    salvarEstadoBreadcrumb();
}


/* --------------------------------------------------
   CORRIGE BREADCRUMB DO RELATÓRIO
-------------------------------------------------- */

function corrigirBreadcrumbRelatorio() {

    const breadcrumb = document.querySelector(".breadcrumb");
    if (!breadcrumb) return;

    const itens = breadcrumb.querySelectorAll("li.breadcrumb-item");

    itens.forEach(item => {

        const texto = item.textContent.trim();

        if (texto === "Conclusão de atividades") {

            const titulo = document.querySelector(".page-header-headings h1");
            if (!titulo) return;

            const nomeDisciplina = titulo.textContent.trim();

            const novoItem = document.createElement("li");
            novoItem.className = "breadcrumb-item";

            const span = document.createElement("span");
            span.textContent = nomeDisciplina;

            novoItem.appendChild(span);

            breadcrumb.insertBefore(novoItem, item);

        }

    });

}


/* --------------------------------------------------
   BOTÃO EXTRAIR LINKS DOS REGISTROS
-------------------------------------------------- */

function criarBotaoExtrairRegistros() {

    const botao = document.createElement("button");

    botao.textContent = "📋 Links dos Registros";

    botao.style.position = "fixed";
    botao.style.right = "20px";
    botao.style.bottom = "8rem";
    botao.style.zIndex = "9999";

    botao.style.padding = "10px 14px";
    botao.style.background = "#2c7be5";
    botao.style.color = "white";
    botao.style.border = "none";
    botao.style.borderRadius = "6px";
    botao.style.cursor = "pointer";
    botao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";

    aplicarFadeEmBotao(botao);

    botao.addEventListener("click", () => {

        const registros = obterLinksRegistros();

        abrirModalRegistros(registros, 'Links dos Registros');

    });

    botaoLinksRegistros = botao;

    document.body.appendChild(botao);

}

function criarBotaoExtrairRelatorios() {
    if (!window.location.pathname.endsWith('/my/courses.php')) return;
    if (botaoLinksRelatorios) return;

    const links = obterLinksRelatoriosCurso();
    if (!links.length) return;

    const botao = document.createElement("button");

    botao.textContent = "📄 Links dos Relatórios";

    botao.style.position = "fixed";
    botao.style.right = "20px";
    botao.style.bottom = "8rem";
    botao.style.zIndex = "9999";

    botao.style.padding = "10px 14px";
    botao.style.background = "#17a2b8";
    botao.style.color = "white";
    botao.style.border = "none";
    botao.style.borderRadius = "6px";
    botao.style.cursor = "pointer";
    botao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";

    aplicarFadeEmBotao(botao);

    botao.addEventListener("click", () => {
        abrirModalRegistros(links, 'Links dos Relatórios');
    });

    botaoLinksRelatorios = botao;

    document.body.appendChild(botao);
}


/* --------------------------------------------------
   BOTÃO RELATÓRIO DE CONCLUSÃO DE ATIVIDADES
-------------------------------------------------- */

function criarBotaoRelatorioConclusao() {

    // Verifica se já está na página do relatório de conclusão
    if (window.location.href.includes('/report/progress/')) {
        return;
    }

    // Extrai o ID do curso da URL atual
    const urlParams = new URLSearchParams(window.location.search);
    let courseId = urlParams.get('id');

    // Verifica se a URL é de um módulo específico onde o ID não é do curso
    const urlAtual = window.location.pathname.toLowerCase();
    const modulosExclusos = ['/mod/url/view.php', '/mod/h5pactivity/view.php', '/mod/assign/view.php','/course/section.php'];
    
    const ehModuloExcluido = modulosExclusos.some(modulo => urlAtual.includes(modulo));

    // Se está em módulo excluído, ignora o ID da URL e tenta usar o sessionStorage
    if (ehModuloExcluido) {
        courseId = sessionStorage.getItem('lastValidCourseId');
    } else if (courseId) {
        // Se encontrou um courseId válido e não está em módulo excluído, salva no sessionStorage
        sessionStorage.setItem('lastValidCourseId', courseId);
    } else {
        // Se não encontrou courseId na URL, tenta usar o último salvo
        courseId = sessionStorage.getItem('lastValidCourseId');
    }

    // Se não tem courseId, não cria o botão
    if (!courseId) return;

    const linkRelatorio = "https://educacaoprofissional.educacao.sp.gov.br/report/progress/index.php?course=" + courseId;

    const botao = document.createElement("a");

    botao.href = linkRelatorio;
    botao.textContent = "📊 Relatório de Conclusão de Atividades";
    botao.target = "_self";

    botao.style.position = "fixed";
    botao.style.right = "20px";
    botao.style.bottom = "11rem";
    botao.style.zIndex = "9999";

    botao.style.display = "inline-flex";
    botao.style.alignItems = "center";
    botao.style.justifyContent = "center";
    botao.style.padding = "10px 14px";
    botao.style.background = "#28a745";
    botao.style.color = "white";
    botao.style.textDecoration = "none";
    botao.style.border = "none";
    botao.style.borderRadius = "6px";
    botao.style.cursor = "pointer";
    botao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";

    aplicarFadeEmBotao(botao);

    botaoRelatorioConclusao = botao;

    document.body.appendChild(botao);

}

function criarBotoesFooter() {
    const footerContainer = document.querySelector('[data-region="footer-container-popover"]');
    if (!footerContainer) return;
    
    // Adiciona a regra CSS para ajustar o bottom do elemento com id "boost-union-footer-buttons"
    const style = document.createElement("style");
    style.textContent = `
        div#boost-union-footer-buttons {
            bottom: 2rem !important;
        }
    `;

    document.head.appendChild(style);

    const botoesContainer = document.createElement("div");
    botoesContainer.id = "meus-footer-buttons";
    botoesContainer.style.display = "flex";
    botoesContainer.style.gap = "6px";
    botoesContainer.style.alignItems = "center";
    botoesContainer.style.marginLeft = "8px";
    botoesContainer.style.marginRight = "50px";

    const botaoAlternarBreadcrumb = document.createElement("button");
    botaoAlternarBreadcrumb.textContent = "🔁"; 
    botaoAlternarBreadcrumb.title = "Alterar estilo do Breadcrumb";
    botaoAlternarBreadcrumb.className = "btn";
    botaoAlternarBreadcrumb.style.padding = "0 10px";
    botaoAlternarBreadcrumb.style.background = "#2c7be5";
    botaoAlternarBreadcrumb.style.color = "white";
    botaoAlternarBreadcrumb.style.fontSize = "0.85rem";
    botaoAlternarBreadcrumb.style.display = "inline-flex";
    botaoAlternarBreadcrumb.style.alignItems = "center";
    botaoAlternarBreadcrumb.style.justifyContent = "center";
    botaoAlternarBreadcrumb.style.height = "32px";
    botaoAlternarBreadcrumb.style.border = "none";
    botaoAlternarBreadcrumb.style.borderRadius = "4px";
    botaoAlternarBreadcrumb.addEventListener("click", alternarModoBreadcrumb);
    aplicarFadeEmBotao(botaoAlternarBreadcrumb);

    const botaoOcultarBotoes = document.createElement("button");
    botaoOcultarBotoes.textContent = "🔘";
    botaoOcultarBotoes.title = "Alterar visibilidade dos botões";
    botaoOcultarBotoes.className = "btn";
    botaoOcultarBotoes.style.padding = "0 10px";
    botaoOcultarBotoes.style.background = "#6c757d";
    botaoOcultarBotoes.style.color = "white";
    botaoOcultarBotoes.style.fontSize = "0.85rem";
    botaoOcultarBotoes.style.display = "inline-flex";
    botaoOcultarBotoes.style.alignItems = "center";
    botaoOcultarBotoes.style.justifyContent = "center";
    botaoOcultarBotoes.style.height = "32px";
    botaoOcultarBotoes.style.border = "none";
    botaoOcultarBotoes.style.borderRadius = "4px";
    botaoOcultarBotoes.addEventListener("click", alternarVisibilidadeBotoesRelatorio);
    aplicarFadeEmBotao(botaoOcultarBotoes);

    botoesContainer.appendChild(botaoAlternarBreadcrumb);
    botoesContainer.appendChild(botaoOcultarBotoes);

    const footerButtonsArea = footerContainer.querySelector('#boost-union-footer-buttons');
    if (footerButtonsArea) {
        footerButtonsArea.appendChild(botoesContainer);
    } else {
        footerContainer.appendChild(botoesContainer);
    }

    // Seleciona o botão existente na tela
    const botaoVoltarAoTopo = document.querySelector('#back-to-top');

    if (botaoVoltarAoTopo) {
        // Move o botão para dentro do div "meus-footer-buttons" como o primeiro elemento
        const botoesContainer = document.querySelector('#meus-footer-buttons');
        if (botoesContainer) {
            botoesContainer.prepend(botaoVoltarAoTopo); // Adiciona como o primeiro elemento
        }
    }

}

function alternarVisibilidadeBotoesRelatorio(forcarOcultar) {
    if (typeof forcarOcultar === 'boolean') {
        botoesRelatorioOcultos = forcarOcultar;
    } else {
        botoesRelatorioOcultos = !botoesRelatorioOcultos;
    }

    const action = botoesRelatorioOcultos ? 'none' : 'block';

    if (botaoLinksRegistros) botaoLinksRegistros.style.display = action;
    if (botaoRelatorioConclusao) botaoRelatorioConclusao.style.display = action;
    if (botaoExportarCSV) botaoExportarCSV.style.display = action;

    salvarEstadoBotoes();
}

/* --------------------------------------------------
   MODAL COM LINKS DOS REGISTROS
-------------------------------------------------- */

function abrirModalRegistros(lista, tituloModal = "Links dos Registros") {

    const disciplina = obterDisciplina();
    const overlay = document.createElement("div");

    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.4)";
    overlay.style.zIndex = "10000";

    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    overlay.addEventListener("click", () => {
        overlay.remove();
    });

    const modal = document.createElement("div");

    modal.style.background = "white";
    modal.style.padding = "20px";
    modal.style.borderRadius = "8px";
    modal.style.width = "600px";
    modal.style.maxWidth = "90%";

    modal.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";

    modal.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    const titulo = document.createElement("h3");
    titulo.textContent = tituloModal;

    if (disciplina) {

        const info = document.createElement("div");

        info.style.marginBottom = "10px";
        info.style.fontSize = "14px";

        const nomeLimpo = limparNomeDisciplinaParaExibir(disciplina.nome);

        info.innerHTML =
            "<strong>" + nomeLimpo + "</strong>" +
            "<br><strong>Link:</strong> " + disciplina.url;

        modal.appendChild(info);
    }

    // Suporte para ambos formatos: lista de strings (antigo) ou lista de objetos {url, disciplina, bimestre}
    const rawList = lista || [];
    const flatMode = rawList.length > 0 && typeof rawList[0] === 'string';
    const items = rawList.map(i => (typeof i === 'string') ? { url: i, disciplina: null, bimestre: null } : (i.bimestre === undefined ? { ...i, bimestre: null } : i));

    // Se for lista de registros (flatMode), mostra o título da página (h1 dentro de #page-header)
    if (flatMode) {
        const pageHeaderText = document.querySelector('#page-header h1')?.textContent?.trim();
        if (pageHeaderText) {
            const pageInfo = document.createElement('div');
            pageInfo.style.marginBottom = '8px';
            pageInfo.style.fontSize = '14px';
            pageInfo.innerHTML = '<strong>' + pageHeaderText + '</strong>';
            modal.appendChild(pageInfo);
        }
    }

    const container = document.createElement('div');
    container.style.maxHeight = '60vh';
    container.style.overflowY = 'auto';
    container.style.marginTop = '10px';

    // Agrupa por disciplina (usando a disciplina fornecida ou uma chave padrão) e por bimestre.
    const grupos = {};
    items.forEach(item => {
        const rawNome = item.disciplina ? item.disciplina.trim() : 'Sem disciplina';
        const disciplinaNome = limparNomeDisciplinaParaExibir(rawNome) || 'Sem disciplina';
        const chave = gerarChaveDisciplina(disciplinaNome) || disciplinaNome;
        if (!grupos[chave]) grupos[chave] = { nome: disciplinaNome, itemsByBimestre: {} };

        const bimestre = item.bimestre || extrairBimestre(item.disciplina || disciplinaNome) || 'Sem Bimestre';
        if (!grupos[chave].itemsByBimestre[bimestre]) grupos[chave].itemsByBimestre[bimestre] = [];
        grupos[chave].itemsByBimestre[bimestre].push(item);
    });

    // Botão copiar tudo
    const copiarTudo = document.createElement('button');
    copiarTudo.textContent = '📋 Copiar tudo';
    copiarTudo.style.marginTop = '10px';
    copiarTudo.style.marginRight = '10px';
    copiarTudo.style.padding = '6px 10px';
    copiarTudo.style.cursor = 'pointer';
    copiarTudo.style.minWidth = '140px';
    copiarTudo.style.display = 'inline-block';
    copiarTudo.style.textAlign = 'center';
    copiarTudo.style.borderRadius = '6px';
    copiarTudo.style.background = '#17a2b8';
    copiarTudo.style.color = 'white';
    copiarTudo.style.border = 'none';
    copiarTudo.addEventListener('click', async () => {
        const allUrls = items.map(it => it.url).join('\n');
        try {
            await navigator.clipboard.writeText(allUrls);
            copiarTudo.textContent = '✅ Copiado!';
            setTimeout(() => copiarTudo.textContent = '📋 Copiar tudo', 1500);
        } catch {
            // fallback: criar textarea temporário
            const ta = document.createElement('textarea');
            ta.value = allUrls;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            copiarTudo.textContent = '✅ Copiado!';
            setTimeout(() => copiarTudo.textContent = '📋 Copiar tudo', 1500);
        }
    });

    // Botões globais por bimestre, ao lado do copiar tudo (apenas para lista de relatórios)
    let bimestreBtnsContainer = null;
    if (!flatMode) {
        const bimestreSet = new Set();
        items.forEach(it => {
            const bim = it.bimestre || null;
            if (bim && bim !== 'Sem Bimestre') bimestreSet.add(bim);
        });
        const bimestresGlobais = Array.from(bimestreSet);
        // ordena usando mesma lógica
        bimestresGlobais.sort((a, b) => {
            const order = { '1BI': 1, '2BI': 2, '3BI': 3, '4BI': 4 };
            const oa = order[a] || 99;
            const ob = order[b] || 99;
            if (oa !== ob) return oa - ob;
            return (a || '').localeCompare(b || '');
        });

        bimestreBtnsContainer = document.createElement('div');
        bimestreBtnsContainer.style.display = 'inline-block';
        bimestreBtnsContainer.style.marginLeft = '8px';

        bimestresGlobais.forEach(bim => {
            const btn = document.createElement('button');
            btn.textContent = bim;
            btn.title = `Copiar todos os links de todos os cursos do ${bim}`;
            btn.style.marginLeft = '6px';
            btn.style.padding = '6px 8px';
            btn.style.cursor = 'pointer';
            btn.style.borderRadius = '6px';
            btn.style.background = '#ffc107';
            btn.style.color = '#000';
            btn.style.border = 'none';
            btn.addEventListener('click', async () => {
                const urls = items.filter(it => (it.bimestre || '') === bim).map(it => it.url).join('\n');
                try {
                    await navigator.clipboard.writeText(urls);
                    const old = btn.textContent;
                    btn.textContent = '✅';
                    setTimeout(() => btn.textContent = old, 1200);
                } catch {
                    const ta = document.createElement('textarea');
                    ta.value = urls;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                    const old = btn.textContent;
                    btn.textContent = '✅';
                    setTimeout(() => btn.textContent = old, 1200);
                }
            });
            bimestreBtnsContainer.appendChild(btn);
        });
    }

    // Monta grupos e suas tabelas, agora subdivididos por bimestre
    if (flatMode) {
        // Lista simples de registros (apenas URLs) — tenta usar texto do link na página quando possível
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '6px';

        items.forEach(item => {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.style.padding = '6px 4px';
            td.style.borderBottom = '1px solid #eee';

            const a = document.createElement('a');
            a.href = item.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';

            // procura no DOM um anchor correspondente para obter texto legível
            let label = null;
            try {
                const found = Array.from(document.querySelectorAll('a')).find(el => el.href === item.url || el.getAttribute('href') === item.url);
                if (found) label = found.textContent.trim();
            } catch (e) {
                label = null;
            }

            a.textContent = (label && label.length) ? label : item.url;

            td.appendChild(a);
            tr.appendChild(td);
            table.appendChild(tr);
        });

        container.appendChild(table);
    } else {
        Object.keys(grupos).forEach((chave, index) => {
        const grupo = grupos[chave];

        const grupoDiv = document.createElement('div');
        grupoDiv.style.marginBottom = '12px';
        grupoDiv.style.paddingTop = '8px';
        // separador visual entre disciplinas
        if (index > 0) {
            grupoDiv.style.borderTop = '2px solid #d0d0d0';
            grupoDiv.style.marginTop = '8px';
            grupoDiv.style.paddingTop = '10px';
        }

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        const tituloGrupo = document.createElement('strong');
        tituloGrupo.textContent = grupo.nome;

        const copiarGrupoBtn = document.createElement('button');
        copiarGrupoBtn.textContent = '📋 Copiar';
        copiarGrupoBtn.title = 'Copiar todos os links da disciplina: ' + grupo.nome;
        copiarGrupoBtn.style.padding = '6px 8px';
        copiarGrupoBtn.style.cursor = 'pointer';
        copiarGrupoBtn.style.minWidth = '140px';
        copiarGrupoBtn.style.display = 'inline-block';
        copiarGrupoBtn.style.boxSizing = 'border-box';
        copiarGrupoBtn.style.textAlign = 'center';
        copiarGrupoBtn.style.borderRadius = '6px';
        copiarGrupoBtn.style.background = '#2c7be5';
        copiarGrupoBtn.style.color = 'white';
        copiarGrupoBtn.style.border = 'none';
        copiarGrupoBtn.addEventListener('click', async () => {
            const all = [];
            Object.values(grupo.itemsByBimestre).forEach(arr => arr.forEach(it => all.push(it.url)));
            const urls = all.join('\n');
            try {
                await navigator.clipboard.writeText(urls);
                copiarGrupoBtn.textContent = '✅ Copiado!';
                setTimeout(() => copiarGrupoBtn.textContent = '📋 Copiar', 1500);
            } catch {
                const ta = document.createElement('textarea');
                ta.value = urls;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                copiarGrupoBtn.textContent = '✅ Copiado!';
                setTimeout(() => copiarGrupoBtn.textContent = '📋 Copiar', 1500);
            }
        });

        header.appendChild(tituloGrupo);
        header.appendChild(copiarGrupoBtn);
        grupoDiv.appendChild(header);

        // ordena bimestres: 1BI..4BI primeiro, depois 'Sem Bimestre'
        const bimestres = Object.keys(grupo.itemsByBimestre || {});
        bimestres.sort((a, b) => {
            const order = { '1BI': 1, '2BI': 2, '3BI': 3, '4BI': 4 };
            const oa = order[a] || 99;
            const ob = order[b] || 99;
            if (oa !== ob) return oa - ob;
            return a.localeCompare(b);
        });

        bimestres.forEach(bim => {
            const itemsB = grupo.itemsByBimestre[bim] || [];

            // Não exibimos sub-header por bimestre dentro de cada disciplina (removido texto e botão verde)
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginTop = '6px';

            itemsB.forEach(item => {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.style.padding = '6px 4px';
                td.style.borderBottom = '1px solid #eee';

                const a = document.createElement('a');
                a.href = item.url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                const initialName = limparNomeDisciplinaParaExibir(item.disciplina || grupo.nome);
                const bimestreLabel = (item.bimestre && item.bimestre !== 'Sem Bimestre') ? item.bimestre : (bim && bim !== 'Sem Bimestre' ? bim : null);
                a.textContent = (initialName ? initialName + ' - ' : '') + (bimestreLabel ? bimestreLabel + ' - ' : '') + 'Relatório';

                td.appendChild(a);
                tr.appendChild(td);
                table.appendChild(tr);
            });

            grupoDiv.appendChild(table);
        });

        container.appendChild(grupoDiv);
    });
    }




    const fechar = document.createElement("button");

    fechar.textContent = "Fechar";

    fechar.style.padding = "6px 10px";
    fechar.style.cursor = "pointer";


    fechar.addEventListener("click", () => {
        overlay.remove();
    });


    modal.appendChild(titulo);
    modal.appendChild(copiarTudo);
    if (bimestreBtnsContainer) modal.appendChild(bimestreBtnsContainer);
    modal.appendChild(container);
    modal.appendChild(fechar);

    overlay.appendChild(modal);

    document.body.appendChild(overlay);

    const fecharModal = () => {
        overlay.remove();
        document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (event) => {
        if (event.key === 'Escape' || event.key === 'Esc') {
            fecharModal();
        }
    };

    document.addEventListener('keydown', handleEsc);
}


/* --------------------------------------------------
   INICIALIZAÇÃO
-------------------------------------------------- */

    function executarAjustes(){
        carregarEstadoSession();

        ajustarRegistros();

        corrigirBreadcrumbRelatorio();

        fixarBreadcrumb();

        if (!breadcrumbFixed) {
            alternarModoBreadcrumb();
        }

        criarBotaoExtrairRegistros();

        criarBotaoRelatorioConclusao();

        criarBotaoExportarCSV();

        criarBotoesFooter();

        if (botoesRelatorioOcultos) {
            alternarVisibilidadeBotoesRelatorio(true);
        }

        verificarAvaliacoesPendentes();
    }
    
    waitForKeyElements('#course-index', executarAjustes);
    waitForKeyElements('.card.course-card', criarLinksRelatorioCards);
})();