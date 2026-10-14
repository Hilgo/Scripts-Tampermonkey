// ==UserScript==
// @name         Sala do Futuro - Melhorias tela de lançamento de Fechamento 
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Melhorias tela de lançamento de fechamento - Arredondar notas automaticamente e melhoria exibição disciplina
// @author       Lucas Palma Stabile - github.com/Hilgo
// @icon         https://saladofuturoprofessor.educacao.sp.gov.br/favicon.ico
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @match        https://saladofuturoprofessor.educacao.sp.gov.br/diario-classe__fechamento___lancamentoDetalhes
// @updateURL   https://github.com/Hilgo/Scripts-Tampermonkey/raw/refs/heads/main/Sala%20do%20Futuro/melhorias_fechamento.user.js
// @downloadURL https://github.com/Hilgo/Scripts-Tampermonkey/raw/refs/heads/main/Sala%20do%20Futuro/melhorias_fechamento.user.js
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

function executarAjustes() {
    // Seleciona todos os spans com a classe "font-cabecalho-filtro"
    const spans = document.querySelectorAll('span.font-cabecalho-filtro');

    // Itera pelos spans para encontrar o que contém "<b>Disciplina:</b>"
    spans.forEach(span => {
        const boldElement = span.querySelector('b');
        if (boldElement && boldElement.textContent.trim() === "Disciplina:") {
            // Obtém o texto após o <b>
            const textoDisciplina = span.textContent.replace("Disciplina:", "").trim();
            console.log(textoDisciplina); // Exibe "Programação Mobile" no console

            // Adiciona o texto da disciplina ao breadcrumb e altera se já existir
            const breadcrumb = document.querySelector('ol.breadcrumb');
            // Cria o elemento <strong> para o texto da disciplina
            const strong = document.createElement('strong');
            strong.id = "texto-disciplina-breadcrumb";

            if (breadcrumb) {
                if(document.querySelector("#texto-disciplina-breadcrumb"))
                {
                    document.querySelector("#texto-disciplina-breadcrumb").textContent = textoDisciplina;
                }
                else{
                    const li = document.createElement('li');
                    li.className = 'breadcrumb-item active'; // Define a classe do item
                    li.id = "nome-disciplina-breadcrumb";
                    li.setAttribute('aria-current', 'page'); // Define o atributo de acessibilidade
                    
                    strong.textContent = textoDisciplina;
    
                    // Adiciona o elemento <strong> ao <li>
                    li.appendChild(strong);
    
                    // Adiciona o item ao final do breadcrumb
                    breadcrumb.appendChild(li);
                }
            }
        }
    });
    var opcoesHeader = document.querySelector(".position-sticky");

    if (!document.querySelector("#btn-arrendondar")) {
        const botaoArredondar = document.createElement("button");
        botaoArredondar.className = "btn btn-primary";
        botaoArredondar.id = "btn-arrendondar";
        botaoArredondar.title = "Ao clicar, os valores das notas dos alunos serão arrendondados (acima de 0,5 a nota é arrendondada para cima)";
        botaoArredondar.textContent = "Arredondar Notas";
        botaoArredondar.style = "padding: 5px; width: 50%;";
        botaoArredondar.style.width = '20%';
        botaoArredondar.style.position = 'fixed';
        botaoArredondar.style.bottom = '20px';
        botaoArredondar.style.left = '25%';
        botaoArredondar.style.zIndex = '1000'; 
        botaoArredondar.onclick = () => {
            arrendondarNotas()
        };
        opcoesHeader.appendChild(botaoArredondar);
    }

}

function arrendondarNotas() {
    // Seleciona todas as divs com a classe "card_aluno"
    const cardsAlunos = document.querySelectorAll('div.card_aluno');

    // Itera por cada card de aluno
    cardsAlunos.forEach(card => {
        // Seleciona o segundo "grup_faltas" dentro do card
        const grupFaltas = card.querySelectorAll('div.grup_faltas')[1]; // O índice 1 é o segundo elemento

        if (grupFaltas) {
            // Seleciona a label e verifica se o texto é "Nota"
            const labelNota = grupFaltas.querySelector('label');
            if (labelNota && labelNota.textContent.trim() === "Nota") {
                // Seleciona o input do tipo "number" dentro do grup_faltas
                const inputNota = grupFaltas.querySelector('input[type="number"]');
                if (inputNota) {
                    const valorOriginal = parseFloat(inputNota.value); // Converte o valor para número quebrado
                    if (!isNaN(valorOriginal)) {
                        console.log(`Valor original: ${valorOriginal}`); // Exibe o valor original no console

                        // Arredonda o valor de acordo com a regra
                        const valorArredondado = valorOriginal % 1 >= 0.5 ? Math.ceil(valorOriginal) : Math.floor(valorOriginal); // Arredonda para o próximo inteiro se >= 0.5
                        inputNota.value = valorArredondado.toFixed(1); // Define o valor arredondado no input

                        // Adiciona a borda verde para destacar o campo alterado
                        inputNota.style.border = '2px solid green';

                        console.log(`Valor arredondado: ${valorArredondado}`); // Exibe o valor arredondado no console

                        // Cria um novo div para exibir o valor original
                        const divValorOriginal = document.createElement('div');
                        divValorOriginal.className = 'grup_faltas'; // Define a classe do novo div
                        divValorOriginal.style.marginTop = '10px'; // Adiciona um espaçamento para separação

                        // Adiciona o texto com o valor original
                        divValorOriginal.textContent = `Nota Original: ${valorOriginal.toFixed(2)}`;

                        // Adiciona o novo div após o grup_faltas atual
                        grupFaltas.parentNode.appendChild(divValorOriginal);
                    }
                }
            }
        }
    });
}

(function () {
    'use strict';
    waitForKeyElements("#btnSalvar", executarAjustes);
})();