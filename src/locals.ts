import { localCategories, type Local, type LocalCategory } from './grid';

// Original app content. All categories can occur on any terrain, including water.
const names: Record<LocalCategory, readonly string[]> = {
  povoado: ['Vila da ponte velha', 'Aldeia dos juncos', 'Porto das lanternas', 'Vila do poço fundo', 'Aldeia da figueira', 'Porto da pedra branca'],
  masmorra: ['Galerias sem luz', 'Cárcere soterrado', 'Poço dos ecos', 'Túneis da ferrugem', 'Salas sob a pedra', 'Cripta das seis portas'],
  ruína: ['Torre partida', 'Ponte esquecida', 'Moinho sem rodas', 'Muralha caída', 'Pátio das colunas', 'Farol apagado'],
  covil: ['Toca das ossadas', 'Gruta dos arranhões', 'Abrigo sob as raízes', 'Ninho na pedra', 'Fenda dos uivos', 'Buraco das presas'],
  santuário: ['Altar das chuvas', 'Capela sem sino', 'Pedra das oferendas', 'Círculo das velas', 'Fonte dos votos', 'Jardim do silêncio'],
  marco: ['Velha árvore negra', 'Pedra furada', 'Tronco das fitas', 'Coluna solitária', 'Sino enterrado', 'Arco de raízes'],
};

export function generateLocal(rollDie: () => number): Local | undefined {
  if (rollDie() !== 1) return undefined;
  const category = localCategories[rollDie() - 1]!;
  return { name: names[category][rollDie() - 1]!, category };
}
