class Participante {
    constructor(id, nome, email, dataCadastro, cursosInscritos, progresso, certificados, conquistas) {
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.dataCadastro = dataCadastro;
        this.cursosInscritos = cursosInscritos || [];
        this.progresso = progresso || {};
        this.certificados = certificados || [];
        this.conquistas = conquistas || [];
    }

    inscreverCurso(cursoId) {
        if (!this.cursosInscritos.includes(cursoId)) {
            this.cursosInscritos.push(cursoId);
            this.progresso[cursoId] = 0;
            return true;
        }
        return false;
    }

    desinscreverCurso(cursoId) {
        const index = this.cursosInscritos.indexOf(cursoId);
        if (index !== -1) {
            this.cursosInscritos.splice(index, 1);
            delete this.progresso[cursoId];
            return true;
        }
        return false;
    }

    atualizarProgresso(cursoId, percentual) {
        if (this.cursosInscritos.includes(cursoId)) {
            this.progresso[cursoId] = Math.min(100, Math.max(0, percentual));
            return true;
        }
        return false;
    }

    obterProgresso(cursoId) {
        return this.progresso[cursoId] || 0;
    }

    adicionarCertificado(certificado) {
        this.certificados.push(certificado);
    }

    adicionarConquista(conquista) {
        this.conquistas.push(conquista);
    }

    calcularProgressoTotal() {
        if (this.cursosInscritos.length === 0) return 0;

        let total = 0;
        for (let cursoId of this.cursosInscritos) {
            total += this.progresso[cursoId] || 0;
        }
        return total / this.cursosInscritos.length;
    }

    obterCursosConcluidos() {
        return this.cursosInscritos.filter(cursoId =>
            (this.progresso[cursoId] || 0) >= 100
        );
    }
}

module.exports = Participante;