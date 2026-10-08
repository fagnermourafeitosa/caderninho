<p align="center">
  <img src="assets/icon.png" width="112" alt="Logo do Caderninho">
</p>

<h1 align="center">Caderninho</h1>

<p align="center">
  Suas notas, tarefas e quadros, tudo conectado.<br>
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

Você escreve "pedir dois orçamentos" numa nota sobre a reforma da cozinha. Três semanas depois, a tarefa está perdida numa lista, e ninguém lembra de qual reforma era, quais orçamentos, nem por quê.

No Caderninho, a tarefa nasce da nota e continua ligada a ela. Você marca a frase, transforma em tarefa e segue escrevendo. A tarefa vai para uma lista onde dá para ver, de relance, em que pé está cada coisa. A nota mostra o andamento da tarefa, e a tarefa sempre sabe de onde veio.

Para as ideias que pedem mais espaço, há os quadros: um mural sem fim para post-its, setas e organogramas. Notas, tarefas, lembretes e quadros ficam no mesmo caderno, tudo conectado.

![Uma nota com duas tarefas e um lembrete ao lado, cada um ligado à frase destacada de onde veio; a tarefa concluída aparece em verde](docs/images/acoes-na-nota.png)

## Da nota para a tarefa, sem perder o fio

Na maioria dos apps, a nota fica de um lado e a lista de tarefas do outro. Você copia uma linha de um lugar para o outro e, no caminho, perde o porquê.

No Caderninho, você seleciona uma frase e escolhe **Tarefa** ou **Lembrete**. A tarefa aparece ao lado da nota, com a frase que a originou e a etapa em que está. A frase fica destacada na nota e fica verde quando a tarefa termina.

- Para criar uma tarefa sem parar de escrever, comece a linha com `[]`.
- O título já vem preenchido, e a lista mais recente do caderno já vem escolhida.
- Imagens e links colados na nota também podem virar tarefas.
- Os lembretes aparecem no calendário e tocam um alerta na hora marcada. **Ver origem** leva de volta à frase.
- Uma nota pode ter quantas tarefas e lembretes você quiser.
- Se você reescrever a frase depois, a tarefa guarda a versão original e avisa que ela mudou.

## Listas que mostram em que pé está cada coisa

Em **Tarefas**, cada lista é dividida em colunas, uma para cada etapa: o que ainda nem começou, o que está andando, o que está para revisar e o que já terminou. Ela já vem com cinco etapas prontas, e você pode renomear, reordenar, criar ou remover etapas do seu jeito. Para avançar uma tarefa, arraste-a para a coluna seguinte; quando ela chega à última, está concluída.

![Lista de tarefas "Montar o ateliê" dividida em cinco colunas, com a data de criação e o número de comentários em cada tarefa](docs/images/kanban.png)

Clique numa tarefa para ver tudo sobre ela: os detalhes, com listas, tabelas e imagens; os comentários, que você pode editar ou apagar; quem está cuidando dela; e cada etapa por onde ela passou.

![Tarefa aberta com detalhes em lista e tabela, uma imagem, dois comentários (um deles editado) e, ao lado, a etapa atual, o responsável, a data de criação e o histórico](docs/images/tarefa.png)

## Quadros para pensar no papel

Algumas ideias não cabem em linhas. No quadro, você espalha post-its, liga tudo com setas, desenha fluxos e organogramas, solta imagens e escreve onde quiser, com traço de mão, num papel pontilhado sem fim. O quadro fica no mesmo caderno das notas e das tarefas, e o que você escreve nele aparece na busca.

![Quadro "Ideias para o ateliê" com post-its coloridos ligados por setas e um título escrito à mão](docs/images/quadro.png)

## O seu dia numa página

A primeira tela, **Caderninho**, junta o que importa hoje: a última nota em que você mexeu e as páginas ligadas a ela, a lista de tarefas mais recente (dá para avançar as tarefas ali mesmo), os lembretes do dia e as últimas notas. Cada parte pode ser recolhida.

![Página do dia com a última nota, a lista de tarefas mais recente, os lembretes de hoje e as últimas notas](docs/images/pagina-do-dia.png)

No dia seguinte começa uma página nova, e as anteriores ficam guardadas como estavam: o que estava agendado e as notas daquele dia. É um diário que você nunca precisou escrever.

## Feito em português desde o início

O Caderninho foi pensado em português, não traduzido para ele.

- Escreva `amanhã às 14h` ou `05/10/2027 às 14:30` numa nota e aparece um botão **Agendar**. Nada é agendado até você clicar.
- A busca não se importa com acentos nem maiúsculas: `reuniao` encontra `reunião`.
- Escreva `#orçamento` e a nota ganha essa categoria na hora.

## Mais coisas que ajudam

**Páginas relacionadas.** Enquanto você escreve, o Caderninho encontra no mesmo caderno as notas, listas, quadros e lembretes que falam do mesmo assunto, inclusive pelo texto dentro de imagens. As duas mais próximas aparecem no fim da nota, e **⌥⌘R** mostra todas num mapa. Tudo é calculado no seu Mac; nada é enviado para fora.

![Mapa de páginas relacionadas a uma nota de viagem: uma nota de trilha, uma lista de preparativos e um lembrete sobre o tempo](docs/images/relacionados.png)

**Referências ao lado da ideia.** Imagens, PDFs e links ficam ao lado do parágrafo a que pertencem, com o texto em volta. Tudo é guardado no app, e os links continuam visíveis mesmo sem internet.

![Nota de viagem com uma paisagem à direita e um link à esquerda, com o texto em volta dos dois](docs/images/colagem.png)

**Diagramas escritos.** Digite `/diagrama` e escreva um fluxo, uma sequência ou uma linha do tempo em texto simples ([Mermaid](https://mermaid.js.org)). O Caderninho desenha o diagrama dentro da nota, com traço de mão.

## Seus dados ficam com você

Não há conta nem nuvem. Tudo fica numa pasta do seu Mac:

```text
~/Library/Application Support/caderninho/
```

Para fazer backup, feche o app e copie essa pasta. Notas e lembretes podem ser salvos em PDF (**⇧⌘E**), e quadros, como imagem (PNG ou SVG).

O app só acessa a internet quando você pede: para mostrar a prévia de um link que você colou e, uma única vez, para baixar o que faz as páginas relacionadas funcionarem.

## O que ele ainda não faz

- Só funciona no Mac, e a interface é em português.
- Os lembretes só tocam com o app aberto (pode estar minimizado). Se o app estiver fechado ou o Mac dormindo, o alerta toca quando você voltar.
- Não sincroniza entre computadores e não tem versão para celular.
- Listas de tarefas não são salvas em PDF.
- Ainda não importa notas de outros apps.
- As páginas relacionadas são procuradas dentro do mesmo caderno, não entre cadernos.

---

[Instalar no Mac](docs/INSTALLATION.md) · [Guia de uso](docs/USER_GUIDE.md)

Gostou do Caderninho? Você pode apoiar o projeto com um café:

<a href="https://buymeacoffee.com/caderninho"><img src="site/img/bmc-button.svg" alt="Buy me a coffee" height="44"></a>

As capturas de tela mostram o app real com exemplos fictícios.

[MIT License](https://opensource.org/license/mit)
