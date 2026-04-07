class Modulo {
    constructor(id, nome, descricao, dataCriacao, aulas, atividades, recursos, questoes, avaliacoes, duracao, nivel, tags, requisitos, certificado) {
        this.id = id;
        this.nome = nome;
        this.descricao = descricao;
        this.dataCriacao = dataCriacao;
        this.aulas = aulas || [];
        this.atividades = atividades || [];
        this.recursos = recursos || [];
        this.questoes = questoes || [];
        this.avaliacoes = avaliacoes || [];
        this.duracao = duracao || 0;
        this.nivel = nivel || "iniciante";
        this.tags = tags || [];
        this.requisitos = requisitos || [];
        this.certificado = certificado || false;
    }

    adicionarAula(aula) {
        this.aulas.push(aula);
    }

    removerAula(aulaId) {
        this.aulas = this.aulas.filter(a => a.id !== aulaId);
    }

    adicionarAtividade(atividade) {
        this.atividades.push(atividade);
    }

    removerAtividade(atividadeId) {
        this.atividades = this.atividades.filter(a => a.id !== atividadeId);
    }

    adicionarRecurso(recurso) {
        this.recursos.push(recurso);
    }

    removerRecurso(recursoId) {
        this.recursos = this.recursos.filter(r => r.id !== recursoId);
    }

    adicionarQuestao(questao) {
        this.questoes.push(questao);
    }

    removerQuestao(questaoId) {
        this.questoes = this.questoes.filter(q => q.id !== questaoId);
    }

    adicionarAvaliacao(avaliacao) {
        this.avaliacoes.push(avaliacao);
    }

    removerAvaliacao(avaliacaoId) {
        this.avaliacoes = this.avaliacoes.filter(a => a.id !== avaliacaoId);
    }

    adicionarTag(tag) {
        this.tags.push(tag);
    }

    removerTag(tagId) {
        this.tags = this.tags.filter(t => t.id !== tagId);
    }

    calcularDuracaoTotal() {
        let total = this.duracao;
        this.aulas.forEach(aula => {
            if (aula.duracao) total += aula.duracao;
        });
        this.atividades.forEach(atividade => {
            if (atividade.duracao) total += atividade.duracao;
        });
        return total;
    }
}

module.exports = Modulo;