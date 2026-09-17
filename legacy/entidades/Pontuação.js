class Pontuacao {
    constructor(id, participanteId, pontos, data, tipo, descricao, moduloId, atividadeId, questaoId, cursoId) {
        this.id = id;
        this.participanteId = participanteId;
        this.pontos = pontos || 0;
        this.data = data || new Date();
        this.tipo = tipo || "geral";
        this.descricao = descricao || "";
        this.moduloId = moduloId || null;
        this.atividadeId = atividadeId || null;
        this.questaoId = questaoId || null;
        this.cursoId = cursoId || null;
    }

    adicionarPontos(valor) {
        this.pontos += valor;
        return this.pontos;
    }

    removerPontos(valor) {
        this.pontos = Math.max(0, this.pontos - valor);
        return this.pontos;
    }

    atualizarPontos(novoValor) {
        this.pontos = Math.max(0, novoValor);
        return this.pontos;
    }

    obterNivel() {
        if (this.pontos < 100) return "Iniciante";
        if (this.pontos < 500) return "Bronze";
        if (this.pontos < 1000) return "Prata";
        if (this.pontos < 5000) return "Ouro";
        if (this.pontos < 10000) return "Platina";
        return "Diamante";
    }

    obterProgressoProximoNivel() {
        const niveis = [100, 500, 1000, 5000, 10000];
        for (let nivel of niveis) {
            if (this.pontos < nivel) {
                return {
                    pontosAtuais: this.pontos,
                    pontosNecessarios: nivel,
                    percentual: (this.pontos / nivel) * 100
                };
            }
        }
        return {
            pontosAtuais: this.pontos,
            pontosNecessarios: this.pontos,
            percentual: 100
        };
    }

    registrarAtividade(tipoAtividade, valor) {
        this.tipo = tipoAtividade;
        this.adicionarPontos(valor);
        this.data = new Date();
        this.descricao = `${tipoAtividade}: +${valor} pontos`;
        return this;
    }

    ehPontuacaoValida() {
        return this.pontos >= 0 && this.participanteId && this.id;
    }

    formatarParaSalvar() {
        return {
            id: this.id,
            participanteId: this.participanteId,
            pontos: this.pontos,
            data: this.data.toISOString(),
            tipo: this.tipo,
            descricao: this.descricao,
            moduloId: this.moduloId,
            atividadeId: this.atividadeId,
            questaoId: this.questaoId,
            cursoId: this.cursoId
        };
    }

    static criarPontuacaoInicial(participanteId) {
        return new Pontuacao(
            Date.now().toString(),
            participanteId,
            0,
            new Date(),
            "inicial",
            "Pontuação inicial do participante",
            null,
            null,
            null,
            null
        );
    }

    static somarPontuacoes(pontuacoes) {
        return pontuacoes.reduce((total, p) => total + p.pontos, 0);
    }
}

module.exports = Pontuacao;