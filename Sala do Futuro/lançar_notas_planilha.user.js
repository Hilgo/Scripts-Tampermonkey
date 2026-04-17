// ==UserScript==
// @name         Sala do Futuro - Lançamento automático de avaliação na sala do futuro por tabela
// @namespace    http://tampermonkey.net/
// @version      2025-12-05
// @description  Automação de lançamento de notas de estudantes por planilha. Cole a lista de alunos com as respectivas notas para que o script atualize a tabela das notas da sala do futuro automaticamente. VERIFIQUE OS VALORES
// @author       Lucas Palma Stabile - github.com/Hilgo
// @icon         https://saladofuturoprofessor.educacao.sp.gov.br/favicon.ico
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @match        https://saladofuturoprofessor.educacao.sp.gov.br/diario-classe__avalicao___lancamentoDetalhes
// @updateURL   https://github.com/Hilgo/Scripts-Tampermonkey/raw/refs/heads/main/Sala%20do%20Futuro/lan%C3%A7ar_notas_planilha.user.js
// @downloadURL https://github.com/Hilgo/Scripts-Tampermonkey/raw/refs/heads/main/Sala%20do%20Futuro/lan%C3%A7ar_notas_planilha.user.js
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

/**
 * Encontra célula por valor do nome do estudante e retorna o input da nota do respectivo estudante.
 * @param {string} searchText - Nome do estudante.
 * @returns {HTMLElement | null} Input da nota do estudante ou Null caso não encontre.
 */

function encontrarInputNotaEstudante(searchText) {
    // 1. Get the table element by its ID
    const table = document.getElementById("tableDiarioClasse");
    if (!table) {
        console.error("Table with ID tableDiarioClasse not found.");
        alert("Erro no script, tabela não encontrada, avise o criador do script!")
        return null; // Retorna null se a tabela não for encontrada
    }

    // 2. Get all rows in the table (table.rows é uma coleção ao vivo de <tr> elementos)
    const rows = table.rows;

    // 3. Iterar através de cada linha
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].cells; // Obter células para a linha atual

        // 4. Iterar através de cada célula na linha atual
        for (let j = 0; j < cells.length; j++) {
            const cell = cells[j];
            // Obter o conteúdo de texto da célula (usar .textContent é melhor)
            const cellText = cell.textContent || cell.innerText;

            // 5. Comparar o texto da célula com o texto de pesquisa
            // Usar .trim() para remover espaços em branco e .toUpperCase() para comparação sem distinção de maiúsculas/minúsculas
            if (cellText.trim().toUpperCase() === searchText.toUpperCase()) {
                // *** AJUSTE FEITO AQUI ***
                // Em vez de retornar a célula, encontramos o input dentro da linha (parentNode)
                const targetInput = cell.parentNode.querySelector("[name='n.NotaAtribuida']");
                // Retornamos o input encontrado ou null se o input não existir nessa linha
                return targetInput;
            }
        }
    }

    // 6. Se o loop terminar sem encontrar uma correspondência
    return null; // Retorna null se nem a célula nem o input forem encontrados
}

/**
 * Percorre todas as linhas da tabela 'tabelaNotas', extrai o nome do estudante
 * da primeira coluna e chama a função encontrarInputNotaEstudante para cada nome.
 */
function AplicarNotas(){
  // 1. Obter a tabela pelo ID (usando o ID fornecido na função original)
    const table = document.getElementById("tabelaNotas");
    if (!table) {
        console.error("Tabela 'tabelaNotas' não encontrada.");
        alert("Erro no script: Tabela não encontrada!");
        return;
    }

    // 2. Obter as linhas do corpo da tabela (tbody)
    // Usamos querySelectorAll('tbody > tr') para garantir que pegamos apenas as linhas de dados,
    // ignorando o thead, se houver.
    const linhas = table.querySelectorAll('tbody > tr');

    if (linhas.length === 0) {
        console.log("Nenhum estudante encontrado na tabela.");
        return;
    }

    console.log(`Iniciando processamento para ${linhas.length} estudantes...`);

    // 3. Iterar sobre cada linha encontrada
    linhas.forEach(linha => {
        // A primeira coluna (index 0) deve conter o nome do estudante
        const celulaNome = linha.cells[0];
        const celulaNota = linha.cells[1];
        if (celulaNome) {
            const nomeEstudante = celulaNome.textContent.trim();
            if (nomeEstudante) {
                console.log(`Buscando input para o estudante: ${nomeEstudante}`);
                // 4. Chamar a função existente com o nome extraído
                const inputNota = encontrarInputNotaEstudante(nomeEstudante);
                if (inputNota) {
                    inputNota.value = parseFloat(celulaNota.textContent.replace(",","."));
                    const event = new Event('change', { bubbles: true });
                    inputNota.dispatchEvent(event);
                    inputNota.style.border = '2px solid green'; // Destaca o input encontrado
                    console.log(`Input encontrado para ${nomeEstudante}`);
                } else {
                    console.warn(`Input de nota NÃO encontrado para ${nomeEstudante}`);
                }
            }
        }
    });

    console.log("Processamento concluído.");
    closeModal();
}

// Função para criar e adicionar o modal ao DOM
function createAndAppendModal() {
    const modal = document.createElement('div');
    modal.classList.add('meu-modal');
    modal.id = 'myModal';

    // Cria o conteúdo do modal
    const modalContent = document.createElement('div');
    modalContent.classList.add('meu-modal-content');

    // Adiciona o botão de fechar
    const closeBtn = document.createElement('span');
    closeBtn.classList.add('meu-modal-close');
    closeBtn.innerHTML = '&times;'; // Caractere 'x'
    closeBtn.onclick = closeModal; // Define o evento de fechar

    // Adiciona o título e o corpo do texto
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = 'Lançamento de notas por planilha';
    const modalText = document.createElement('p');
    modalText.textContent = 'Importe notas ao colar de uma planilha (1ª Coluna nome do aluno, 2ª Coluna Nota)';

    //Criar área para colar e montar a planilha
    const tableContainer = document.createElement('div');
    tableContainer.id = tableContainer;
    //Criar área para receber cópia da planilha
    const myPasteTarget = document.createElement('div');

    myPasteTarget.id = 'myPasteTarget';
    myPasteTarget.contentEditable = 'true';
    myPasteTarget.style.cssText = 'border: 1px solid black; min-height: 50px;';
    myPasteTarget.innerHTML = 'Cole a planilha aqui:';
    myPasteTarget.addEventListener('paste', async (event) => {
        event.preventDefault(); // Prevent default paste behavior
        const clipboardData = event.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData('text/plain');

        // processar texto colado
        createTableFromText(pastedText);

        function createTableFromText(text) {
            const rows = text.split('\n').filter(row => row.trim() !== ''); // Separar por nova linha, filtrar linhas vazias
            const tableData = rows.map(row => row.split('\t')); // Separar cada linha por tab (assumindo valor separado por tab)

            // tableData  é uma matriz, pronta para criar a tabela
            buildHtmlTable(tableData);
        }

        function buildHtmlTable(data) {
            // tabela a ser inserida
            tableContainer.innerHTML = ''; // Limpar conteúdo prévio

            const table = document.createElement('table');
            table.border = '1';
            table.id = "tabelaNotas";

            // 1. Criar o THEAD
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            // Criar célula para 'Nome'
            const thNome = document.createElement('th');
            thNome.textContent = 'Nome';
            headerRow.appendChild(thNome);

            // Criar célula para 'Nota'
            const thNota = document.createElement('th');
            thNota.textContent = 'Nota';
            headerRow.appendChild(thNota);

            // Adicionar a linha de cabeçalho ao thead
            thead.appendChild(headerRow);
            // Adicionar o thead à tabela
            table.appendChild(thead);

            // 2. Criar o TBODY (Opcional, mas boa prática para organizar o corpo da tabela)
            const tbody = document.createElement('tbody');

            // 3. Iterar sobre os dados e adicionar ao TBODY
            data.forEach(rowData => {
                const tr = document.createElement('tr');
                rowData.forEach(cellData => {
                    const td = document.createElement('td');
                    td.textContent = cellData;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr); // Adicionar linha ao tbody, não diretamente à tabela
            });

            // Adicionar o tbody à tabela
            table.appendChild(tbody);
            tableContainer.appendChild(table);
        }
    });

    //Criar botão para setar notas aos alunos
    const botaoSalvar = document.createElement("button");
    botaoSalvar.className = "btn btn-primary";
    botaoSalvar.title = "Ao clicar, os valores da tabela serão incluídos na tabela automaticamente, VALIDE OS VALORES ANTES DE SALVAR";
    botaoSalvar.textContent = "Aplicar Notas";
    botaoSalvar.style = "padding: 5px; margin-bottom: 5px; width:50%;display: block;margin: 5px auto;";
    botaoSalvar.onclick = () => {
        AplicarNotas();
    };

    // Monta a estrutura
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(modalText);
    modalContent.appendChild(myPasteTarget);
    modalContent.appendChild(tableContainer);
    modalContent.appendChild(botaoSalvar);
    modal.appendChild(modalContent);

    // Adiciona o modal ao corpo do documento
    document.body.appendChild(modal);

}
    // Função para abrir o modal (adiciona a classe show-modal)
function openModal() {
    const modal = document.getElementById('myModal');
    if (modal) {
        modal.classList.add('meu-modal-show');
    }
}

// Função para fechar o modal (remove a classe show-modal ou define display none)
function closeModal() {
    const modal = document.getElementById('myModal');
    if (modal) {
        modal.classList.remove('meu-modal-show');
    }
}

// Fecha o modal se o usuário clicar fora do conteúdo
window.onclick = function(event) {
    const modal = document.getElementById('myModal');
    if (event.target === modal) {
        closeModal();
    }
}

function inicializar(){

    const botao = document.createElement("button");
    botao.className = "btn btn-secondary";
    botao.title = "Lance notas automaticamente por uma planilha";
    botao.style = "padding: 5px; margin-bottom: 5px; width:50%;";
    botao.onclick = () => {
        openModal();
    };
    botao.textContent = "Lançar notas por planilha";
    waitForKeyElements(".dt-layout-cell.dt-end", function(){
        createAndAppendModal();

        const divPesquisa = document.querySelector(".dt-layout-cell.dt-end");
        if(divPesquisa != null){
            divPesquisa.prepend(botao);
        }
    });
    waitForKeyElements("[name='tableDiarioClasse_length']", function(){
        //Setar quantidade alunos padrão pra 100
        const selectAlunos = document.querySelector("[name='tableDiarioClasse_length']");
        if(selectAlunos != null){
            selectAlunos.value=100;
            selectAlunos.dispatchEvent(new Event('change'));
        }
    });
}

(function() {
    'use strict';

        GM_addStyle(`
        .meu-modal {
    display: none;
    position: fixed;
    z-index: 1;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    justify-content: center;
    align-items: center;
}

.meu-modal-content {
    background-color: #fefefe;
    padding: 20px;
    border: 1px solid #888;
    width: 50%;
    border-radius: 5px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    max-height: 580px;
    overflow-y: auto;
}

.meu-modal-close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
}

.meu-modal-close:hover,
.meu-modal-close:focus {
    color: #000;
    text-decoration: none;
    cursor: pointer;
}

.meu-modal-show {
   display: flex;
}
#tabelaNotas{
   margin: 5px auto;
}
#tabelaNotas td,#tabelaNotas th{
   border: 1px solid black;
   padding: 2px;
   text-align: left;
}
    `);

    waitForKeyElements("#tableDiarioClasse", inicializar);

})();