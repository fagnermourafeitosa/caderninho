# Guia de uso

[← Voltar à apresentação do Caderninho](../README.md)

Os nomes de botões e menus aparecem em negrito, exatamente como estão no app.

## Comece por aqui

Abra o **Caderninho.app**. A primeira tela, **Caderninho**, mostra em faixas a nota atualizada mais recentemente no caderno (com o grafo de conexões dela), o kanban do pipeline mais recente, os lembretes de hoje e as últimas notas.

Para escrever, abra **Notas**: a seção abre na lista das suas notas. Clique numa nota para abri-la, ou em **+ Nova nota** para começar uma. Dê um título e comece. As mudanças são salvas automaticamente no seu computador. Se algo falhar, o app mostra um aviso.

## Buscar em todos os cadernos

Clique na **lupa no topo**, logo depois do botão principal, ou pressione **⌘F**. O campo abre e busca em títulos e conteúdo de notas, pipelines, tarefas (título, descrição e comentários) e lembretes de todos os cadernos, seja qual for a seção aberta. A busca ignora diferenças de acentos e maiúsculas; páginas na lixeira ficam de fora.

Cada resultado mostra o tipo, o caderno e um trecho do conteúdo. Clique para abrir; uma tarefa abre o pipeline com a tarefa aberta, ou use **↑/↓** e **Enter**. **Escape** recolhe o campo.

## Cadernos

**Cadernos**, o segundo item do menu, é onde você cria, abre, edita e remove cadernos. Cada um tem um nome, uma descrição opcional e uma cor escolhida na paleta.

Sempre existe pelo menos um caderno. Na primeira abertura, **Meu caderno** recebe as páginas que você já tinha. Toda nota, pipeline ou lembrete pertence a um caderno, e as páginas novas são criadas no caderno selecionado.

As abas à direita trocam de caderno. Ao passar o mouse, a aba se abre e mostra o nome na vertical. A aba selecionada fica aberta, indicando em qual caderno você está. A última aba, **+**, abre o formulário de criação.

Na própria página, o nome do caderno abaixo do título, ao lado das datas, permite mover uma nota, pipeline ou lembrete para outro caderno; um pipeline leva as tarefas junto. Ao remover um caderno, você escolhe outro para receber todas as páginas dele, inclusive as da lixeira. Nenhuma página é apagada nessa operação, e o último caderno não pode ser removido.

## O que você pode guardar

| Seção | Para quê |
| --- | --- |
| **Caderninho** | Visão do dia: última nota, kanban do pipeline mais recente, lembretes e últimas notas. |
| **Cadernos** | Criar, editar, abrir e remover cadernos. |
| **Notas** | Texto livre, categorias, imagens, cartões de link e tarefas criadas a partir do texto. |
| **Tarefas** | Pipelines: quadros kanban com colunas configuráveis, onde cada tarefa é um card. |
| **Lembretes** | Notas agendadas para um dia e horário, que tocam um alerta sonoro. |
| **Quadros** | Um papel sem fim para post-its, formas, setas, frames, imagens e texto solto. |
| **Lixeira** | Páginas, pipelines, tarefas e mídias removidas, separadas por tipo e recuperáveis. |

**Notas**, **Tarefas** e o calendário de **Lembretes** mostram o caderno selecionado. A visão do dia e a lixeira reúnem todos os cadernos. Os alertas continuam funcionando mesmo quando você está em outro caderno.

### Página do dia

A página de hoje é feita de faixas, de cima para baixo: **Última nota** (com o grafo), o **kanban** do pipeline criado mais recentemente no caderno, **Lembretes** e **Últimas notas**. A seta à esquerda de cada faixa a recolhe ou abre, e o app lembra essa escolha. No kanban da home você arrasta cards entre colunas e clica num card para abrir a tarefa, como na página do pipeline; **Abrir pipeline** leva ao quadro inteiro. Sem pipelines, a faixa oferece **+ Novo pipeline**.

No topo da página de hoje, a nota mais recente do caderno aparece com a formatação e as mídias dela. Quando ela tem conexões, **Ideias por perto** as mostra ao lado, como um grafo. Use **Continuar nesta nota** para editá-la, ou clique numa conexão para abrir outra página. No dia seguinte, o resumo da página anterior (lembretes e últimas notas) continua disponível no seletor de datas. Os dias anteriores são somente leitura; escolha **Hoje** para voltar ao dia atual.

### Categorias

Abaixo do título, clique em **+ Categoria** para usar uma categoria existente ou criar uma nova. A mesma categoria pode ser usada em vários cadernos e tipos de página.

Digite `#trabalho` ou `#ideias` no texto de uma nota para criar uma pílula e associar a categoria à página. Termine a palavra com espaço ou pontuação, ou saia do editor, para registrá-la.

Quando você digita `#` e a primeira letra, aparecem sugestões das categorias existentes, encontradas sem diferenciar acentos ou maiúsculas. Use **↑/↓** para escolher e **Enter** ou **Tab** para completar, ou clique na categoria. **Escape** fecha as sugestões sem alterar o texto. Elas abrem com um pequeno salto, desativado quando você prefere movimento reduzido.

**Backspace numa pílula remove a categoria inteira do texto**, mantendo as palavras em volta. Desfazer restaura a pílula e a associação. O texto salvo guarda a hashtag original, então você pode copiá-lo para outros apps.

O **×** num selo remove uma associação feita pelo seletor. Se a categoria também aparece no texto, ela continua associada até você remover a hashtag. As categorias continuam cadastradas para reutilização.

Os nomes aceitam letras, acentos, números, hífens e sublinhados; espaços viram hífens. Hashtags escapadas, dentro de código ou dentro de endereços de link não criam categorias.

### Pipelines

Em **Tarefas**, cada pipeline é um quadro kanban com título. Clique em **+ Novo pipeline**: ele nasce com as colunas **Backlog**, **Ready to Dev**, **Doing**, **Review** e **Done**. **Tarefas** abre no índice dos seus pipelines, com quantas tarefas estão finalizadas (por exemplo, **3 finalizados de 12**); clique num pipeline para abrir o quadro. A seta no canto superior esquerdo volta ao índice.

**Colunas.** O **⋯** de cada coluna permite **Renomear coluna**, **Mover para a esquerda**, **Mover para a direita** e **Remover coluna…**. Para remover uma coluna com tarefas, escolha para qual coluna elas vão. O **+** tracejado adiciona uma coluna. Todo pipeline tem pelo menos duas colunas.

**Coluna final.** A última coluna marca a tarefa como concluída, seja qual for o nome dela, e mostra o selo **finalizada**. Ela pode ser renomeada, mas não pode ser removida nem movida, e nenhuma coluna fica depois dela.

**Tarefas.** **+ Nova tarefa** abre o formulário: título, pipeline, owner (opcional) e descrição. A tarefa nasce no topo da primeira coluna. O card mostra o título, a data de criação e, quando há comentários, um selo como **3 comentários**. Arraste o card para outra coluna ou para outra posição na mesma coluna; a ordem fica salva.

**Abrir uma tarefa.** Clique no card (ou use **Enter**) para abrir a tarefa:

- O título e o owner são editáveis; a descrição usa o mesmo editor das notas, com **`/`** para listas, títulos, tabelas e **Imagem**.
- Arraste ou cole imagens na descrição ou num comentário. As miniaturas de todas as imagens da tarefa aparecem em **Imagens da tarefa**.
- Em **Comentários**, escreva e clique em **Comentar**. O lápis edita um comentário (que passa a mostrar **editado em…**); a lixeira remove depois de confirmar, sem passar pela **Lixeira**.
- Ao lado, **Coluna** move a tarefa; **Criada em** e **Histórico** mostram de onde e para onde ela foi, inclusive mudanças de posição.
- O **⋯** manda a tarefa para a lixeira.
- Ao fechar a tarefa com um comentário ainda não enviado, o app pergunta antes de descartá-lo. O título não pode ficar vazio: se você apagar tudo, o título anterior volta.

As mudanças são salvas automaticamente. Ao criar uma tarefa, as imagens podem ser adicionadas depois, abrindo a tarefa.

### Lembretes e calendário

**Lembretes** abre o calendário mensal do caderno selecionado. As setas passam de um mês para outro; **Hoje** volta ao mês atual. Pontos marcam os dias com alertas agendados, inclusive os presos a notas comuns. Selecione um dia e clique num lembrete para abrir a página original.

Clique em **+ Novo lembrete**, escreva a nota, escolha **Dia e horário** e clique em **Agendar**. **Testar som** deixa você ouvir o alerta. **Cancelar alerta** mantém a página sem o agendamento.

Mudar a data ou o horário desativa o agendamento anterior até você clicar em **Agendar** de novo.

**O app precisa estar aberto para tocar o alerta; pode estar minimizado.** Fechar a janela encerra o app. Se o horário passar com o app fechado ou o computador em repouso, o alerta toca quando o app abrir ou o computador acordar. Cada alerta toca uma vez, usa o volume do sistema e mostra uma mensagem no app e uma notificação do sistema, quando disponível. Páginas na lixeira não disparam alertas.

### Quadros

**Novo quadro** abre um papel pontilhado sem fim, com o título, as categorias e o caderno no topo, como numa nota. O trilho à esquerda tem as ferramentas e os atalhos: Seleção (V), Mão (H), Retângulo (R), Losango (D), Elipse (O), Seta (A), Linha (L), Lápis (P), Texto (T), Post-it (N), Imagem (9), Frame (F) e Borracha (E).

- **Post-it**: tecle N (ou clique no post-it do trilho) e clique no papel. O post-it aparece pronto para escrever.
- **Setas** que começam ou terminam numa forma ficam presas a ela e acompanham quando você move a forma.
- **Barra de contexto**: ao selecionar algo, uma barra aparece acima da seleção com cor, traço, espessura, estilo da linha, traço à mão, texto, camadas, duplicar e apagar. Com vários elementos, ela alinha, agrupa e envolve tudo num frame.
- **Imagens**: cole, arraste para o papel ou use a ferramenta Imagem.
- **Mais** (⋯): Exportar PNG, Exportar SVG, Tela cheia do quadro (**⇧⌘F**; **esc** sai) e Relacionados. Um frame selecionado também pode ser exportado em PNG.
- **⌘Z** e **⇧⌘Z** desfazem e refazem no quadro; os botões no canto inferior esquerdo fazem o mesmo e ajustam o zoom.

O quadro se salva sozinho enquanto você desenha. O texto dos elementos entra na busca e nas páginas relacionadas; hashtags escritas no quadro não viram categorias (use **+ Categoria**).

## Editor de notas

Digite **`/`** no texto para inserir texto, **Título**, **Subtítulo**, **Título pequeno**, listas com marcadores ou numeradas, citação, divisória, código, mídia ou tabela. A paleta agrupa os blocos em **Texto**, **Listas**, **Estrutura** e **Mídia**, com busca. Continue digitando depois da barra para filtrar: **`/tit`** mostra os três níveis de título. A busca aceita palavras sem acento. Use as setas e **Enter** para escolher; **Escape** fecha o menu.

Selecione um trecho para abrir a barra de formatação: **negrito, itálico, sublinhado, tachado, código no texto, link e marca-texto**. Selecionar com **Shift + setas** atravessa parágrafos. A formatação vale para todo o texto selecionado, inclusive em várias linhas ou células. **Backspace/Delete** apagam toda a seleção; ao lado de uma divisória, removem o bloco. No início de um título, citação ou lista, Backspace volta para texto normal sem perder o conteúdo. O marca-texto tem uma paleta de seis cores. Para abrir um link no texto, use **⌘/Ctrl + clique**.

Use **Cmd/Ctrl + B** for bold, **Cmd/Ctrl + I** for italic and **Cmd/Ctrl + U** for underline in the note body. A shortcut toggles the selected text; without a selection, it toggles the style of subsequent typing. Formatting is saved automatically and supports undo/redo.

### Tabelas

Escolha **Tabela** no menu de inserção. A grade mostra a prévia de **colunas × linhas** enquanto você passa o mouse. Clique no tamanho desejado, ou pressione, arraste e solte para criar a tabela. O seletor inicial vai até 8 × 8; depois você pode adicionar linhas e colunas, até 20 × 20.

Escreva direto nas células. **Tab** avança; **Shift Tab** volta. Tab na última célula adiciona uma linha. **Enter** quebra a linha dentro da célula. Os controles da tabela permitem adicionar linha ou coluna, ligar ou desligar o cabeçalho e remover a tabela.

Tabelas, formatação e blocos são salvos automaticamente no banco local. **Desfazer/refazer** também recupera essas mudanças. As notas existentes continuam disponíveis, e adicionar mídia mantém a formatação já salva.

## Atalhos dentro da nota

Escreva uma data como `amanhã às 14h`, `hoje às 18h30`, `depois de amanhã às 9h` ou `05/10/2027 às 14:30`. Um selo **Agendar** oferece o horário interpretado. Confira a data antes de clicar: só escrever a frase não ativa o alerta.

Cada nota pode ter um alerta. **Reagendar** troca o horário; o **×** ao lado do agendamento o cancela. As datas seguem o fuso horário do computador e, depois de agendadas, ficam fixas.

Comece uma linha com `[]` ou `[ ]` seguido de espaço para criar uma **tarefa** num pipeline: abre **Nova tarefa** com o resto da linha como título; escolha o pipeline e confirme. A linha passa a mostrar o título da tarefa com o selo da coluna em que ela está; clique para abrir a tarefa. Se você cancelar, os colchetes saem e a linha fica como texto normal. Colar texto com `[]` não cria tarefas.

## Imagens, PDFs e links

Em **Notas**, use **Adicionar mídia** no menu **⋯** ou pressione **⇧⌘M**, cole uma imagem ou um link no texto, ou arraste imagens, PDFs e links para a página. Os arquivos aceitos são imagens **PNG, JPEG e WebP** de até **20 MB** cada, e documentos **PDF** de até **50 MB**.

Use a alça **Arraste** para posicionar a mídia ao lado de um parágrafo, à esquerda ou à direita. Os botões **− / +** ajustam a largura; o texto acompanha a posição da mídia.

Os cartões de link guardam o título, a descrição e a imagem obtidos das metatags do site. Depois de criada, a prévia fica disponível sem internet. Clicar no cartão abre o endereço no navegador. Sites sem metadados ou que exigem login podem aparecer sem prévia. Os cartões não se atualizam sozinhos.

PDFs aparecem como cartões com título e um trecho inicial, quando disponíveis. Sem texto extraível, o cartão usa o nome do arquivo. Clique em **Abrir PDF** para abrir a cópia salva no leitor de PDF do computador.

Imagens e PDFs importados são copiados para a pasta de dados do app. Você pode mover ou apagar o arquivo original depois de importá-lo.

## Exportar em PDF

Abra uma nota ou lembrete e escolha **Exportar PDF** no menu **⋯** no topo da página, ou pressione **⇧⌘E**. Escolha o nome e a pasta na janela do Mac.

O PDF em A4 inclui título, caderno, categorias, datas, texto formatado, tabelas, linhas de tarefa, imagens, cartões de link, PDFs anexados e lembretes ligados à página. Pipelines não são exportados em PDF. Páginas longas continuam nas folhas seguintes, com numeração. A exportação salva as últimas mudanças antes de gerar o arquivo e funciona localmente, sem internet.

## Teclado e janela

| Ação | Atalho |
| --- | --- |
| Desfazer | **Ctrl Z** ou **⌘ Z** |
| Refazer | **Ctrl/⌘ Shift Z** ou **Ctrl Y** |
| Nova página na seção atual | **⌘ N** |
| Buscar em todos os cadernos | **⌘ F** |
| Adicionar mídia a uma nota | **⇧⌘ M** |
| Páginas relacionadas | **⌥⌘ R** |
| Exportar PDF | **⇧⌘ E** |
| Mover página para a lixeira | **⇧⌘ ⌫** |
| Fechar um menu | **Escape** |

As ações da página também ficam no menu **Nota** da barra de menus, habilitadas quando a página aberta as oferece.

Nas notas, o histórico de desfazer inclui título, texto, pílulas e linhas de tarefa, guardado por página durante a sessão. Na tarefa aberta, a descrição e cada comentário têm o próprio desfazer. Ele recomeça quando você fecha o app. Mover mídias, agendar alertas e mover cards ou colunas não fazem parte desse histórico.

Arraste uma área não editável do caderno para mover a janela, e arraste a borda do caderno para redimensioná-la. A janela usa os botões do próprio Mac: o vermelho fecha, o amarelo minimiza e o verde aumenta a janela até a altura disponível, com largura de até 1.200 pixels. Um clique duplo no topo também aumenta ou restaura a janela.

A aba de papel à esquerda recolhe ou abre o menu lateral. Essa preferência fica salva.

## Datas e lixeira

As páginas mostram quando foram criadas e atualizadas. As tarefas registram quando foram criadas e cada mudança de coluna ou posição; itens removidos guardam a data de exclusão até serem restaurados. Dados de versões antigas podem mostrar **não registrado** quando a data não existia.

**Mover para a lixeira**, no menu **⋯** no topo da página ou com **⇧⌘⌫**, manda a página para a lixeira e a mantém recuperável. Tarefas e mídias também podem ser restauradas na **Lixeira**, separadas por tipo (**Pipelines** e **Tarefas** ficam em abas próprias). Uma tarefa restaurada volta ao topo da coluna em que estava, ou da primeira coluna se aquela não existir mais. Restaurar um pipeline mantém colunas, tarefas e caderno. Um lembrete vencido precisa ser agendado de novo.

**Excluir definitivamente** pede confirmação e apaga o item para sempre. Imagens e PDFs continuam no disco enquanto outra página ou mídia recuperável ainda os usa. Excluir uma tarefa apaga as imagens dela.

## Seus dados ficam no seu computador

O app usa **SQLite** para guardar notas, cadernos, pipelines, tarefas, categorias e lembretes. Imagens e PDFs das notas ficam numa pasta de mídia local; as imagens das tarefas ficam em `pipelines/<pipeline>/`, numeradas na ordem em que foram anexadas (`01-foto.png`, `02-planta.jpg`…). Não há conta, envio de páginas para servidor nem sincronização na nuvem.

No Mac, os dados ficam em:

```text
~/Library/Application Support/caderninho/
```

Para fazer um backup completo:

1. Espere aparecer **Salvo às…** e feche o app.
2. Copie a pasta `caderninho` inteira para o local do backup.
3. Mantenha `notebook.sqlite` e as pastas `media` e `pipelines` juntos: o banco sozinho não contém as imagens.

Para restaurar, feche o app, guarde uma cópia da pasta atual e substitua-a pela pasta do backup antes de abrir o app de novo.

Se aparecer **Falha ao salvar**, verifique o espaço livre em disco e as permissões da pasta antes de fechar o app. Não remova os arquivos auxiliares do banco com o app aberto.

## Ações ligadas à página

Selecione um trecho numa nota e clique no **ícone de tarefa** no menu de formatação. Você também pode arrastar esse botão para a margem. Outro caminho é clicar com o botão direito no trecho e escolher **Tarefa** ou **Lembrete**. Sem texto selecionado, as duas opções aparecem desativadas. O mesmo menu traz **Recortar**, **Copiar**, **Colar** e **Selecionar tudo**. Em imagens e cartões de link, use o **ícone de tarefa** na faixa de controles da mídia.

**Tarefa** abre **Nova tarefa** com o trecho (ou o título da mídia) como título. Escolha um dos pipelines do caderno da nota (o mais recente já vem selecionado) e confirme: a tarefa nasce no topo da primeira coluna desse pipeline. Se o caderno ainda não tem pipelines, o formulário oferece **+ Novo pipeline**.

**Lembrete** abre o formulário na margem: escreva o próximo passo e defina dia e horário. Criar a ação não altera o texto original nem cria uma segunda nota. Uma mesma página pode ter várias tarefas e vários alertas independentes.

- Trechos com ações ganham um destaque tracejado suave e permanente. Quando a tarefa chega à coluna final, o destaque fica verde.
- A margem mostra cada tarefa com o nome do pipeline e o selo da coluna em que ela está, junto com a cópia do trecho. O lápis abre a tarefa; o **×** manda a tarefa para a lixeira. Use a seta ao lado de **Ações desta nota** para recolher a margem.
- Os lembretes aparecem no calendário e na página do dia agendado. O app precisa estar aberto para tocar o alerta. O lápis reagenda; o **×** manda o lembrete para a lixeira.
- **Ver origem** e **Voltar à origem** abrem a nota e destacam o trecho ou a mídia do lembrete.
- Se a origem mudar ou for removida, a cópia do trecho continua disponível e a margem avisa quando não consegue localizar o conteúdo.

No formulário do lembrete, **Esc** cancela e devolve a seleção de texto. Nada é criado até você confirmar com **Criar tarefa** ou **Agendar lembrete**.

## Conexões entre páginas

Depois do salvamento automático, o Caderninho procura relações entre notas, pipelines e lembretes do mesmo caderno. Até duas conexões aparecem suavemente no rodapé, depois de **Relacionados:**. Clique num título para abrir a página de origem. Quando não há relação relevante, o espaço fica vazio.

Use **Relacionados** no menu **⋯**, ou **⌥⌘R**, para abrir o grafo. A página atual fica no centro; conteúdos com mais afinidade ficam mais perto. Clique numa conexão para abrir a página de origem. Em janelas estreitas, o botão mostra só o ícone, com o nome ao passar o mouse.

O cálculo combina categorias, palavras em comum e o significado do texto. No Mac, o texto encontrado em imagens também conta. Páginas e imagens não são enviadas para análise na nuvem. O primeiro uso precisa de internet para baixar o modelo; depois disso, a análise funciona localmente.
