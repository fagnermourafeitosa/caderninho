<p align="center">
  <img src="assets/icon.png" width="112" alt="Logo do Caderninho">
</p>

<h1 align="center">Caderninho</h1>

<p align="center">
  Notas que viram tarefas sem perder o contexto.<br>
  Um caderno para o Mac, feito para quem escreve em português.
</p>

<p align="center">
  <a href="https://fagnermourafeitosa.github.io/caderninho/">Ver o site</a> ·
  <a href="docs/INSTALLATION.md">Instalar no Mac</a> ·
  <a href="docs/USER_GUIDE.md">Guia de uso</a>
</p>

<p align="center">
  <a href="https://buymeacoffee.com/caderninho"><img src="site/img/bmc-button.svg" alt="Buy me a coffee" height="44"></a>
</p>

Você escreve "pedir dois orçamentos" numa nota sobre a reforma da cozinha. Três semanas depois, a tarefa está numa lista e ninguém lembra de qual reforma era, quais orçamentos, nem por quê.

O Caderninho mantém a tarefa presa à frase que a criou. Selecione um trecho, transforme em tarefa ou lembrete, e a tarefa sempre sabe de onde veio. Todo o resto do app apoia essa ideia: uma página do dia que registra o que estava pendente, páginas relacionadas encontradas no seu próprio computador e referências colocadas ao lado do parágrafo a que pertencem.

![Uma nota com tarefas e um lembrete na margem, cada um ligado ao trecho destacado de onde veio](docs/images/acoes-na-nota.png)

## Tarefas que lembram por que existem

Na maioria dos apps, a nota e a lista de tarefas são coisas separadas. Copie uma linha de uma para a outra e a lista perde o contexto.

No Caderninho, você seleciona o trecho e cria a partir dele uma **tarefa** ou um **lembrete**. A ação vai para a margem da nota com uma cópia do trecho, e o trecho ganha um destaque tracejado que fica verde quando a tarefa é concluída. Imagens e cartões de link também podem originar ações.

- As tarefas aparecem em **Tarefas** e na página do dia; os lembretes aparecem no calendário e tocam um alerta no horário marcado.
- **Ver origem**, na margem, ou **Voltar à origem**, nas listas e na página do dia, abre a nota e destaca o trecho.
- Uma nota pode ter várias tarefas e vários alertas independentes.
- Se você reescrever ou apagar o trecho depois, a ação guarda a cópia e a margem avisa que não encontra mais o original.

## Uma página do dia que guarda o registro

**Caderninho**, a primeira tela, mostra a nota editada mais recentemente no caderno, as páginas relacionadas a ela, as tarefas pendentes de todas as listas e margens de notas, e os lembretes de hoje.

![Página do dia com a nota mais recente ao lado do grafo de páginas relacionadas, seguida de tarefas e lembretes](docs/images/pagina-do-dia.png)

No dia seguinte começa uma página nova. Os dias anteriores continuam disponíveis no seletor de datas, somente para leitura, exatamente como estavam: o que estava pendente, o que foi feito e o que estava agendado. Funciona como um diário que você nunca precisou escrever.

## Feito em português desde o início

A interface, a leitura de datas e a busca foram construídas para o português, não traduzidas para ele.

- Datas escritas na nota, como `amanhã às 14h` ou `05/10/2027 às 14:30`, ganham um selo **Agendar**. Nada é agendado até você clicar nele.
- A busca e as sugestões de categoria ignoram acentos e maiúsculas: `reuniao` encontra `reunião`.
- Hashtags como `#orçamento` viram categorias enquanto você digita.

## O que mais ajuda

**Páginas relacionadas, calculadas no seu Mac.** A cada salvamento, o Caderninho compara a página com as outras notas, listas e lembretes do mesmo caderno, por categorias em comum, palavras em comum e significado, incluindo o texto dentro de imagens. As duas páginas mais próximas aparecem no fim da nota, e o grafo (**⌥⌘R**) mostra o restante. Nenhum texto ou imagem sai do seu computador.

![Grafo de páginas relacionadas a uma nota de viagem: uma lista de bagagem, uma nota de trilha, um lembrete sobre o tempo e outras notas](docs/images/relacionados.png)

**Referências ao lado da ideia.** Imagens, PDFs e cartões de link ficam ao lado do parágrafo a que pertencem, com o texto contornando. Os arquivos são copiados para o app, e os cartões de link continuam funcionando sem internet.

![Nota de viagem com uma paisagem à direita e um cartão de link à esquerda, com o texto contornando os dois](docs/images/colagem.png)

**Diagramas como texto.** Digite `/diagrama` para escrever um fluxograma, uma sequência, um mapa mental ou uma linha do tempo em [Mermaid](https://mermaid.js.org). O diagrama é desenhado com traço de mão dentro da nota, e a busca encontra as palavras dele.

## Seus dados, numa pasta

Notas, listas, lembretes e categorias ficam num banco SQLite; imagens e PDFs ficam ao lado dele:

```text
~/Library/Application Support/caderninho/
```

Não há conta nem sincronização na nuvem. Para fazer backup, feche o app e copie essa pasta. Qualquer página pode ser exportada em PDF (**⇧⌘E**) com a formatação, as imagens, os diagramas e as ações ligadas a ela.

As únicas requisições de rede são as que você dispara: buscar a prévia de um link no site que você colou e baixar uma única vez o modelo usado pelas páginas relacionadas.

## Limites

- Só para macOS, com interface em português.
- Os lembretes só tocam com o app aberto (pode estar minimizado). Um alerta perdido com o app fechado ou o Mac em repouso toca quando o app volta.
- Sem sincronização entre computadores e sem versão para celular.
- Ainda não importa notas de outros apps.
- As páginas relacionadas são buscadas dentro do mesmo caderno, não entre cadernos.

---

[Instalar no Mac](docs/INSTALLATION.md) · [Guia de uso](docs/USER_GUIDE.md)

Gostou do Caderninho? Você pode apoiar o projeto com um café:

<a href="https://buymeacoffee.com/caderninho"><img src="site/img/bmc-button.svg" alt="Buy me a coffee" height="44"></a>

As capturas de tela mostram o app real com exemplos fictícios.
