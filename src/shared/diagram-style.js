// Mermaid configuration shared by the editor and the PDF print view: hand-drawn strokes in the notebook palette.
(function(root){
  const ink='#303025',paper='#fbf0d5',shade='#efe0b9',accent='#f8d985',edge='#36352a',muted='#8a8068';
  // Excalifont ships with the app (Excalidraw's handwriting); the system handwriting fonts are fallbacks.
  const font="Excalifont,'Chalkboard SE','Comic Sans MS',cursive";
  const config={
    startOnLoad:false,
    securityLevel:'strict',
    look:'handDrawn',
    // A fixed seed keeps the strokes still while the code is retyped.
    handDrawnSeed:7,
    theme:'base',
    fontFamily:font,
    htmlLabels:false,
    flowchart:{htmlLabels:false,curve:'basis'},
    themeVariables:{
      fontFamily:font,fontSize:'16px',background:paper,
      primaryColor:paper,primaryTextColor:ink,primaryBorderColor:edge,
      secondaryColor:accent,secondaryTextColor:ink,secondaryBorderColor:edge,
      tertiaryColor:shade,tertiaryTextColor:ink,tertiaryBorderColor:edge,
      lineColor:edge,textColor:ink,mainBkg:paper,nodeBorder:edge,clusterBkg:shade,clusterBorder:muted,titleColor:ink,edgeLabelBackground:paper,
      noteBkgColor:accent,noteTextColor:ink,noteBorderColor:edge,
      actorBkg:paper,actorBorder:edge,actorTextColor:ink,actorLineColor:edge,signalColor:edge,signalTextColor:ink,
      labelBoxBkgColor:shade,labelBoxBorderColor:edge,labelTextColor:ink,loopTextColor:ink,activationBkgColor:shade,activationBorderColor:edge,
      cScale0:accent,cScale1:'#c5d3ae',cScale2:'#deb9a7',cScale3:'#b9cfd7',cScale4:'#d0bed9',cScale5:'#e3c1c8',
      cScaleLabel0:ink,cScaleLabel1:ink,cScaleLabel2:ink,cScaleLabel3:ink,cScaleLabel4:ink,cScaleLabel5:ink
    }
  };
  const api={config};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.diagramStyle=api;
})(typeof window==='object'?window:globalThis);
