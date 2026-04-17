/**
 * Classe que representa uma conta bancária com encapsulamento.
 */
class ContaBancaria {
    #saldo; // Atributo privado usando Private Fields do ES2020
    #transacoes; // Histórico de transações

    constructor(titular, saldoInicial = 0) {
        if (saldoInicial < 0) {
            throw new Error("O saldo inicial não pode ser negativo.");
        }
        this.titular = titular;
        this.#saldo = parseFloat(saldoInicial);
        this.#transacoes = [];
        this.ativa = true;

        if (this.#saldo > 0) {
            this.#adicionarTransacao('Saldo Inicial', this.#saldo);
        }
    }

    #adicionarTransacao(tipo, valor) {
        this.#transacoes.unshift({
            tipo,
            valor,
            data: new Date().toLocaleString('pt-BR')
        });
    }

    depositar(valor) {
        const v = parseFloat(valor);
        if (v > 0) {
            this.#saldo += v;
            this.#adicionarTransacao('Depósito', v);
            return true;
        }
        return false;
    }

    sacar(valor) {
        const v = parseFloat(valor);
        if (v > 0 && v <= this.#saldo) {
            this.#saldo -= v;
            this.#adicionarTransacao('Saque', -v);
            return true;
        }
        return false;
    }

    obterSaldo() {
        return this.#saldo;
    }

    obterTransacoes() {
        return [...this.#transacoes];
    }

    encerrarConta() {
        const saldoFinal = this.#saldo;
        if (saldoFinal > 0) {
            this.#adicionarTransacao('Retirada Final', -saldoFinal);
        }
        this.#saldo = 0;
        this.ativa = false;
        return saldoFinal;
    }
}

/**
 * Gerenciamento da Interface e Lógica do App
 */
const App = {
    contas: {}, // Dicionário de contas (chave: nome)

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.atualizarUI();
    },

    cacheDOM() {
        this.inputNome = document.getElementById('nomeTitular');
        this.inputSaldoInicial = document.getElementById('saldoInicial');
        this.btnCriar = document.getElementById('btnCriarConta');
        
        this.selectConta = document.getElementById('selectConta');
        this.inputValor = document.getElementById('valorOperacao');
        this.btnDepositar = document.getElementById('btnDepositar');
        this.btnSacar = document.getElementById('btnSacar');
        this.btnExtrato = document.getElementById('btnExtrato');
        this.btnEncerrar = document.getElementById('btnEncerrar');

        this.tabelaCorpo = document.querySelector('#tabelaContas tbody');
        
        this.modal = document.getElementById('modalExtrato');
        this.modalConteudo = document.getElementById('extratoConteudo');
        this.modalClose = document.querySelector('.close');
        
        this.notifications = document.getElementById('notificationContainer');
    },

    bindEvents() {
        this.btnCriar.onclick = () => this.handleCriarConta();
        this.btnDepositar.onclick = () => this.handleOperacao('depositar');
        this.btnSacar.onclick = () => this.handleOperacao('sacar');
        this.btnExtrato.onclick = () => this.handleVerExtrato();
        this.btnEncerrar.onclick = () => this.handleEncerrar();
        
        this.modalClose.onclick = () => this.modal.style.display = 'none';
        window.onclick = (e) => {
            if (e.target == this.modal) this.modal.style.display = 'none';
        };
    },

    notify(msg, type = 'info') {
        const div = document.createElement('div');
        div.className = `notification ${type}`;
        div.innerHTML = `
            <div class="notif-content">${msg}</div>
        `;
        this.notifications.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    },

    notifyEncerramento(titular, saldoFinal) {
        const div = document.createElement('div');
        div.className = 'notification notification-special';
        const valorFormatado = saldoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        div.innerHTML = `
            <div class="notif-icon">🔒</div>
            <div class="notif-content">
                <span class="notif-title">Conta Encerrada</span>
                <span class="notif-text">A conta de <strong>${titular}</strong> foi finalizada.</span>
                <span class="notif-text">Saldo devolvido: <span class="notif-value">${valorFormatado}</span></span>
            </div>
        `;
        
        this.notifications.appendChild(div);
        setTimeout(() => div.remove(), 6000);
    },

    handleCriarConta() {
        const nome = this.inputNome.value.trim();
        const saldo = this.inputSaldoInicial.value || 0;

        if (!nome) return this.notify("O nome do titular é obrigatório.", "error");
        if (this.contas[nome]) return this.notify("Já existe uma conta com este nome.", "error");

        try {
            this.contas[nome] = new ContaBancaria(nome, saldo);
            this.notify(`Conta de ${nome} criada com sucesso!`, "success");
            this.inputNome.value = '';
            this.inputSaldoInicial.value = '';
            this.atualizarUI();
        } catch (err) {
            this.notify(err.message, "error");
        }
    },

    handleOperacao(tipo) {
        const nome = this.selectConta.value;
        const valor = parseFloat(this.inputValor.value);

        if (!nome) return this.notify("Selecione uma conta ativa.", "error");
        if (isNaN(valor) || valor <= 0) return this.notify("Digite um valor válido maior que zero.", "error");

        const conta = this.contas[nome];
        if (!conta || !conta.ativa) return this.notify("Conta não encontrada ou encerrada.", "error");

        const sucesso = tipo === 'depositar' ? conta.depositar(valor) : conta.sacar(valor);

        if (sucesso) {
            this.notify(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} de R$ ${valor.toFixed(2)} realizado!`, "success");
            this.inputValor.value = '';
            this.atualizarUI();
        } else {
            this.notify(tipo === 'sacar' ? "Saldo insuficiente." : "Erro na operação.", "error");
        }
    },

    handleVerExtrato() {
        const nome = this.selectConta.value;
        if (!nome) return this.notify("Selecione uma conta.", "error");

        const conta = this.contas[nome];
        if (!conta) return this.notify("Conta não encontrada.", "error");

        const saldo = conta.obterSaldo().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const transacoes = conta.obterTransacoes();
        
        let transacoesHTML = '';
        if (transacoes.length === 0) {
            transacoesHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Nenhuma transação registrada.</p>';
        } else {
            transacoesHTML = transacoes.map(t => `
                <div class="transacao-item">
                    <div class="transacao-info">
                        <span class="transacao-tipo">${t.tipo}</span>
                        <span class="transacao-data">${t.data}</span>
                    </div>
                    <span class="transacao-valor ${t.valor >= 0 ? 'valor-positivo' : 'valor-negativo'}">
                        ${t.valor >= 0 ? '+' : ''}${t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                </div>
            `).join('');
        }

        this.modalConteudo.innerHTML = `
            <div class="extrato-container">
                <div class="extrato-header">
                    <h3>EXTRATO</h3>
                    <p>Relatório detalhado da sua conta</p>
                </div>
                
                <div class="extrato-info-card">
                    <div class="extrato-row">
                        <span class="extrato-label">Titular</span>
                        <span class="extrato-value">${conta.titular}</span>
                    </div>
                    <div class="extrato-row">
                        <span class="extrato-label">Status da Conta</span>
                        <span class="extrato-value ${conta.ativa ? 'status-ativa' : 'status-encerrada'}">
                            ${conta.ativa ? 'ATIVA' : 'ENCERRADA'}
                        </span>
                    </div>
                </div>

                <div class="transacoes-titulo">
                    <span>🕒 Histórico Recente</span>
                </div>
                
                <div class="transacoes-lista">
                    ${transacoesHTML}
                </div>

                <div class="extrato-saldo-container">
                    <span class="extrato-saldo-label">SALDO DISPONÍVEL</span>
                    <span class="extrato-saldo-valor">${saldo}</span>
                </div>
            </div>
        `;
        this.modal.style.display = 'block';
    },

    handleEncerrar() {
        const nome = this.selectConta.value;
        if (!nome) return this.notify("Selecione uma conta.", "error");

        const conta = this.contas[nome];
        if (!conta || !conta.ativa) return this.notify("Esta conta já está encerrada.", "error");

        if (confirm(`Deseja realmente encerrar a conta de ${nome}? Esta ação é irreversível.`)) {
            const saldoFinal = conta.encerrarConta();
            this.notifyEncerramento(nome, saldoFinal);
            this.atualizarUI();
        }
    },

    atualizarUI() {
        // Atualizar Select
        const currentSelection = this.selectConta.value;
        this.selectConta.innerHTML = '<option value="">Selecione uma conta...</option>';
        
        // Atualizar Tabela
        this.tabelaCorpo.innerHTML = '';

        Object.keys(this.contas).forEach(nome => {
            const conta = this.contas[nome];
            
            // Adicionar ao Select apenas se estiver ativa
            if (conta.ativa) {
                const option = document.createElement('option');
                option.value = nome;
                option.textContent = nome;
                this.selectConta.appendChild(option);
            }

            // Adicionar à Tabela
            const tr = document.createElement('tr');
            const saldoFormatado = conta.ativa 
                ? conta.obterSaldo().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : '---';
            
            tr.innerHTML = `
                <td>${nome}</td>
                <td class="${conta.ativa ? 'status-ativa' : 'status-encerrada'}">
                    ${conta.ativa ? 'Ativa' : 'Encerrada'}
                </td>
                <td>${saldoFormatado}</td>
            `;
            this.tabelaCorpo.appendChild(tr);
        });

        if (currentSelection && this.contas[currentSelection] && this.contas[currentSelection].ativa) {
            this.selectConta.value = currentSelection;
        }
    }
};

// Iniciar app
document.addEventListener('DOMContentLoaded', () => App.init());
