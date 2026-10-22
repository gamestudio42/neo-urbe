import { setCatalogOverride, type Locale } from '@neon/web/i18n';

/**
 * Neo Urbe copy. Rather than forking five catalogs, each locale overrides only the strings that
 * change with the cyberpunk setting: the title, the menu pitch, the city name and the vocabulary
 * of the new systems. Everything else keeps the Urbe wording, so the two games stay in sync.
 */

type Copy = {
  pageTitle: string;
  subtitle: string;
  defaultCityName: string;
  tagline: string;
  grid: string;
  corps: string;
  ice: string;
  drones: string;
  vertical: string;
  overload: string;
  battery: string;
  firewall: string;
  hacked: string;
  corpOwned: string;
  droneLane: string;
  fiber: string;
  datacenter: string;
  edgeNode: string;
  fiberHint: string;
  datacenterHint: string;
  edgeNodeHint: string;
  dataMap: string;
  noData: string;
};

const EN: Copy = {
  pageTitle: 'Neo Urbe — jack into the city',
  subtitle: 'Raise a neon skyline, keep the grid alive and sell nothing to the corps.',
  defaultCityName: 'Neon City',
  tagline: 'The grid is unstable. So is everything else.',
  grid: 'Power grid',
  corps: 'Megacorps',
  ice: 'ICE',
  drones: 'Drones',
  vertical: 'Spires',
  overload: 'Grid overload',
  battery: 'Battery charge',
  firewall: 'ICE cover',
  hacked: 'Hacked',
  corpOwned: 'Corporate lot',
  droneLane: 'Drone lane',
  fiber: 'Fiber trunk',
  datacenter: 'Datacenter',
  edgeNode: 'Edge node',
  fiberHint: 'Drag a trunk, the way you lay a pipe. The underground view comes on.',
  datacenterHint: 'Feeds the data network. Full output needs power and cooling water.',
  edgeNodeHint: 'A small feed for the first block. Needs power, not water.',
  dataMap: 'Data',
  noData: 'No data link: growth stops at level 2.',
};

const PT: Copy = {
  pageTitle: 'Neo Urbe — conecte-se à cidade',
  subtitle: 'Erga um horizonte de neon, mantenha a rede viva e não venda nada às corporações.',
  defaultCityName: 'Cidade Neon',
  tagline: 'A rede é instável. O resto também.',
  grid: 'Rede elétrica',
  corps: 'Megacorporações',
  ice: 'ICE',
  drones: 'Drones',
  vertical: 'Torres',
  overload: 'Sobrecarga da rede',
  battery: 'Carga das baterias',
  firewall: 'Cobertura de ICE',
  hacked: 'Invadido',
  corpOwned: 'Lote corporativo',
  droneLane: 'Rota de drones',
  fiber: 'Tronco de fibra',
  datacenter: 'Datacenter',
  edgeNode: 'Nó de borda',
  fiberHint: 'Arraste o tronco como um cano. A vista subterrânea liga.',
  datacenterHint: 'Alimenta a rede de dados. A capacidade cheia precisa de energia e de água para resfriar.',
  edgeNodeHint: 'Uma fonte pequena para o primeiro quarteirão. Precisa de energia, não de água.',
  dataMap: 'Dados',
  noData: 'Sem link de dados: o crescimento para no nível 2.',
};

const ES: Copy = {
  pageTitle: 'Neo Urbe — conéctate a la ciudad',
  subtitle: 'Levanta un horizonte de neón, mantén la red viva y no le vendas nada a las corporaciones.',
  defaultCityName: 'Ciudad Neón',
  tagline: 'La red es inestable. Todo lo demás también.',
  grid: 'Red eléctrica',
  corps: 'Megacorporaciones',
  ice: 'ICE',
  drones: 'Drones',
  vertical: 'Torres',
  overload: 'Sobrecarga de red',
  battery: 'Carga de baterías',
  firewall: 'Cobertura de ICE',
  hacked: 'Hackeado',
  corpOwned: 'Solar corporativo',
  droneLane: 'Ruta de drones',
  fiber: 'Troncal de fibra',
  datacenter: 'Centro de datos',
  edgeNode: 'Nodo de borde',
  fiberHint: 'Arrastra la troncal como una tubería. La vista subterránea se activa.',
  datacenterHint: 'Alimenta la red de datos. La capacidad plena necesita energía y agua para enfriar.',
  edgeNodeHint: 'Una fuente pequeña para la primera manzana. Necesita energía, no agua.',
  dataMap: 'Datos',
  noData: 'Sin enlace de datos: el crecimiento se detiene en el nivel 2.',
};

const FR: Copy = {
  pageTitle: 'Neo Urbe — connecte-toi à la ville',
  subtitle: 'Dresse un horizon de néon, garde le réseau en vie et ne vends rien aux corporations.',
  defaultCityName: 'Ville Néon',
  tagline: 'Le réseau est instable. Le reste aussi.',
  grid: 'Réseau électrique',
  corps: 'Megacorporations',
  ice: 'ICE',
  drones: 'Drones',
  vertical: 'Tours',
  overload: 'Surcharge du réseau',
  battery: 'Charge des batteries',
  firewall: 'Couverture ICE',
  hacked: 'Piraté',
  corpOwned: 'Lot corporatif',
  droneLane: 'Couloir de drones',
  fiber: 'Tronc de fibre',
  datacenter: 'Centre de données',
  edgeNode: 'Nœud de bord',
  fiberHint: 'Tracez le tronc comme une canalisation. La vue souterraine s’active.',
  datacenterHint: 'Alimente le réseau de données. Le plein débit a besoin d’énergie et d’eau pour le refroidissement.',
  edgeNodeHint: 'Une petite source pour le premier pâté. A besoin d’énergie, pas d’eau.',
  dataMap: 'Données',
  noData: 'Pas de lien de données : la croissance s’arrête au niveau 2.',
};

const DE: Copy = {
  pageTitle: 'Neo Urbe — steig in die Stadt ein',
  subtitle: 'Baue eine Neon-Skyline, halte das Netz am Leben und verkaufe nichts an die Konzerne.',
  defaultCityName: 'Neonstadt',
  tagline: 'Das Netz ist instabil. Alles andere auch.',
  grid: 'Stromnetz',
  corps: 'Megakonzerne',
  ice: 'ICE',
  drones: 'Drohnen',
  vertical: 'Türme',
  overload: 'Netzüberlastung',
  battery: 'Batterieladung',
  firewall: 'ICE-Abdeckung',
  hacked: 'Gehackt',
  corpOwned: 'Konzerngrundstück',
  droneLane: 'Drohnenroute',
  fiber: 'Glasfaserstamm',
  datacenter: 'Rechenzentrum',
  edgeNode: 'Randknoten',
  fiberHint: 'Ziehen Sie den Stamm wie eine Leitung. Die Untergrundansicht geht an.',
  datacenterHint: 'Speist das Datennetz. Volle Leistung braucht Strom und Kühlwasser.',
  edgeNodeHint: 'Eine kleine Quelle für das erste Viertel. Braucht Strom, kein Wasser.',
  dataMap: 'Daten',
  noData: 'Keine Datenverbindung: Wachstum stoppt bei Stufe 2.',
};

const COPY: Record<Locale, Copy> = {
  en: EN,
  'pt-BR': PT,
  es: ES,
  fr: FR,
  de: DE,
};

/** Applies the Neo copy on top of the Urbe catalog for one locale. */
export function applyNeonCopy(locale: Locale): void {
  const copy = COPY[locale] ?? EN;
  setCatalogOverride(locale, {
    brand: 'NEO URBE',
    pageTitle: copy.pageTitle,
    menu: {
      subtitle: copy.subtitle,
      defaultCityName: copy.defaultCityName,
    },
    tools: {
      fiber: copy.fiber,
      datacenter: copy.datacenter,
      edgeNode: copy.edgeNode,
    },
    toolHints: {
      fiber: copy.fiberHint,
      datacenter: copy.datacenterHint,
      edgeNode: copy.edgeNodeHint,
    },
    overlays: { data: copy.dataMap },
    problems: { NO_DATA: copy.noData },
  });
}

/** Vocabulary used by the Neo panels, resolved per locale. */
export function neonCopy(locale: Locale): Copy {
  return COPY[locale] ?? EN;
}
