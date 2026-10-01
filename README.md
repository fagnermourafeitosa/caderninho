# Caderninho

Bloco de notas em Electron, com papel antigo, espiral e abas de papel e virada de página para cima.

```sh
npm install
npm start
```

## Menu

- **Notas:** várias páginas abertas, cada uma com título e texto livre. A lista e a busca mostram apenas as notas deste tipo.
- **Tarefas:** várias listas independentes, acessíveis em **Suas listas** e criadas em **+ Nova lista**. Cada lista guarda título, data de criação, data da última alteração e vários itens com texto e estado marcado/desmarcado. A data aparece abaixo do título; o seletor mostra a data e o progresso de cada lista. Tudo é salvo automaticamente. Enter no campo inferior adiciona um item. Tanto a lista inteira quanto um checkbox individual podem ir para a lixeira.
- **Lembretes:** uma nota com título, texto, dia e hora. Clique em **Agendar** para ativar o alerta sonoro. Alterar o horário salva um rascunho e desativa o agendamento anterior até clicar em Agendar novamente. **Testar som** reproduz o mesmo toque usado no alerta.
- **Lixeira:** abas de Notas, Tarefas e Lembretes. Restaurar preserva o tipo, o conteúdo e os checkboxes. Excluir definitivamente exige confirmação. Não há mais Temas ou Fixar.

Lembretes precisam do aplicativo aberto, mesmo minimizado. No macOS, o toque usa um arquivo de áudio local e `afplay`, sem depender de permissões de autoplay do renderer. O volume segue o sistema. Também aparece um aviso no app e uma notificação do sistema quando permitida. Se o horário passar com o app fechado ou com o computador dormindo, o alerta é emitido ao reabrir ou despertar. Um lembrete na lixeira não dispara; ao restaurar um lembrete vencido, é preciso reagendar.

## Salvamento em SQLite

Cada alteração é gravada automaticamente em uma transação SQLite no processo principal, antes de o indicador mostrar **Salvo neste Mac**. Não há sincronização em nuvem nem botão Salvar.

Banco neste Mac:

```text
~/Library/Application Support/caderninho/notebook.sqlite
```

Tabelas: `notes` (páginas dos três tipos e estado da lixeira/agendamento), `task_items` (checkboxes por lista) e `settings` (seção e página selecionadas). O banco usa WAL, chaves estrangeiras e `synchronous=FULL`.

A primeira abertura desta versão importa automaticamente o `notebook.json` anterior, se existir. O arquivo original é preservado e uma cópia `notebook-before-sqlite-<timestamp>.json` é criada antes da importação. As antigas tarefas são convertidas em uma lista; cada antigo lembrete vira uma nota agendada. O registro de inicialização no banco impede importar os mesmos dados novamente.

Para um backup completo, feche o app e copie o `.sqlite` **junto com a pasta `media`**. Enquanto ele está aberto, pode haver arquivos `notebook.sqlite-wal` e `notebook.sqlite-shm`, usados pelo SQLite. Eles não devem ser apagados durante o uso.

## Controles e verificação

Cmd/Ctrl + N cria uma página no tipo atual; Cmd/Ctrl + F abre a busca; Esc fecha a lista. Use a área visível **Arraste para mover** no topo, ou arraste qualquer trecho sem edição do papel e do menu lateral para mover a janela. Campos, botões e alças de redimensionamento mantêm suas funções. Os botões vermelho e amarelo fecham e minimizam. O verde ocupa toda a altura disponível da tela, mantém a largura e restaura o tamanho anterior no segundo clique. Arraste as bordas ou os cantos para redimensionar; a marca na borda direita do caderno ajusta a largura. As listas mostram o progresso em pequenos quadrados no topo.

```sh
npm test
npm run test:app
npm run package
```

Os testes usam bancos separados na pasta temporária e não alteram os dados reais. O teste de janela verifica os quatro menus, inclusive durante uma virada de página, várias listas, edição de checkboxes, agendamento, acionamento do som e lixeira por tipo. No teste, o áudio é contado sem tocar pelos alto-falantes.

O pacote fica em `dist/Caderninho-darwin-arm64/Caderninho.app` neste Mac.

O menu lateral pode ser recolhido pela aba de papel presa à borda esquerda do caderno. A aba permanece acessível para reabrir o menu, e a preferência é salva no SQLite. Os controles da janela ficam no topo do caderno, visíveis com o menu aberto ou recolhido.

## Rascunho instantâneo

**⌘⇧Espaço** no Mac (Ctrl+Shift+Espaço nos demais sistemas) abre uma folha pequena sobre o app em uso. O Caderninho precisa estar aberto, inclusive minimizado. Há também o botão **Rascunho** no topo e a opção **Caderno → Rascunho instantâneo** no menu.

O título é opcional; o texto é salvo automaticamente no SQLite como rascunho. Fechar a folha ou usar Esc preserva o conteúdo. Escolha **Nova nota** ou uma nota existente e pressione **Guardar no caderno** (⌘/Ctrl+Enter). Ao acrescentar a uma nota, seu conteúdo anterior é preservado. A transferência e a limpeza do rascunho ocorrem juntas na mesma transação. O link **Abrir a nota no caderno** mostra a nota salva.

Se o atalho estiver ocupado por outro app, a folha informa isso e os botões continuam disponíveis. O atalho é liberado ao encerrar o Caderninho.

## Recortes

Em **Notas**, use **+ Recorte**, cole uma imagem ou um link com ⌘/Ctrl+V no corpo da nota, ou arraste arquivos PNG/JPEG/WebP e links para a página. Imagens têm limite de 20 MB. Arraste a alça **Arraste** de cada recorte para escolher o lado e o parágrafo; os botões −/+ ajustam sua largura. O texto contorna o papel; recortes grandes deixam o texto abaixo para manter a leitura. O posicionamento acompanha os parágrafos, em vez de coordenadas de uma tela infinita.

Links usam somente metatags Open Graph, com fallback para Twitter Cards, description e título HTML. Título, descrição e imagem são capturados uma vez e ficam disponíveis offline. Sites sem metatags, protegidos ou indisponíveis mostram o endereço com um botão para abrir no navegador. A captura não executa scripts nem usa sessões autenticadas. Trechos de texto como cartões ficam para uma próxima versão; o texto normal continua editável na página.

Imagens são normalizadas em PNG e deduplicadas por SHA-256 em `~/Library/Application Support/caderninho/media/`. O SQLite guarda os registros `media_blobs` e `cuts`, com referência à nota, imagem, URL, metadados e posição. Não há blobs/base64 no texto da nota. Recortes removidos vão para a lixeira de Notas; suas imagens são preservadas até a exclusão definitiva da última referência. Copiar apenas o banco não inclui as imagens.
