// ==UserScript==
// @name         Educação Profissional – Melhorias de Navegação
// @namespace    https://educacaoprofissional.educacao.sp.gov.br/userscripts
// @version      1.7
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
            window.open(linkCSV, "_blank");
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

        abrirModalRegistros(registros);

    });

    botaoLinksRegistros = botao;

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

    const botao = document.createElement("button");

    botao.textContent = "📊 Relatório de Conclusão de Atividades";

    botao.style.position = "fixed";
    botao.style.right = "20px";
    botao.style.bottom = "11rem";
    botao.style.zIndex = "9999";

    botao.style.padding = "10px 14px";
    botao.style.background = "#28a745";
    botao.style.color = "white";
    botao.style.border = "none";
    botao.style.borderRadius = "6px";
    botao.style.cursor = "pointer";
    botao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";

    aplicarFadeEmBotao(botao);

    botao.addEventListener("click", () => {

        const linkRelatorio = "https://educacaoprofissional.educacao.sp.gov.br/report/progress/index.php?course=" + courseId;

        window.open(linkRelatorio, "_blank");

    });

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

function abrirModalRegistros(lista) {

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


    const modal = document.createElement("div");

    modal.style.background = "white";
    modal.style.padding = "20px";
    modal.style.borderRadius = "8px";
    modal.style.width = "600px";
    modal.style.maxWidth = "90%";

    modal.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";


    const titulo = document.createElement("h3");
    titulo.textContent = "Links dos Registros";

    if (disciplina) {

        const info = document.createElement("div");

        info.style.marginBottom = "10px";
        info.style.fontSize = "14px";

        info.innerHTML =
            "<strong>Disciplina:</strong> " + disciplina.nome +
            "<br><strong>Link:</strong> " + disciplina.url;

        modal.appendChild(info);
    }

    const textarea = document.createElement("textarea");

    const textoLinks = lista.join("\n");

    textarea.value = textoLinks;

    textarea.style.width = "100%";
    textarea.style.height = "250px";
    textarea.style.marginTop = "10px";


    const copiar = document.createElement("button");

    copiar.textContent = "📋 Copiar tudo";

    copiar.style.marginTop = "10px";
    copiar.style.marginRight = "10px";
    copiar.style.padding = "6px 10px";
    copiar.style.cursor = "pointer";


    copiar.addEventListener("click", async () => {

        try {

            await navigator.clipboard.writeText(textoLinks);

            copiar.textContent = "✅ Copiado!";

        } catch {

            textarea.select();

            document.execCommand("copy");

            copiar.textContent = "✅ Copiado!";

        }

    });




    const fechar = document.createElement("button");

    fechar.textContent = "Fechar";

    fechar.style.padding = "6px 10px";
    fechar.style.cursor = "pointer";


    fechar.addEventListener("click", () => {
        overlay.remove();
    });


    modal.appendChild(titulo);
    modal.appendChild(textarea);
    modal.appendChild(copiar);
    modal.appendChild(fechar);

    overlay.appendChild(modal);

    document.body.appendChild(overlay);

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
})();