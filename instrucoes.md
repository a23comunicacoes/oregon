#Sobre o projeto:

O projeto é um sistema de agendamento de serviços, com um CRM de atendimento integrado. Temos cadastros de clientes, serviços, profissionais, agendamentos, pagamentos, entre outros.

Temos sistema de comissionamento de serviços, onde o profissional pode receber comissão por cada serviço realizado. Nos serviços também temos subserviços, onde o serviço pode ser composto por subserviços, cada subserviço pode ter um valor diferente e um percentual de comissão diferente. Além de outras configurações.

Na parte do CRM, temos funis de venda, negócios, dados de cliente, um sistema de disparo de mensagens e emails e também
fluxos de atendimento integrados ao Gemini para automação de atendimento.

O projeto é composto por 2 partes:

1. Backend
2. Frontend

O backend é desenvolvido em Node.js com Express.js. Usando banco de dados MySQL.

No backend, usamos require (CommonJS) para importar os módulos. Prefira sempre essa estrutura ao invés de import (ESM). Funções devem ser bem comentadas e documentadas. Evite criações de .md e arquivos extras. Sempre focando em manter o código limpo e organizado e o máximo de modularização possível para reuso. Foque também em desempenho,
pois o sistema terá grande volume de requisições e deve ser o mais performático possível.

No frontend, usamos o tema base Vuexy, com componentes Vuetify e ícones Tabler. Sempre utilize essa estrutura para manter a consistência visual e de funcionalidades. No tema tem componentes nativos que substituem componentes do Vuetify. Exemplo:

<IconBtn> substitui <VBtn icon="tabler-plus" />.
<AppDrawerHeaderSection> substitui <VCardTitle>.

Modelo padrão de Dialogs:
<VDialog ... >
<VCard ... >
<VCardText ... >
<AppDrawerHeaderSection ... >
</VCardText>
</VCard>
</VDialog>

Nos dialogs, evite <VCardActions>, use sempre uma div convencional com <VBtn> para os botões. Exemplo: <div class="d-flex flex-row align-center justify-end"> <VBtn>Confirmar</VBtn> <VBtn>Cancelar</VBtn> </div>

#Banco de dados

O sistema utiliza o banco de dados MySQL.

Acesse o banco de dados com o acesso:
```
mysql -u root -p
```

DB_CONNECTION='mysql'
DB_HOST='191.101.78.114'
DB_PORT='3306'
DB_NAME='DEVdboregonsys'
DB_USER='dboregonsys_user'
DB_PASS='DB@OregonSys93219'

Sempre utilize o terminal para acessar o banco de dados.

#API
O projeto inteiro utiliza a API do backend Node.

A URL da API é: https://app.oregonservicos.com.br:3005. Sempre utilize essa URL para acessar a API do backend Node. Para autenticação:

Faça login:

https://app.oregonservicos.com.br:3005/conta/login
Method: POST
Body:
{
    email: a23comunicacoes@gmail.com
    password: teste
    rememberMe: false
}

O token deve ser armazenado no cookie 'accessToken' e os dados do usuário no cookie 'userData'.

Irá retornar um token de acesso. Utilize esse token para autenticar as requisições, no
header da requisição, adicione o seguinte header:
Authorization: Bearer <token de acesso>
