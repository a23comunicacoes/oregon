const PDFDocument = require('pdfkit');
const path = require("path");
const fs = require('fs');
const PDFTable = require('pdfkit-table');
const { PDFDocument: PDFDocumentL, StandardFonts, rgb } = require('pdf-lib');
const moment = require('moment');

const outputPath = path.join(__dirname, '../files/certificados');
const outputPathRecibos = path.join(__dirname, '../files/recibos');
const outputPathRelatorios = path.join(__dirname, '../files/relatorios');
const outputPathOrdensServico = path.join(__dirname, '../files/ordens-servico');

const logoPath = path.join(__dirname, '../email-templates/images/logo.png');
const assinaturaPath = path.join(__dirname, '../email-templates/images/assinatura-david.png');

const bgCertificado = path.join(__dirname, '../email-templates/images/bg-certificado.png');
const montserratFont = path.join(__dirname, '../email-templates/fonts/Montserrat/Montserrat-Regular.ttf');
const montserratBoldFont = path.join(__dirname, '../email-templates/fonts/Montserrat/Montserrat-Bold.ttf');

//Helper para transformar o nome em cada primeira letra de palavra em maiuscula se tiver mais de 3 letras
const capitalizeName = (name) => {
    if (!name) return '';
    name = name.toLowerCase().trim();
    return name.split(' ').map(word => word.length > 3 ? word.charAt(0).toUpperCase() + word.slice(1) : word).join(' ');
}

const formatValor = (valor) => {
    if (!valor) return 'R$ 0,00'
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

async function createCertificate(data) {
    try {
        console.log('Criando certificado: ', data);
        // Certifique-se de que o diretório de saída existe
        const certDir = path.join(outputPath, data.age_id.toString());
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape',
            margins: {
                top: 270,
                bottom: 20,
                left: 20,
                right: 20
            }
        });

        // Pipe the PDF into a writable stream
        const filePath = path.join(certDir, `Certificado ${data.name}.pdf`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc
            .image(bgCertificado, 0, 0, { width: doc.page.width });


        let isCPF = data.cpf.includes('/') ? 'CNPJ' : 'CPF';

        /* .text(`Certificamos que ${capitalizeName(data.name)
            }${data.cpf ? `, portadora do ${isCPF}: ${data.cpf
                }` : ''}, localizada(o) na ${data.endereco
            }, realizou ${data.services.length == 1 ? 'o serviço' : 'os serviços'
            } de ${data.services.join(', ')}.`,
            100, doc.y, { align: 'center', continued: true, width: doc.page.width - 200 })
*/

        const margin = 100;
        const width = doc.page.width - margin * 2;


        doc
            .font(montserratFont)
            .fontSize(14)
            .fillColor('#16375b')
            .text('Certificamos que ', margin, doc.y, { width, continued: true })
            .font(montserratBoldFont).text(capitalizeName(data.name), { continued: true })
            .font(montserratFont).text(
                `${data.cpf ? `, portadora do ${isCPF}: ${data.cpf}` : ''}, localizada(o) na ${data.endereco
                }, realizou os serviços de `,
                { width, continued: true }
            )
            .font(montserratBoldFont).text(
                `${data.services.join(', ')}`,
                { width, continued: true }
            )
            .font(montserratFont).text('.', { width });

        if (data.dataAplicacao || data.dataGarantia) {
            // Add the dates
            doc
                .moveDown(2)
                .font(montserratFont)
                .fillColor('#16375b')
            /* .text(
                `${data.dataAplicacao ? 'Aplicação: ' + data.dataAplicacao : ''}
                ${data.dataGarantia ? 'Validade: ' + data.dataGarantia : ''}`,  
                0, doc.y, { align: 'center' })*/
            if (data.dataAplicacao) {
                doc.text(
                    `${data.dataAplicacao ? 'Aplicação: ' + data.dataAplicacao : ''}`,
                    0, doc.y, { align: 'center' })
            }

            if (data.dataGarantia) {
                doc.text(
                    `${data.dataGarantia ? 'Validade: ' + data.dataGarantia : ''}`,
                    0, doc.y, { align: 'center' })
            }
            doc.moveDown(.2)
        }

        /*  if (data.dataGarantia) {
             doc
                 .font(montserratFont)
                 .fillColor('#16375b')
                 .text(`VALIDADE: ${data.dataGarantia}`, 0, doc.y, { align: 'center' });
         } */

        doc.moveDown(2);

        // Add the footer
        doc
            .fontSize(15)
            .font(montserratFont)
            .text(`São José, ${data.date}`, 0, 410, { align: 'center' });


        // Finalize the PDF and end the stream
        doc.end();

        // Aguardar o término da gravação do stream
        await new Promise(resolve => writeStream.on('finish', resolve));

        console.log('Certificado criado com sucesso!', filePath);
        return {
            filePath,
            fileName: `Certificado ${data.name}.pdf`
        };
    } catch (error) {
        throw new Error(`Erro ao gerar o certificado: ${error}`);
    }
}

async function createRecibo(data) {
    try {
        console.log('Criando recibo: ', data);

        // Certifique-se de que o diretório de saída existe
        const certDir = path.join(outputPathRecibos, data.age_id.toString());
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        const doc = new PDFDocument({
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            }
        });

        // Pipe the PDF into a writable stream
        const filePath = path.join(certDir, `Recibo ${data.name} - ${data.age_id}.pdf`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add the logo
        doc.image(logoPath, 50, 50, { width: 80 });

        // Add the header
        doc
            .fontSize(14)
            .text('Oregon Higienização de estofados e Ambientes', 150, 50)
            .fontSize(10)
            .text('CNPJ: 37.503.611/0001-62', 150, 69)
            .text('Contato: (48) 99174-9762', 150, 84)
            .text('E-mail: oregon.hiegienizacao@gmail.com', 150, 98);

        doc.moveDown();

        // Add a line
        doc.moveTo(50, 120)
            .lineTo(550, 120)
            .stroke();

        doc.moveDown(4);

        // Add the title
        doc
            .fontSize(16)
            .text('Recibo', 50, doc.y, { align: 'center', underline: true })
            .moveDown();

        // Add the body text
        doc
            .fontSize(12)
            .text(`Recebemos de `, 50, doc.y, { continued: true, width: 480, })
            .font('Helvetica-Bold')
            .text(`${data.name.toUpperCase()} ${data.cpf ? '- CPF:' + data.cpf : ''}`, { continued: true, width: 480 })
            .font('Helvetica')
            .text(`, Endereço: `, { continued: true, width: 480 })
            .font('Helvetica-Bold')
            .text(`${data.endereco.toUpperCase()}`, { width: 480 })
            .moveDown(1);

        doc
            .fontSize(12)
            .text(`O valor de `, 50, doc.y, { continued: true, width: 480 })
            .font('Helvetica-Bold')
            .text(`${data.valor} (${data.valorExtenso})`, { continued: true, width: 480 })
            .font('Helvetica')
            .text(` referente ${data.quantityServices == 1 ? 'ao serviço' : 'aos serviços'} de: `, { continued: true, width: 480 })
            .font('Helvetica-Bold')
            .text(`${data.services.join(', ')}`, { continued: true, width: 480 })
            .font('Helvetica')
            .text(`, ${data.quantityServices == 1 ? 'realizado' : 'realizados'} na data de `, { continued: true, width: 480 })
            .font('Helvetica-Bold')
            .text(`${data.date.toUpperCase()}. `, { continued: true, width: 480 })
            .moveDown(8);

        // Add the signature
        doc
            .image(assinaturaPath, 400, doc.y, { width: 135 });


        // Add the footer
        doc
            .moveDown(3)
            .fontSize(12)
            .text(`Biguaçu, ${data.dataRecibo}`, doc.x - 10, doc.y, { align: 'right', lineBreak: false });

        // Finalize the PDF and end the stream
        doc.end();

        // Aguardar o término da gravação do stream
        await new Promise(resolve => writeStream.on('finish', resolve));

        console.log('Recibo criado com sucesso!', filePath);
        return {
            filePath,
            fileName: `Recibo ${data.name} - ${data.age_id}.pdf`
        };
    } catch (error) {
        throw new Error(`Erro ao gerar o recibo: ${error}`);
    }
}

async function createRelatorioSaida(data) {
    try {
        console.log('Criando relatório de saída: ', data);

        // Certifique-se de que o diretório de saída existe
        const certDir = path.join(outputPathRelatorios);
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        const doc = new PDFTable({
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            }
        });

        // Data no formato dd-mm-aaaa
        const dataAtual = new Date();
        const dataFormatada = `${dataAtual.getDate()}-${dataAtual.getMonth() + 1}-${dataAtual.getFullYear()}`;

        // Pipe the PDF into a writable stream
        const filePath = path.join(certDir, `Relatório de saídas - ${dataFormatada}.pdf`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add the logo
        doc.image(logoPath, 50, 50, { width: 80 });

        // Add the header
        doc
            .fontSize(14)
            .text('Oregon Higienização de estofados e Ambientes', 150, 50)
            .fontSize(10)
            .text('CNPJ: 37.503.611/0001-62', 150, 69)
            .text('Contato: (48) 99174-9762', 150, 84)
            .text('E-mail: oregon.hiegienizacao@gmail.com', 150, 98);

        doc.moveDown();

        // Add a line
        doc.moveTo(50, 120)
            .lineTo(550, 120)
            .stroke();

        doc.moveDown(4);

        // Add the title
        doc
            .fontSize(13)
            .text(`Relatório de saídas ${data.mesText}`, 50, doc.y, { align: 'center', underline: true })
            .moveDown();

        // Define the table
        const table = {
            headers: [
                { label: 'DESCRIÇÃO', width: 180 },
                { label: 'DATA', width: 70 },
                { label: 'VALOR', width: 60 },
                { label: 'FORMA DE PGT.', width: 100 },
                { label: 'LANÇADA POR', width: 90 },
            ],
            rows: data.saidas.map(saida => [
                saida.sai_descricao,
                new Date(saida.sai_data).toLocaleDateString('pt-BR'),
                `R$ ${saida.sai_valor.toFixed(2).replace('.', ',')}`,
                saida.sai_fpt,
                saida.sai_user_name
            ])
        };

        // Add the table to the document
        doc.table(table, {
            x: 0,
            y: doc.y,
            padding: 5,
            columnSpacing: 5,
            minRowHeight: 20,
            prepareHeader: () => doc.fontSize(8).font("Helvetica-Bold"),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                doc.fontSize(10);
                doc.fillColor('#000000');
                doc.font("Helvetica");

                //Se a coluna for par, pinta de cinza
                if (indexRow % 2 === 0) {
                    doc.fillColor('#000000');
                    doc.addBackground(rectCell, '#f3f3f3', 1);
                }

            }
        });

        doc
            .moveDown(1)
            .fontSize(10)
            .font("Helvetica")
            .text(`Quantidade de saídas:`, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`${data.totalSaidas}`);

        doc
            .moveDown(0.3)
            .fontSize(10)
            .font("Helvetica")
            .text(`Valor total de saidas: `, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`R$ ${data.valorTotalSaidas.toFixed(2).replace('.', ',')}`, { continued: true });

        // Add the footer
        doc
            .moveDown(3)
            .fontSize(10)
            .font("Helvetica")
            .text(`Gerado em ${data.dataRelatorio}`, doc.x + 10, doc.y, { align: 'left', lineBreak: false });

        // Finalize the PDF and end the stream
        doc.end();

        // Aguardar o término da gravação do stream
        await new Promise(resolve => writeStream.on('finish', resolve));

        console.log('Relatório criado com sucesso!', filePath);
        return {
            filePath,
            fileName: `Relatório de saídas - ${dataFormatada}.pdf`
        };
    } catch (error) {
        throw new Error(`Erro ao gerar o Relatório: ${error}`);
    }
}

async function createRelatorioReceber(data) {
    try {
        console.log('Criando relatório de recebimento: ', data);

        // Certifique-se de que o diretório de saída existe
        const certDir = path.join(outputPathRelatorios);
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        const doc = new PDFTable({
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            }
        });

        // Data no formato dd-mm-aaaa
        const dataAtual = new Date();
        const dataFormatada = `${dataAtual.getDate()}-${dataAtual.getMonth() + 1}-${dataAtual.getFullYear()}`;

        // Pipe the PDF into a writable stream
        const filePath = path.join(certDir, `Relatório de recebimentos - ${dataFormatada}.pdf`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add the logo
        doc.image(logoPath, 50, 50, { width: 80 });

        // Add the header
        doc
            .fontSize(14)
            .text('Oregon Higienização de estofados e Ambientes', 150, 50)
            .fontSize(10)
            .text('CNPJ: 37.503.611/0001-62', 150, 69)
            .text('Contato: (48) 99174-9762', 150, 84)
            .text('E-mail: oregon.hiegienizacao@gmail.com', 150, 98);

        doc.moveDown();

        // Add a line
        doc.moveTo(50, 120)
            .lineTo(550, 120)
            .stroke();

        doc.moveDown(4);

        // Add the title
        doc
            .fontSize(13)
            .text(`Relatório de recebimentos ${data.mesText}`, 50, doc.y, { align: 'center', underline: true })
            .moveDown();

        // Define the table
        const table = {
            headers: [
                { label: 'CLIENTE', width: 180 },
                { label: 'DATA AGENDA.', width: 72 },
                { label: 'VALOR', width: 60 },
                { label: 'FORMA DE PGT.', width: 100 },
                { label: 'DATA PGTO.', width: 70 },
            ],
            rows: data.recebimentos.map(receber => [
                receber.cliente,
                new Date(receber.age_data).toLocaleDateString('pt-BR'),
                `R$ ${receber.pgt_valor.toFixed(2).replace('.', ',')}`,
                receber.fpg_name,
                receber.pgt_data ? new Date(receber.pgt_data).toLocaleDateString('pt-BR') : 'Não Pago'
            ])
        };

        // Add the table to the document
        doc.table(table, {
            x: 0,
            y: doc.y,
            padding: 5,
            columnSpacing: 5,
            minRowHeight: 20,
            prepareHeader: () => doc.fontSize(8).font("Helvetica-Bold"),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                doc.fontSize(10);
                doc.fillColor('#000000');
                doc.font("Helvetica");

                //Se a coluna for impar, pinta de cinza
                if (indexRow % 2 === 0) {
                    doc.fillColor('#000000');
                    doc.addBackground(rectCell, '#f3f3f3', 1);
                }

                //console.log('row', rectCell)

                //Adicionar somente no rectCell que o width seja igual a 70
                let rectCellDataPgto = { x: 460, y: rectCell.y, width: 70, height: rectCell.height };

                if (rectCellDataPgto) {
                    if (row[4] === 'Não Pago') {
                        doc.addBackground(rectCellDataPgto, '#fca2a2', 1);
                    } else {
                        doc.addBackground(rectCellDataPgto, '#befca2', 1);
                    }
                }

            }
        });

        doc
            .moveDown(1)
            .fontSize(10)
            .font("Helvetica")
            .text(`Quantidade de recebimentos:`, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`${data.totalRecebimentos}`);

        doc
            .moveDown(0.3)
            .fontSize(10)
            .font("Helvetica")
            .text(`Valor total de recebimentos: `, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`R$ ${data.valorTotalRecebimentos.toFixed(2).replace('.', ',')}`);

        doc
            .moveDown(0.3)
            .fontSize(10)
            .fillColor('red')
            .font("Helvetica")
            .text(`Valor total (Não Pagos): `, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`R$ ${data.valorTotalNaoPago.toFixed(2).replace('.', ',')}`);

        doc
            .moveDown(0.3)
            .fontSize(10)
            .fillColor('green')
            .font("Helvetica")
            .text(`Valor total (Pagos): `, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`R$ ${data.valorTotalPago.toFixed(2).replace('.', ',')}`);

        // Add the footer
        doc
            .moveDown(3)
            .fontSize(10)
            .font("Helvetica")
            .fillColor('black')
            .text(`Gerado em ${data.dataRelatorio}`, doc.x, doc.y, { width: 500, align: 'center', lineBreak: false });

        // Finalize the PDF and end the stream
        doc.end();

        // Aguardar o término da gravação do stream
        await new Promise(resolve => writeStream.on('finish', resolve));

        console.log('Relatório criado com sucesso!', filePath);
        return {
            filePath,
            fileName: `Relatório de recebimentos - ${dataFormatada}.pdf`
        };
    } catch (error) {
        throw new Error(`Erro ao gerar o Relatório: ${error}`);
    }
}

async function createRelatorioComissoes(data) {
    try {
        console.log('Criando relatório de comissões: ', data);

        // Certifique-se de que o diretório de saída existe
        const certDir = path.join(outputPathRelatorios);
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        const doc = new PDFTable({
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            }
        });

        // Data no formato dd-mm-aaaa
        const dataAtual = new Date();
        const dataFormatada = `${dataAtual.getDate()}-${dataAtual.getMonth() + 1}-${dataAtual.getFullYear()}`;

        // Pipe the PDF into a writable stream
        const filePath = path.join(certDir, `Relatório de comissões - ${data.funcionario} - ${dataFormatada}.pdf`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add the logo (header igual ao createOrdemServico)
        doc.image(logoPath, 50, 0, { width: 150 });

        // Add the header
        let xHeader = 200;
        doc
            .fontSize(14)
            .text('Oregon Serviços Especializados LTDA', xHeader, 40)
            .fontSize(10)
            .text('CNPJ: 37.503.611/0001-62', xHeader, 58)
            .text('Contato: (48) 99106-6656', xHeader, 72)
            .text('Endereço: Amarildo Rohling Guizoni, 240, Serraria - São José/SC', xHeader, 86)
            .text('E-mail: oregon.hiegienizacao@gmail.com', xHeader, 100);

        doc.moveDown(2);

        // Add the title
        doc
            .font('Helvetica-Bold')
            .fontSize(12)
            .text(`Relatório de Comissões - ${data.funcionario}`, 50, doc.y, { align: 'center' })
            .font('Helvetica')
            .fontSize(10)
            .text(` ${data.mesText}`, { align: 'center' })
            .moveDown(2);

        // Define the table
        const table = {
            headers: [
                { label: 'AGENDAMENTO', width: 160 },
                { label: 'SERVIÇOS', width: 180 },
                { label: 'VLR. AGE.', width: 60 },
                { label: 'VLR. COM.', width: 60 },
                { label: 'STATUS', width: 60 },
            ],
            rows: data.comissoes.map(comissao => [
                `N° #${comissao.age_id} - ${moment(comissao.age_data).format('DD/MM/YYYY')}\nCliente: ${comissao.cli_nome}`,
                comissao.servicos.map(s => `${s.ser_quantity || 1}x ${s.ser_nome}`).join(', ') || 'N/A',
                formatValor(comissao.age_valor),
                formatValor(comissao.com_valor),
                comissao.com_paga ? 'Pago' : 'Pendente'
            ])
        };

        // Add the table to the document
        doc.table(table, {
            x: 50,
            y: doc.y,
            padding: 5,
            columnSpacing: 5,
            minRowHeight: 25,
            prepareHeader: () => doc.fontSize(8).font("Helvetica-Bold"),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                doc.fontSize(9);
                doc.fillColor('#000000');
                doc.font("Helvetica");

                //Se a coluna for impar, pinta de cinza
                if (indexRow % 2 === 0) {
                    doc.fillColor('#000000');
                    doc.addBackground(rectCell, '#f3f3f3', 1);
                }

                // Destacar status da comissão
                if (indexColumn === 4) {
                    if (row[4] === 'Pago') {
                        doc.addBackground(rectCell, '#befca2', 1);
                    } else {
                        doc.addBackground(rectCell, '#fca2a2', 1);
                    }
                }
            }
        });

        doc
            .moveDown(1)
            .fontSize(10)
            .font("Helvetica")
            .text(`Quantidade de comissões:`, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(` ${data.totalComissoes}`);

        doc
            .moveDown(0.3)
            .fontSize(10)
            .font("Helvetica")
            .text(`Valor total de comissões: `, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`${formatValor(data.valorTotalComissoes)}`);

        doc
            .moveDown(0.3)
            .fontSize(10)
            .fillColor('red')
            .font("Helvetica")
            .text(`Valor total (Não Pagos): `, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`${formatValor(data.valorTotalNaoPago)}`);

        doc
            .moveDown(0.3)
            .fontSize(10)
            .fillColor('green')
            .font("Helvetica")
            .text(`Valor total (Pagos): `, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`${formatValor(data.valorTotalPago)}`);

        // Add the footer
        doc
            .moveDown(3)
            .fontSize(10)
            .font("Helvetica")
            .fillColor('black')
            .text(`Gerado em ${data.dataRelatorio}`, doc.x, doc.y, { width: 500, align: 'center', lineBreak: false });

        // Finalize the PDF and end the stream
        doc.end();

        // Aguardar o término da gravação do stream
        await new Promise(resolve => writeStream.on('finish', resolve));

        console.log('Relatório criado com sucesso!', filePath);
        return {
            filePath,
            fileName: `Relatório de comissões - ${data.funcionario} - ${dataFormatada}.pdf`
        };
    } catch (error) {
        throw new Error(`Erro ao gerar o Relatório: ${error}`);
    }
}

async function createRelatorioServicosTecnicos(data) {
    try {
        console.log('Criando relatório de serviços por técnico: ', data);

        // Certifique-se de que o diretório de saída existe
        const certDir = path.join(outputPathRelatorios);
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        const doc = new PDFTable({
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            }
        });

        // Data no formato dd-mm-aaaa
        const dataAtual = new Date();
        const dataFormatada = `${dataAtual.getDate()}-${dataAtual.getMonth() + 1}-${dataAtual.getFullYear()}`;

        // Pipe the PDF into a writable stream
        const filePath = path.join(certDir, `Relatório de Serviços por Técnico - ${data.tecnico} - ${dataFormatada}.pdf`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add the logo
        doc.image(logoPath, 50, 50, { width: 80 });

        // Add the header
        doc
            .fontSize(14)
            .text('Oregon Higienização de estofados e Ambientes', 150, 50)
            .fontSize(10)
            .text('CNPJ: 37.503.611/0001-62', 150, 69)
            .text('Contato: (48) 99174-9762', 150, 84)
            .text('E-mail: oregon.hiegienizacao@gmail.com', 150, 98);

        doc.moveDown();

        // Add a line
        doc.moveTo(50, 120)
            .lineTo(550, 120)
            .stroke();

        doc.moveDown(4);

        // Add the title
        doc
            .fontSize(13)
            .text(`Relatório de serviços do Técnico ${data.tecnico}`, 50, doc.y, { align: 'center', underline: true })
            .font('Helvetica')
            .fontSize(10)
            .text(` ${data.mesText}`, { align: 'center' })
            .moveDown(2);

        // Define the table
        const table = {
            headers: [
                { label: 'AGENDAMENTO', width: 200 },
                { label: 'SERVIÇOS', width: 150 },
                { label: 'VALOR DO AGEND.', width: 75 },
                { label: 'DATA DO AGEND.', width: 75 }
            ],
            rows: data.agendamentos.map(agendamento => [
                'Cliente: ' + agendamento.cliente[0]?.cli_nome + '\n' +
                'Endereço: ' + agendamento.endereco[0]?.end_logradouro + ', ' +
                agendamento.endereco[0]?.end_numero + ' - ' + agendamento.endereco[0]?.end_bairro + ' - ' +
                agendamento.endereco[0]?.end_cidade + '/' + agendamento.endereco[0]?.end_estado,

                agendamento.servicos.map(servico => servico.ser_nome + ' - ' + servico.ser_descricao + ' - ' + formatValor(servico.ser_valor)).join('\n'),
                formatValor(agendamento.age_valor),
                new Date(agendamento.age_data).toLocaleDateString('pt-BR')
            ])
        };

        // Add the table to the document
        doc.table(table, {
            x: 50,
            y: doc.y,
            padding: 5,
            columnSpacing: 5,
            minRowHeight: 52,
            prepareHeader: () => doc.fontSize(8).font("Helvetica-Bold"),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                doc.fontSize(10);
                doc.fillColor('#000000');
                doc.font("Helvetica");

                //Se a coluna for impar, pinta de cinza
                if (indexRow % 2 === 0) {
                    doc.fillColor('#000000');
                    doc.addBackground(rectCell, '#f3f3f3', 1);
                }
            }
        });

        doc
            .moveDown(1)
            .fontSize(10)
            .font("Helvetica")
            .text(`Quantidade de serviços atendidos:`, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`${data.totalServicosAtendidos}`);

        doc
            .moveDown(0.3)
            .fontSize(10)
            .font("Helvetica")
            .text(`Valor total de serviços atendidos: `, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`${formatValor(data.valorTotalServicosAtendidos)}`);

        doc
            .moveDown(0.3)
            .fontSize(10)
            .font("Helvetica")
            .text(`Valor total Agendamentos: `, 50, doc.y, { continued: true })
            .font("Helvetica-Bold")
            .text(`${formatValor(data.valorTotalAgendamentos)}`);

        // Add the footer
        doc
            .moveDown(3)
            .fontSize(10)
            .font("Helvetica")
            .fillColor('black')
            .text(`Gerado em ${data.dataRelatorio}`, doc.x, doc.y, { width: 500, align: 'center', lineBreak: false });

        // Finalize the PDF and end the stream
        doc.end();

        // Aguardar o término da gravação do stream
        await new Promise(resolve => writeStream.on('finish', resolve));

        console.log('Relatório criado com sucesso!', filePath);
        return {
            filePath,
            fileName: `Relatório de Serviços por Técnico - ${data.tecnico} - ${dataFormatada}.pdf`
        };
    } catch (error) {
        throw new Error(`Erro ao gerar o Relatório: ${error}`);
    }
}

async function createOrdemServico(data) {
    try {
        if(!data || !data.age_id) throw new Error('Dados inválidos');

        console.log('Criando ordem de serviço: ', data);

        // Certifique-se de que o diretório de saída existe
        const certDir = path.join(outputPathOrdensServico, data.age_id.toString());
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        const doc = new PDFTable({
            size: 'A4',
            margins: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            }
        });

        const filePath = path.join(certDir, `Ordem de Serviço - ${data.age_id}.pdf`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add the logo
        doc.image(logoPath, 50, 0, { width: 150 });

        // Add the header
        let xHeader = 200;
        doc
            .fontSize(14)
            .text('Oregon Serviços Especializados LTDA', xHeader, 40)
            .fontSize(10)
            .text('CNPJ: 37.503.611/0001-62', xHeader, 58)
            .text('Contato: (48) 99106-6656', xHeader, 72)
            .text('Endereço: Amarildo Rohling Guizoni, 240, Serraria - São José/SC', xHeader, 86)
            .text('E-mail: oregon.hiegienizacao@gmail.com', xHeader, 100);

        doc.moveDown(2);

        doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Ordem de Serviço', 0, doc.y, { align: 'center' })
        .font('Helvetica')
        .fontSize(11);

        doc.moveDown(2);

        //_ linha inteira até o final da página
        let vazio = '                   ';

        let texts = [
            /* `Cliente: ${data.cliente}`,
            'Endereço da Aplicação', */
            {
                title: 'Cliente:',
                value: data?.cliente || vazio
            },
            {
                title: 'Endereço da aplicação:',
                value: data?.endereco || vazio
            },
            {
                title: 'Data de execução:',
                value: data?.dataExecucao || vazio
            },
            {
                title: 'Data de validade do serviço:',
                value: data?.dataValidade || vazio
            },
            {
                title: 'Pragas alvo:',
                value: data?.pragasAlvo || vazio
            },
            {
                title: 'Prazo de assistência técnica por serviço:',
                value: data?.prazoAssistencia || vazio,
                jump: true
            },
            {
                title: 'Nome e concentração do(s) produto(s):',
                value: data?.nomeConcentracao || vazio
            },
            {
                title: 'Grupo(s) químico(s) do(s) produto(s):',
                value: data?.gruposQuimicos || vazio
            },
            {
                title: 'Principio ativo do(s) produto(s):',
                value: data?.principioAtivos || vazio,
                jump: true
            },
            {
                title: 'Orientações:',
                value: data?.orientacoes || vazio
            },
            {
                title: 'Funcionário(s):',
                value: data?.funcionarios && Array.isArray(data?.funcionarios) ? 
                data?.funcionarios.map(funcionario => funcionario.fullName).join(', ') : vazio
            },
            {
                title: 'Observações:',
                value: data?.obs || vazio
            },
        ];

        doc
        .lineGap(1)
        .font('Helvetica')
        .text('Licença Sanitária:', 50, doc.y, { align: 'left', continued: true })
        .text(data.licensaSanitaria?.text || vazio, doc.x + 3, doc.y, { align: 'left', underline: true, continued: true })
        .text('Validade:', doc.x + 6, doc.y, { align: 'left', underline: false, continued: true })
        .text(data.licensaSanitaria?.validade || vazio, doc.x + 3, doc.y, { align: 'left', underline: true });

        doc
        .moveDown(.4)
        .text('Licença Ambiental:', 50, doc.y, { align: 'left', continued: true })
        .text(data.licensaAmbiental?.text || vazio, doc.x + 3, doc.y, { align: 'left', underline: true, continued: true })
        .text('Validade:', doc.x + 6, doc.y, { align: 'left', underline: false, continued: true })
        .text(data.licensaAmbiental?.validade || vazio, doc.x + 3, doc.y, { align: 'left', underline: true });

        doc.moveDown(1);

        for(let i = 0; i < texts.length; i++) {
            let lineY = doc.y + 5;

            doc
            .text(texts[i].title, 50, lineY, { align: 'left', continued: true })
            .text(texts[i].value, doc.x + 3, lineY, { align: 'left', underline: true });

            if(texts[i].jump) {
                doc.moveDown(1);
            }

        }

        doc.moveDown(4);

        //Asinatura
        let yAssinatura = doc.y;
        
        doc
        .text('________________________________', 70, yAssinatura)
        .text('Assinatura do Cliente', 115, doc.y + 4);

        doc
        .text('________________________________', 300, yAssinatura)
        .text('Assinatura do Técnico', 335, doc.y + 4);

        // Finalize the PDF and end the stream
        doc.end();

        // Aguardar o término da gravação do stream
        await new Promise(resolve => writeStream.on('finish', resolve));

        console.log('Ordem de serviço criada com sucesso!', filePath);
        return {
            filePath,
            fileName: `Ordem de Serviço - ${data.age_id}.pdf`
        };
    } catch (error) {
        throw new Error(`Erro ao gerar a ordem de serviço: ${error}`);
    }
}

async function inserirAssinaturaDigitalDoc(dados, pathAssinatura, coordsRaw) {
    try {
        if (!dados || !pathAssinatura || !coordsRaw) {
            console.error('Dados, caminho da assinatura ou coordenadas não fornecidos.');
            return false;
        }
        // 1) parse das coordenadas
        const { page, xNorm, yNorm, wNorm, hNorm } =
            typeof coordsRaw === "string" ? JSON.parse(coordsRaw) : coordsRaw;

        // 2) carrega o PDF
        const pathDoc = dados.assinaturaData?.filePdf?.filePath;

        console.log('Caminho do documento:', dados.assinaturaData);
        if (!pathDoc) {
            console.error('Caminho do documento não encontrado.');
            return false;
        }
        const basePath = path.dirname(pathDoc);

        const existingPdfBytes = fs.readFileSync(pathDoc);
        const pdfDoc = await PDFDocumentL.load(existingPdfBytes);
        const pdfPage = pdfDoc.getPages()[page - 1];

        // 3) dimensões em pontos
        const pdfW = pdfPage.getWidth();
        const pdfH = pdfPage.getHeight();

        // 4) converte frações para pontos e inverte Y
        const xPdf = xNorm * pdfW;
        const widthPdf = wNorm * pdfW;
        const heightPdf = hNorm * pdfH;
        const yPdf = pdfH - (yNorm + hNorm) * pdfH;

        // 5) lê PNG já recortado e embeda
        const pngBase64 = fs.readFileSync(pathAssinatura, { encoding: "base64" });
        const pngImage = await pdfDoc.embedPng(pngBase64);

        // 6) desenha na página
        pdfPage.drawImage(pngImage, {
            x: xPdf,
            y: yPdf,
            width: widthPdf,
            height: heightPdf,
        });

        // 7) salva de volta
        const modifiedPdfBytes = await pdfDoc.save();

        let fileName = path.basename(pathDoc);
        let fileExt = path.extname(pathDoc);

        let fileNameWithoutExt = path.basename(pathDoc, fileExt);
        
        if (fileNameWithoutExt.includes('_assinado')) {
            let parts = fileNameWithoutExt.split('_assinado');
            fileNameWithoutExt = parts[0];
        }

        let newFileName = `${fileNameWithoutExt}_assinado_${new Date().getTime()}${fileExt}`;
        let newFile = path.join(basePath, newFileName);

        if (!fs.existsSync(basePath)) {
            fs.mkdirSync(basePath, { recursive: true });
        }

        // 5) Salva o PDF assinado
        fs.writeFileSync(newFile, modifiedPdfBytes);

        console.log('Assinatura digital inserida com sucesso no documento:', newFileName);

        return {
            fileName: newFileName,
            filePath: newFile,
            url: `/download/docs/ordens-servico/${dados.age_id}/${newFileName}`
        }
    } catch (error) {
        console.error('Erro ao inserir assinatura digital:', error);
        return false;
    }
}


module.exports = { 
    createCertificate, 
    createRecibo, 
    createRelatorioSaida, 
    createRelatorioReceber, 
    createRelatorioComissoes, 
    createRelatorioServicosTecnicos,
    createOrdemServico,
    inserirAssinaturaDigitalDoc
};