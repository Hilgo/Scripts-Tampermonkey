// ==UserScript==
// @name         Educação Profissional – Melhorias de Navegação
// @namespace    https://educacaoprofissional.educacao.sp.gov.br/userscripts
// @version      2026-04-01
// @description  Userscript para melhorar a navegação no Moodle da Educação Profissional. Destaca registros de aula, fixa o breadcrumb com transparência, corrige breadcrumbs de relatórios, adiciona um botão flutuante que coleta e permite copiar todos os links de registros da disciplina atual e cria um botão de atalho fixo para exportar relatórios de conclusões de atividades em CSV.
// @author       Hilgo
// @match        https://educacaoprofissional.educacao.sp.gov.br/*
// @icon         https://educacaoprofissional.educacao.sp.gov.br/pluginfile.php/1/theme_boost_union/favicon/64x64/1774361098/favicon.ico
// @require http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @require  https://gist.github.com/raw/2625891/waitForKeyElements.js
// @updateURL   https://raw.githubusercontent.com/Hilgo/Scripts-Tampermonkey/refs/heads/main/Educa%C3%A7%C3%A3o%20Profissional/melhorias_navegacao.js
// @downloadURL https://raw.githubusercontent.com/Hilgo/Scripts-Tampermonkey/refs/heads/main/Educa%C3%A7%C3%A3o%20Profissional/melhorias_navegacao.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

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

        botao.onclick = () => {
            window.open(linkCSV, "_blank");
        };

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

        if (texto.includes("Registro da Aula")) {

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

    const container = document.createElement("div");

    container.style.position = "fixed";
    container.style.top = "70px";
    container.style.left = "100px";
    container.style.zIndex = "9999";

    container.style.background = "#fff";
    container.style.padding = "6px 12px";
    container.style.border = "1px solid #ddd";
    container.style.borderRadius = "6px";
    container.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";

    container.style.opacity = "0.6";
    container.style.transition = "opacity 0.2s ease";

    container.addEventListener("mouseenter", () => {
        container.style.opacity = "1";
    });

    container.addEventListener("mouseleave", () => {
        container.style.opacity = "0.6";
    });

    container.appendChild(breadcrumb);

    document.body.appendChild(container);

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
    botao.style.bottom = "9rem";
    botao.style.zIndex = "9999";

    botao.style.padding = "10px 14px";
    botao.style.background = "#2c7be5";
    botao.style.color = "white";
    botao.style.border = "none";
    botao.style.borderRadius = "6px";
    botao.style.cursor = "pointer";
    botao.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";

    botao.addEventListener("click", () => {

        const registros = obterLinksRegistros();

        abrirModalRegistros(registros);

    });

    document.body.appendChild(botao);

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
        ajustarRegistros();

        corrigirBreadcrumbRelatorio();

        fixarBreadcrumb();

        criarBotaoExtrairRegistros();

        criarBotaoExportarCSV();

        verificarAvaliacoesPendentes();
    }

    waitForKeyElements('#course-index', executarAjustes);
})();