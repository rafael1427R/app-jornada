class Grupo {
    constructor(id, nome, descricao, dataCriacao, membros, permissoes) {
        this.id = id;
        this.nome = nome;
        this.descricao = descricao;
        this.dataCriacao = dataCriacao;
        this.membros = membros || [];
        this.permissoes = permissoes || [];
    }

    adicionarMembro(membro) {
        this.membros.push(membro);
    }

    removerMembro(membroId) {
        this.membros = this.membros.filter(m => m.id !== membroId);
    }

    adicionarPermissao(permissao) {
        this.permissoes.push(permissao);
    }

    removerPermissao(permissaoId) {
        this.permissoes = this.permissoes.filter(p => p.id !== permissaoId);
    }
}

module.exports = Grupo;