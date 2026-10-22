// ==UserScript==
// @name         Educação Profissional – Melhorias na árvore de materiais
// @namespace    https://educacaoprofissional.educacao.sp.gov.br/userscripts
// @version      1.1
// @description  Lista, ao clicar no botão, os materiais atualmente exibidos e permite baixar PDF, PPT ou outros arquivos.
// @author       Hilgo
// @match        https://epp-aulas.educacao.sp.gov.br/*
// @icon         https://educacaoprofissional.educacao.sp.gov.br/pluginfile.php/1/theme_boost_union/favicon/64x64/1774361098/favicon.ico
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @updateURL    https://github.com/Hilgo/Scripts-Tampermonkey/raw/refs/heads/main/Educa%C3%A7%C3%A3o%20Profissional/melhorias_arvore_materiais.user.js
// @downloadURL  https://github.com/Hilgo/Scripts-Tampermonkey/raw/refs/heads/main/Educa%C3%A7%C3%A3o%20Profissional/melhorias_arvore_materiais.user.js
// @grant        GM_download
// @connect      epp-aulas.educacao.sp.gov.br
// ==/UserScript==
function normalizarTexto(texto) {
    return (texto || '').replace(/\s+/g, ' ').trim();
}

function encontrarCardMaterial(elemento) {
    // Os botÃµes ficam em uma listagem interna; sobe atÃ© o card externo que contÃ©m os campos Curso e Semana.
    let card = elemento.closest('.jet-listing-grid__item');
    while (card) {
        const campos = Array.from(card.querySelectorAll('.jet-listing-dynamic-field__content'));
        const temCurso = campos.some((campo) => /^Curso\s*:/i.test(normalizarTexto(campo.textContent)));
        const temSemana = campos.some((campo) => /^Semana\s*\d+/i.test(normalizarTexto(campo.querySelector('strong')?.textContent)));
        if (temCurso && temSemana) return card;

        const pai = card.parentElement?.closest('.jet-listing-grid__item');
        if (!pai || pai === card) break;
        card = pai;
    }
    return elemento.closest('.jet-listing-grid__item');
}

function obterCampoCard(card, rotulo) {
    if (!card) return '';
    const campo = Array.from(card.querySelectorAll('.jet-listing-dynamic-field__content')).find((item) => {
        const texto = normalizarTexto(item.querySelector('strong')?.textContent || item.textContent);
        return new RegExp(`^${rotulo}\\s*:`, 'i').test(texto);
    });
    if (!campo) return '';
    return normalizarTexto(campo.textContent).replace(new RegExp(`^${rotulo}\\s*:\\s*`, 'i'), '').trim();
}

function obterSemanaCard(card) {
    if (!card) return '';
    const campo = Array.from(card.querySelectorAll('.jet-listing-dynamic-field__content')).find((item) =>
        /^Semana\s*\d+/i.test(normalizarTexto(item.querySelector('strong')?.textContent))
    );
    if (!campo) return '';

    const semana = normalizarTexto(campo.querySelector('strong').textContent).replace(/:$/, '');
    const textoCompleto = normalizarTexto(campo.textContent);
    const descricao = textoCompleto.slice(campo.querySelector('strong').textContent.length).replace(/^\s*:\s*/, '').trim();
    return descricao ? `${semana}: ${descricao}` : semana;
}

function nomeSeguroArquivo(texto) {
    return normalizarTexto(texto)
        .replace(/:/g, ' - ')
        .replace(/[<>"/\\|?*\u0000-\u001F]/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/[. ]+$/g, '')
        .slice(0, 180);
}

async function baixarArquivoComNome(url, nomeArquivo) {
    const urlPreparacao = new URL(url, window.location.href);
    urlPreparacao.searchParams.set('action', 'prepare_zip');

    const respostaPreparacao = await fetch(urlPreparacao.href, { credentials: 'same-origin' });
    if (!respostaPreparacao.ok) {
        throw new Error(`Falha ao preparar o arquivo: ${respostaPreparacao.status}`);
    }

    const dadosPreparacao = await respostaPreparacao.json();
    if (dadosPreparacao.status !== 'success' || !dadosPreparacao.zip_url) {
        throw new Error(dadosPreparacao.message || 'O servidor não conseguiu preparar o ZIP.');
    }

    const urlDownload = new URL(window.location.pathname, window.location.origin);
    urlDownload.searchParams.set('action', 'download_zip');
    urlDownload.searchParams.set('file', dadosPreparacao.zip_url);

    const nomeFinal = nomeArquivo.endsWith('.zip') ? nomeArquivo : `${nomeArquivo}.zip`;
    await new Promise((resolve, reject) => {
        GM_download({
            url: urlDownload.href,
            name: nomeFinal,
            saveAs: false,
            onload: resolve,
            onerror: (erro) => reject(new Error(`GM_download falhou (${erro.error || 'erro desconhecido'}): ${erro.details || ''}`)),
            ontimeout: () => reject(new Error('O download do ZIP excedeu o tempo limite.'))
        });
    });
}

function extrairLinksDownload() {
    const links = [];
    const vistos = new Set();

    document.querySelectorAll(
        '.btn-pdf a.download-button[href], .btn-ppt a.download-button[href], .btn-outros a.download-button[href]'
    ).forEach((elemento) => {
        const href = elemento.getAttribute('href') || '';
        if (!href) return;

        let url;
        try {
            url = new URL(href, window.location.href);
        } catch (error) {
            console.error('URL de download inválida:', href, error);
            return;
        }

        if (url.searchParams.get('action') !== 'download_files') return;

        const urlNormalizada = url.href;
        if (vistos.has(urlNormalizada)) return;

        const tipoOriginal = (url.searchParams.get('type') || '').toLowerCase();
        const tipoDoContainer = elemento.closest('.btn-pdf')
            ? 'pdf'
            : elemento.closest('.btn-ppt')
                ? 'ppt'
                : 'outros';
        const tipo = ['pdf', 'ppt', 'outros'].includes(tipoOriginal) ? tipoOriginal : tipoDoContainer;
        const acordeao = elemento.closest('.n-accordion-item');
        const titulo = acordeao && acordeao.querySelector('.n-accordion-title');
        const textoLink = (elemento.textContent || '').trim();
        const card = encontrarCardMaterial(elemento);
        const bimestre = obterCampoCard(card, 'Bimestre');
        const componente = obterCampoCard(card, 'Componente Curricular');
        const semana = obterSemanaCard(card);
        const nomeBase = nomeSeguroArquivo([
            componente,
            bimestre ? `${bimestre} Bimestre` : '',
            semana
        ].filter(Boolean).join(' - '));
        const tipoArquivo = tipo === 'ppt' ? 'PPTX' : tipo.toUpperCase();
        const nomeLista = nomeSeguroArquivo([
            componente,
            bimestre ? `${bimestre} Bimestre` : '',
            semana
        ].filter(Boolean).join(' - '));

        vistos.add(urlNormalizada);
        links.push({
            elemento,
            url: urlNormalizada,
            nomeArquivo: `${nomeBase || `Material ${links.length + 1}`} - ${tipoArquivo}.zip`,
            nome: nomeLista || [
                titulo ? titulo.textContent.trim() : '',
                textoLink && textoLink.toLowerCase() !== tipo ? textoLink : ''
            ].filter(Boolean).join(' — ') || `Material ${links.length + 1}`,
            tipo
        });
    });

    return links;
}

function criarBotaoBaixarTodos() {
    if (document.getElementById('eduprof-baixar-todos')) return;

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: '10000'
    });

    const botao = document.createElement('button');
    botao.id = 'eduprof-baixar-todos';
    botao.type = 'button';
    botao.textContent = 'Baixar vários arquivos';
    Object.assign(botao.style, {
        padding: '10px 16px',
        border: 'none',
        borderRadius: '8px',
        background: '#2c7be5',
        color: '#fff',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
    });

    const menu = document.createElement('div');
    menu.hidden = true;
    Object.assign(menu.style, {
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        right: '0',
        background: '#fff',
        border: '1px solid #dfe3e8',
        borderRadius: '8px',
        boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
        padding: '8px 10px',
        zIndex: '10000',
        width: 'min(420px, calc(100vw - 32px))',
        maxHeight: '70vh',
        overflowY: 'auto',
        color: '#1f2937'
    });

    const resumo = document.createElement('p');
    resumo.style.margin = '4px 0 8px';
    resumo.textContent = 'Clique para listar os materiais atualmente exibidos.';
    menu.appendChild(resumo);

    const lista = document.createElement('div');
    menu.appendChild(lista);

    const botaoBaixar = document.createElement('button');
    botaoBaixar.type = 'button';
    botaoBaixar.textContent = 'Baixar selecionados';
    botaoBaixar.hidden = true;
    Object.assign(botaoBaixar.style, {
        marginTop: '6px',
        width: '100%',
        padding: '8px 10px',
        border: 'none',
        borderRadius: '6px',
        background: '#1f7a1f',
        color: '#fff',
        fontWeight: '600',
        cursor: 'pointer'
    });

    botao.addEventListener('click', (event) => {
        event.stopPropagation();

        // Re-read the DOM on every click because the page content changes with its filters.
        const links = extrairLinksDownload();
        lista.replaceChildren();
        const selecao = new Set(links);
        const checkboxesPorItem = new Map();
        resumo.textContent = links.length
            ? `${links.length} material(is) encontrado(s) na página agora. Selecione o que deseja baixar:`
            : 'Nenhum link de download encontrado no conteúdo exibido. Aplique o filtro e clique novamente.';
        botaoBaixar.hidden = links.length === 0;

        const filtros = document.createElement('div');
        filtros.style.display = 'flex';
        filtros.style.gap = '12px';
        filtros.style.flexWrap = 'wrap';
        filtros.style.marginBottom = '8px';

        ['pdf', 'ppt', 'outros'].forEach((tipo) => {
            const itensTipo = links.filter((item) => item.tipo === tipo);
            const label = document.createElement('label');
            label.style.display = 'inline-flex';
            label.style.alignItems = 'center';
            label.style.gap = '4px';
            label.style.cursor = 'pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = itensTipo.length > 0;
            checkbox.disabled = itensTipo.length === 0;
            checkbox.addEventListener('change', () => {
                itensTipo.forEach((item) => {
                    if (checkbox.checked) selecao.add(item);
                    else selecao.delete(item);
                    const itemCheckbox = checkboxesPorItem.get(item);
                    if (itemCheckbox) itemCheckbox.checked = checkbox.checked;
                });
            });

            label.append(checkbox, document.createTextNode(`${tipo.toUpperCase()} (${itensTipo.length})`));
            filtros.appendChild(label);
        });

        lista.appendChild(filtros);
        lista.appendChild(botaoBaixar);

        links.forEach((item) => {
            const linha = document.createElement('label');
            linha.style.display = 'flex';
            linha.style.alignItems = 'flex-start';
            linha.style.gap = '8px';
            linha.style.padding = '5px 0';
            linha.style.borderTop = '1px solid #eee';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkboxesPorItem.set(item, checkbox);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selecao.add(item);
                else selecao.delete(item);
            });

            const nome = document.createElement('span');
            nome.textContent = `${item.nome} (${item.tipo.toUpperCase()})`;
            linha.append(checkbox, nome);
            lista.appendChild(linha);
        });

        menu.hidden = false;

        botaoBaixar.onclick = () => {
            const selecionados = links.filter((item) => selecao.has(item));
            if (!selecionados.length) {
                alert('Selecione ao menos um material para baixar.');
                return;
            }

            botaoBaixar.disabled = true;
            botao.disabled = true;
            botao.textContent = `Baixando 0/${selecionados.length}...`;

            let indice = 0;
            const baixarProximo = async () => {
                if (indice >= selecionados.length) {
                    botaoBaixar.disabled = false;
                    botao.disabled = false;
                    botao.textContent = 'Baixar vários arquivos';
                    menu.hidden = true;
                    return;
                }

                try {
                    await baixarArquivoComNome(selecionados[indice].url, selecionados[indice].nomeArquivo);
                } catch (error) {
                    console.error('Falha no download do material:', error);
                    botaoBaixar.disabled = false;
                    botao.disabled = false;
                    botao.textContent = 'Baixar vários arquivos';
                    botaoBaixar.textContent = 'Baixar selecionados';
                    alert(`Falha ao baixar o material ${indice + 1}. Confira o console para mais detalhes.`);
                    return;
                }

                indice += 1;
                botao.textContent = `Baixando ${indice}/${selecionados.length}...`;
                window.setTimeout(baixarProximo, 1000);
            };

            baixarProximo();
        };
    });

    wrapper.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', () => {
        menu.hidden = true;
    });

    wrapper.appendChild(botao);
    wrapper.appendChild(menu);
    document.body.appendChild(wrapper);
}

(function () {
    'use strict';
    if(document.querySelector("#page-header")) {
        waitForKeyElements('#page-header', criarBotaoBaixarTodos);
    }
    else if(document.querySelector(".elementor-widget-container")) {
        waitForKeyElements('.elementor-widget-container', criarBotaoBaixarTodos);
    }
})();
