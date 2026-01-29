import moment from 'moment';

export const useFunctions = () => {

    const { setAlert } = useAlert();

    const typesAgendamentoDefault = [
        { title: "Serviço", value: "servico", icon: "tabler-tools", emoji: "🔧" },
        {
            title: "Orçamento/Visita Ténica",
            value: "orcamento",
            icon: "tabler-file-text",
            emoji: "📝",
        },
        { title: "Bloqueio de Horário", value: "bloqueio", icon: "tabler-lock", emoji: "🔒" },
        { title: "Retrabalho", value: "retrabalho", icon: "tabler-refresh", emoji: "🔄" },
    ];

    const typesAgendamento = ref([...typesAgendamentoDefault]);

    const getTiposAgendamento = async () => {
        try {
            const res = await $api("/config/get-tipos-agendamento");

            if (Array.isArray(res)) {
                let newTypesAgendamento = res.map(type => {
                    return {
                        ...type,
                        title: type.name,
                        value: type.name,
                        icon: type.icon,
                        emoji: type.icon ? type.icon : null
                    };
                });
                typesAgendamento.value = [...typesAgendamentoDefault, ...newTypesAgendamento];
            } else {
                typesAgendamento.value = [...typesAgendamentoDefault];
            }
        } catch (error) {
            console.error(
                "Erro ao buscar tipos de agendamento:",
                error,
                error.response
            );
            typesAgendamento.value = [...typesAgendamentoDefault];
        }
    };

    getTiposAgendamento();

    const goTo = (url) => !url ? null : window.open(url, '_blank');

    const tratarNome = (nome) => {
        if (typeof nome !== 'string') return 'Sem Nome';

        // Remover acentos com normalize
        nome = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Retorna o nome "limpo", sem acentos
        return nome;
    };

    const limparHTML = (html) => {
        if (typeof html !== 'string') return '';

        // Remove tags HTML
        html = html.replace(/<[^>]*>?/gm, '');

        // Retorna o texto limpo, sem tags HTML
        return html;
    };

    const tratarHtml = (html) => {
        //Tratar HTML para impedir XSS
        if (typeof html !== 'string') return '';

        // Retorna o HTML tratado
        return html.replace(/<\/?(script|style|html|head|body)[^>]*>/gi, '')
            .replace(/ on\w+="[^"]*"/g, '')
            .replace(/ on\w+=\w+/g, '')
            .replace(/ on\w+='\w+'/g, '')
            .replace(/<!--[\s\S]*?-->/g, '');

    }

    const getCep = async (cep) => {

        if (!cep) return null;

        let cepLimpo = cep.replace(/\D/g, '');

        if (cepLimpo.length !== 8) return null;

        try {
            //Fazer fetch no viacep
            let response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            response = await response.json();

            return response;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    const escreverEndereco = (endereco) => {
        if (!endereco) return '';

        endereco = {
            end_logradouro: endereco.end_logradouro || endereco.logradouro || '',
            end_numero: endereco.end_numero || endereco.numero || '',
            end_bairro: endereco.end_bairro || endereco.bairro || '',
            end_cidade: endereco.end_cidade || endereco.cidade || '',
            end_estado: endereco.end_estado || endereco.estado || '',
            end_cep: endereco.end_cep || endereco.cep || '',
            end_complemento: endereco.end_complemento || endereco.complemento || '',
        }

        // ----------- Formato Brasileiro -----------
        const partes = [];

        let linha1 = [endereco.end_logradouro, endereco.end_numero]
            .filter(Boolean)
            .join(', ');
        if (linha1) partes.push(linha1);

        if (endereco.end_bairro) partes.push(endereco.end_bairro);

        let cidadeEstado = [endereco.end_cidade, endereco.end_estado]
            .filter(Boolean)
            .join('/');
        if (cidadeEstado) partes.push(cidadeEstado);

        if (endereco.end_cep) partes.push(`${endereco.end_cep}`);

        if (endereco.end_complemento) partes.push(` - ${endereco.end_complemento}`);
        return partes.join(' - ');
    };

    const getCidades = async (uf) => {
        //`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`

        if (!uf) return null;

        try {
            //Fazer fetch
            let response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
            response = await response.json();

            return response.map(cidade => {
                return { title: cidade.nome, value: cidade.nome };
            });
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    const estados = [
        { title: 'Acre', value: 'AC' },
        { title: 'Alagoas', value: 'AL' },
        { title: 'Amapá', value: 'AP' },
        { title: 'Amazonas', value: 'AM' },
        { title: 'Bahia', value: 'BA' },
        { title: 'Ceará', value: 'CE' },
        { title: 'Distrito Federal', value: 'DF' },
        { title: 'Espírito Santo', value: 'ES' },
        { title: 'Goiás', value: 'GO' },
        { title: 'Maranhão', value: 'MA' },
        { title: 'Mato Grosso', value: 'MT' },
        { title: 'Mato Grosso do Sul', value: 'MS' },
        { title: 'Minas Gerais', value: 'MG' },
        { title: 'Pará', value: 'PA' },
        { title: 'Paraíba', value: 'PB' },
        { title: 'Paraná', value: 'PR' },
        { title: 'Pernambuco', value: 'PE' },
        { title: 'Piauí', value: 'PI' },
        { title: 'Rio de Janeiro', value: 'RJ' },
        { title: 'Rio Grande do Norte', value: 'RN' },
        { title: 'Rio Grande do Sul', value: 'RS' },
        { title: 'Rondônia', value: 'RO' },
        { title: 'Roraima', value: 'RR' },
        { title: 'Santa Catarina', value: 'SC' },
        { title: 'São Paulo', value: 'SP' },
        { title: 'Sergipe', value: 'SE' },
        { title: 'Tocantins', value: 'TO' },
    ];


    const copyEndereco = (endereco) => {
        if (!endereco) return;
        navigator.clipboard.writeText(escreverEndereco(endereco));
        setAlert('Endereço copiado para a área de transferência!', 'success', 'tabler-check', 3000)
    }

    const enderecoWaze = (endereco) => {
        if (!endereco) return;
        const query = escreverEndereco(endereco);
        window.open(`https://www.waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`, '_blank');
    }

    const enderecoMaps = (endereco) => {
        if (!endereco) return;
        const query = escreverEndereco(endereco);
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    }

    const formatValue = (value) => {
        if (!value) return 'R$ 0,00';

        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    const formatDateAgendamento = (date, horaInicio = null, horaFim = null) => {
        if (!date) return '';

        let formattedDate = moment(date).format('DD/MM/YYYY');

        if (horaInicio) {
            formattedDate += ` - ${moment(horaInicio, 'HH:mm:ss').format('HH:mm')}`;
        }

        if (horaFim) {
            formattedDate += ` às ${moment(horaFim, 'HH:mm:ss').format('HH:mm')}`;
        }

        return formattedDate;
    }

    const debounce = (fn, delay = 500) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn(...args), delay);
        }
    }

    return {
        tratarNome,
        limparHTML,
        tratarHtml,
        getCep,
        escreverEndereco,
        getCidades,
        estados,
        copyEndereco,
        enderecoWaze,
        enderecoMaps,
        goTo,
        formatValue,
        formatDateAgendamento,
        typesAgendamento,
        debounce
    }
}
