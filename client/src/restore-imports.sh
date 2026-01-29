#!/bin/bash

echo "🔧 Restaurando imports do VDataTable na linha 2..."

sed -i '2i import { VDataTableServer } from "vuetify/labs/VDataTable";' pages/apps/clientes/clientes.vue
sed -i '2i import { VDataTableServer } from "vuetify/labs/VDataTable";' pages/apps/lembretes/lembretes-index.vue
sed -i '2i import { VDataTableServer } from "vuetify/labs/VDataTable";' pages/apps/crm/modelos-emails.vue
sed -i '2i import { VDataTableServer } from "vuetify/labs/VDataTable";' pages/apps/crm/configs/tags.vue
sed -i '2i import { VDataTableServer } from "vuetify/labs/VDataTable";' pages/apps/crm/modelos-mensagens.vue
sed -i '2i import { VDataTableServer } from "vuetify/labs/VDataTable";' pages/apps/user/list/index.vue
sed -i '2i import { VDataTableServer } from "vuetify/labs/VDataTable";' pages/apps/comissao/comissao-index.vue
sed -i '2i import { VDataTableServer } from "vuetify/labs/VDataTable";' pages/apps/servicos/servicos.vue
sed -i "2i import { VDataTable } from 'vuetify/labs/VDataTable';" views/dashboards/analytics/AnalyticsProjectTable.vue
sed -i "2i import { VDataTableServer } from 'vuetify/labs/VDataTable';" views/dashboards/ecommerce/EcommerceInvoiceTable.vue
sed -i "2i import { VDataTable } from 'vuetify/labs/VDataTable';" views/apps/user/view/UserTabSecurity.vue
sed -i "2i import { VDataTable } from 'vuetify/labs/VDataTable';" views/apps/user/view/UserTabAccount.vue
sed -i "2i import { VDataTableServer } from 'vuetify/labs/VDataTable';" views/apps/user/view/UserInvoiceTable.vue
sed -i "2i import { VDataTableServer } from 'vuetify/labs/VDataTable';" views/apps/relatorios/tableagendamentosgarantia.vue
sed -i "2i import { VDataTableServer } from 'vuetify/labs/VDataTable';" views/apps/relatorios/tableagendamentos.vue
sed -i "2i import { VDataTableServer } from 'vuetify/labs/VDataTable';" views/apps/relatorios/tableagendamentosretrabalho.vue
sed -i "2i import { VDataTableServer } from 'vuetify/labs/VDataTable';" views/apps/relatorios/tableagendamentosclientes.vue

echo "✅ Imports restaurados com sucesso na linha 2!"
