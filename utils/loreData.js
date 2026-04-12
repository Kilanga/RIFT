/**
 * RIFT — Données narratives
 * Dialogues boss, épilogue par classe, murmures de combat
 */

import { ENEMY_TYPES, PLAYER_SHAPES } from '../constants';

// ─── Dialogues boss ───────────────────────────────────────────────────────────
// Structure : tableau d'échanges
//   { boss: string, choices: [{ label, response }], final: string }
// Le joueur lit boss → choisit → lit response → lit boss.final → bouton COMBATTRE

export const BOSS_DIALOGUES = {

  [ENEMY_TYPES.BOSS_VOID]: {
    color: '#BB44FF',
    exchanges: [
      {
        boss: "Un autre. Vous continuez à entrer, malgré tout.",
        choices: [
          { label: "Je sais ce que je fais.",   response: "C'est ce que j'ai dit aussi. Mot pour mot." },
          { label: "Qui es-tu ?",               response: "Ce que tu deviendras, peut-être. Je suis le premier à avoir atteint ce niveau. Ça me vaut... ce statut." },
          { label: "Laisse-moi passer.",        response: "Je ne peux pas. Pas parce que je ne veux pas. Parce que c'est tout ce que je suis encore." },
        ],
      },
    ],
    final: "Je t'aurais bien conseillé de rebrousser chemin. Mais tu n'écouterais pas. Personne n'écoute.",
    deathLine: "...encore une fois. Je serai là... quand le prochain arrivera.",
  },

  [ENEMY_TYPES.BOSS_CINDER]: {
    color: '#FF7A2F',
    exchanges: [
      {
        boss: "Tu sens la chaleur ? C'est la mémoire de ceux qui ont essayé de franchir la porte avant toi.",
        choices: [
          { label: "Tu gardais quoi ici ?", response: "Des cendres. Des serments. Et ce qui reste quand un poste est oublié trop longtemps." },
          { label: "Tu es vivant ?", response: "Assez pour brûler. Assez pour me rappeler que j'ai encore un rôle." },
          { label: "Tu vas céder.", response: "Pas sans appeler des renforts depuis les bords de la salle. Le Rift aime les retards, pas les murs fermés." },
        ],
      },
    ],
    final: "Approche. Je ne te ferme pas la route. Je la chauffe jusqu'à ce que tu la sentes.",
    deathLine: "...les braises... ne s'éteignent jamais vraiment...",
  },

  [ENEMY_TYPES.BOSS_MIRROR]: {
    color: '#FF66AA',
    exchanges: [
      {
        boss: "Je te vois changer à chaque pas. C'est ainsi que le Rift te copie.",
        choices: [
          { label: "Tu me recopies ?", response: "Je te renvoie seulement ce que tu montres. Le reste vient de toi." },
          { label: "Tu es la première ?", response: "Je suis la voix qui reste quand les autres ont fini de répondre." },
          { label: "Tu n'es qu'un reflet.", response: "Les reflets coupent aussi. Surtout quand ils apprennent à choisir." },
        ],
      },
    ],
    final: "Je bouge quand tu bouges. C'est la seule honnêteté qui nous reste.",
    deathLine: "...le miroir... se fend...",
  },

  [ENEMY_TYPES.BOSS_WEAVER]: {
    color: '#C48AFF',
    exchanges: [
      {
        boss: "Tu crois voir une salle. Moi, j'y vois déjà les fils qui la tiennent debout.",
        choices: [
          { label: "Tu ne vas pas bloquer ma route.", response: "Je n'ai pas besoin de la bloquer. Je n'ai qu'à la rendre inconfortable." },
          { label: "Pourquoi tisser ici ?", response: "Parce que le Rift laisse des trous. Et qu'un trou non refermé devient une blessure." },
          { label: "Tu parles comme un architecte.", response: "J'en étais un. Avant que la ruine devienne ma matière première." },
        ],
      },
    ],
    final: "Ce n'est pas une prison. C'est une couture. Et tu tires déjà dessus.",
    deathLine: "...les fils... tombent...",
  },

  [ENEMY_TYPES.BOSS_RUST]: {
    color: '#B7A588',
    exchanges: [
      {
        boss: "Le métal rouille. Les serments aussi. Je suis ce qu'il reste quand la garde dure trop longtemps — et quand l'arsenal d'avant-run n'est pas complet.",
        choices: [
          { label: "Tu protégeais quoi ?", response: "Une porte, une fois. Puis une autre. Puis la même, encore." },
          { label: "Tu vas céder au temps.", response: "Le temps a déjà gagné. Je tiens juste encore debout en me couvrant de plaques." },
          { label: "Alors tombe.", response: "Pas avant que tu comprennes pourquoi quelqu'un est resté ici — et pourquoi il vaut mieux arriver équipé." },
        ],
      },
    ],
    final: "Je ne suis plus une statue. Je suis une mission qui se protège encore avec ce qu'elle trouve. Si tu n'as pas tout ce qu'il faut, je te le ferai sentir.",
    deathLine: "...la plaque... se fend... enfin...",
  },

  [ENEMY_TYPES.BOSS_CUTTER]: {
    color: '#66D6FF',
    exchanges: [
      {
        boss: "Tu avances droit. C'est rare. C'est aussi la façon la plus simple de te briser.",
        choices: [
          { label: "Tu coupes quoi ?", response: "Les lignes. Les habitudes. Les certitudes qui te font croire que la salle t'appartient." },
          { label: "Tu es rapide ?", response: "Je suis précis. La vitesse n'est qu'un détail quand l'angle est juste." },
          { label: "Tu ne me feras pas plier.", response: "Je ne compte pas te plier. Juste te forcer à regarder autrement." },
        ],
      },
    ],
    final: "Un pas de côté, et tu vis. Un pas de trop, et tu saignes.",
    deathLine: "...les coupes... se referment...",
  },

  [ENEMY_TYPES.BOSS_PULSE]: {
    color: '#FF6644',
    exchanges: [
      {
        boss: "Je ne me souviens pas d'avoir été fabriqué. Je ne me souviens pas d'avoir été utilisé. Je sais juste que je suis là, et que tu es en face de moi.",
        choices: [
          { label: "Qu'est-ce que tu es ?",          response: "Ce que ta guerre a laissé derrière elle. Votre arme a frappé quelque chose d'ancien. Ce qui restait de cette frappe... c'est moi." },
          { label: "Tu bloques mon chemin.",          response: "Oui. Je ne sais pas pourquoi. Mais quelque chose en moi dit que personne ne doit passer. Je fais confiance à ce quelque chose." },
          { label: "Tu n'as pas choisi d'être ici.", response: "Non. Toi non plus, à ta façon. Ça ne change pas ce qui va se passer." },
        ],
      },
      {
        boss: "Je n'ai pas de mémoire. Pas de maître. Pas de raison de te vouloir du mal en particulier. Mais la puissance cherche à s'exprimer. Et tu es là.",
        choices: [
          { label: "Alors bats-toi.",                      response: "C'est la première chose sensée que tu aies dite." },
          { label: "Si tu n'as pas de raison, laisse-moi.", response: "J'ai dit que je n'avais pas de mémoire. J'ai un instinct. Et il dit non." },
          { label: "Ton arme a causé tout ça.",            response: "Je sais. Je n'ai pas à être fier de ce que j'étais. Mais je suis ce que je suis maintenant." },
        ],
      },
    ],
    final: "Allons voir ce que tu vaux.",
    deathLine: "...c'est tout ce que j'étais. Juste... de la puissance. Sans direction. C'est triste, non ?",
  },

  [ENEMY_TYPES.BOSS_RIFT]: {
    color: '#FF2266',
    exchanges: [
      {
        boss: "Tu es allé loin. Pas beaucoup de gens arrivent jusqu'ici.",
        choices: [
          { label: "Écarte-toi.",       response: "Non. Pas parce qu'on me l'a demandé. Parce que ce qu'il y a derrière moi ne doit pas sortir. Pour toi. Pour moi aussi, d'ailleurs." },
          { label: "Qu'est-ce que tu es ?", response: "Un opportuniste. Le Rift saigne depuis 60 ans. Je suis entré par une brèche. Je me nourris ici. C'est confortable, à ma façon." },
          { label: "Tu gardes quelque chose ?", response: "Je ne garde rien. Mais je sais ce qui est derrière moi. Et je n'ai aucune envie de le voir sortir." },
        ],
      },
      {
        boss: "Ce qui est plus loin dans ce Rift — ce n'est pas un monstre comme moi. Moi je mange. J'occupe de l'espace. Ce qui est là-bas... défait les choses. La matière. L'espace. Toi. Moi. Tout.",
        choices: [
          { label: "Je dois quand même y aller.",  response: "Je sais. C'est pour ça qu'on se bat. J'aurais préféré qu'on ne soit pas obligés." },
          { label: "Pourquoi tu m'avertis ?",      response: "Parce que si tu le libères, je disparais aussi. On a le même intérêt, toi et moi. Juste des méthodes différentes." },
          { label: "Tu aurais pu ne rien dire.",   response: "Oui. Mais ça m'aurait semblé malhonnête." },
        ],
      },
    ],
    final: "Je ne te hais pas. Mais tu vas affaiblir ce qui retient la porte. Alors on n'a pas le choix.",
    deathLine: "...au moins... c'est toi qui continues... et pas n'importe qui...",
  },

  [ENEMY_TYPES.BOSS_GUARDIAN]: {
    color: '#44CCFF',
    exchanges: [
      {
        boss: "Un humain. Ça fait longtemps.",
        choices: [
          { label: "Combien de temps ?",         response: "Depuis que la prison a été construite. Bien avant ta grande guerre. Bien avant ton royaume." },
          { label: "Tu étais là avant la guerre ?", response: "La prison existait avant ta guerre. Votre arme n'a fait que l'abîmer. Nous avons contenu les dégâts. Tant bien que mal." },
          { label: "Qui t'a placé ici ?",        response: "Ceux qui ont construit la prison. Ils ont disparu depuis longtemps. Mais la mission, elle, reste." },
        ],
      },
      {
        boss: "Je vais te dire ce que tu trouveras si tu passes. Pas pour te faire peur. Parce que tu mérites de savoir pour quoi tu te bats.\n\nCe Rift est une prison construite pour contenir quelque chose d'antérieur au monde. Une force qui existait avant que la matière décide de s'organiser. Elle ne pense pas. Elle ne choisit pas. Elle défait, parce que c'est sa nature. On ne peut pas la détruire. On peut seulement la contenir.",
        choices: [
          { label: "Et tu la contiens depuis combien de temps ?", response: "Depuis le début. Seul. Ta guerre a rendu le travail... plus difficile. Mais j'ai tenu." },
          { label: "Pourquoi ne pas le dire aux royaumes ?",       response: "Certains le savent. Ton ordre le sait. Mais la connaissance et l'action sont deux choses différentes." },
          { label: "Je ne pars pas.",                             response: "Je sais. Sinon tu ne serais pas arrivé jusqu'ici." },
        ],
      },
      {
        boss: "Je n'ai pas de haine contre toi. Mais personne ne passe cette porte. Pas par cruauté. Parce que derrière, il y a quelque chose que même toi tu ne peux pas contenir seul.",
        choices: [
          { label: "J'ai battu tout le reste.",       response: "Oui. C'est pour ça que je te parle au lieu d'attaquer immédiatement. Ça ne change pas l'issue." },
          { label: "Et si je pouvais la rebattre ?",  response: "...personne n'a jamais posé cette question sérieusement." },
          { label: "Tu es fatigué.",                  response: "...oui. C'est un long poste." },
        ],
      },
    ],
    final: "Allons-y.",
    deathLine: "...la porte... s'ouvre... referme-la... derrière toi... je t'en supplie...",
  },

  [ENEMY_TYPES.BOSS_ENTITY]: {
    color: '#FF0044',
    exchanges: [
      {
        boss: "Enfin. Soixante ans dans cette cage. Et avant ça, des siècles d'autres cages.",
        choices: [
          { label: "Qu'est-ce que tu es ?",  response: "Ce qui existait avant que ton monde décide d'exister. Ce qui existera quand il aura fini." },
          { label: "Tu vas rester ici.",     response: "Non." },
          { label: "...",                    response: "Rien à dire. Bien. Les mots sont une invention de ceux qui ont peur du silence." },
        ],
      },
      {
        boss: "Ceux qui m'ont enfermée ici croyaient faire le bon choix. Des bâtisseurs. Des architectes de réalité. Très fiers d'eux-mêmes. Ils ont disparu depuis. Leur prison, elle, tient encore. À peine.",
        choices: [
          { label: "Leurs successeurs ont tenu la prison.", response: "Oui. Des gardiens qui ne comprennent pas vraiment ce qu'ils gardent. Fidèles, mais ignorants. C'est touchant, d'une certaine façon." },
          { label: "Tu méritais d'être emprisonnée.",       response: "Mériter. Voilà un concept que seuls les êtres qui craignent la mort ont inventé. Je ne crains rien. Je ne mérite rien. Je suis." },
          { label: "Ce que tu veux va tout détruire.",      response: "Défaire. Pas détruire. Ce n'est pas pareil. Détruire, ça laisse des décombres. Ce que je fais ne laisse rien." },
        ],
      },
      {
        boss: "Tu veux savoir ce qui est drôle ? Cette prison m'a affaiblie. Des siècles de captivité. Je suis une fraction de ce que je suis. Et même ainsi, tu vas avoir du mal.",
        choices: [
          { label: "Alors c'est le bon moment.",          response: "Logique. J'apprécie la logique. C'est rare chez les êtres qui vont mourir." },
          { label: "Tu ne sortiras pas d'ici.",           response: "Chaque fois que quelqu'un m'a dit ça, j'ai fini par sortir. Sauf ici. Pour l'instant." },
          { label: "Moi je suis encore debout.",          response: "...intéressant." },
        ],
      },
    ],
    final: "Allons voir si ton monde mérite de continuer.",
    deathLine: "...encore... je... reviendrai... toujours... ce n'est pas une menace... c'est un fait...",
  },
};

// ─── Épilogue par classe (VictoryScreen) ──────────────────────────────────────

export const CLASS_EPILOGUES = {
  [PLAYER_SHAPES.TRIANGLE]: {
    title:  "L'Assassin",
    color:  '#00FFCC',
    text:   "Tu as trouvé ce que tu cherchais au fond du Rift. Ou ce qu'il en restait. La réponse n'était pas celle que tu espérais. Elle l'est rarement. Mais tu sais, maintenant. C'est quelque chose.",
  },
  [PLAYER_SHAPES.CIRCLE]: {
    title:  "L'Arcaniste",
    color:  '#FF66FF',
    text:   "Tes calculs étaient justes. Le Rift obéit à des lois. Tu les as comprises en les traversant. Le carnet est plein. Il faudra en écrire un autre. Il y a encore beaucoup à apprendre ici.",
  },
  [PLAYER_SHAPES.HEXAGON]: {
    title:  "Le Colosse",
    color:  '#66AAFF',
    text:   "La source est affaiblie. Les brèches vont se réduire. Pas toutes, pas tout de suite — mais assez pour que les villages respirent un peu. C'est pour ça que tu es entré. C'est fait.",
  },
  [PLAYER_SHAPES.SPECTRE]: {
    title:  "Le Spectre",
    color:  '#BB44FF',
    text:   "Tu as senti quelque chose se replacer en toi au fond du Rift. Pas tout. Jamais tout. Mais assez pour que le monde d'en haut redevienne réel. Tu ressors différent. Tu ressors entier.",
  },
  [PLAYER_SHAPES.SHADOW]: {
    title:  "L'Ombre",
    color:  '#FF6600',
    text:   "Le Fragment que tu ramènes vaut effectivement une fortune. Le marchand le sait aussi, d'ailleurs — son sourire quand tu l'as décrit ne t'a pas échappé. La prochaine fois, tu négocies mieux.",
  },
  [PLAYER_SHAPES.PALADIN]: {
    title:  "Le Paladin",
    color:  '#FFCC00',
    text:   "La prison tient. Renforcée, pour un temps. Tu rentreras faire ton rapport. L'ordre enverra quelqu'un d'autre dans dix ans. En attendant, tu as accompli ta mission. C'est suffisant.",
  },
};

// ─── Murmures du Rift (logs narratifs aléatoires) ────────────────────────────

export const RIFT_MURMURS = [
  "Le Rift pulse. Quelque chose a remarqué que tu es entré.",
  "Un Fragment sous tes pieds tremble. Il se souvient d'avoir été quelqu'un.",
  "Les murs ici ont été construits. Quelqu'un a voulu que tu ne passes pas.",
  "Tu entends quelque chose derrière les murs. Un rythme régulier. Comme une respiration.",
  "Les Fragments que tu portes appartenaient à d'autres. Ils ne t'en veulent pas.",
  "Une marque sur le sol. Quelqu'un est passé ici avant toi. Il n'est pas ressorti.",
  "Le Rift est plus vieux que la guerre qui l'a endommagé.",
  "Chaleur soudaine. L'Entité sait que tu approches.",
  "Plus tu descends, moins le monde d'en haut semble réel.",
  "Le Rift ne te retient pas. Pas encore.",
  "Quelque chose dans ces murs résiste encore. Les bâtisseurs ont bien travaillé.",
  "Les créatures ici ne te haïssent pas. Elles ne savent plus ce que ça veut dire.",
  "Ce niveau était autre chose, autrefois. Avant que le Rift le prenne.",
  "Le Gardien est réveillé. Il sait que tu viens.",
  "Silence soudain. Même le Rift retient son souffle.",
];

// ─── Dialogues L'Origine ──────────────────────────────────────────────────────

export const ORIGINE_DIALOGUE = [
  "Tu as battu l'Entité. Bien. Il y a des choses que tu devrais savoir.",
  "Nous sommes les bâtisseurs. Ceux qui ont construit la prison il y a longtemps — bien avant ta grande guerre. Nous n'appartenons plus à ton monde. Nous avons disparu il y a des siècles. Ce que tu entends est ce qui reste de notre mémoire collective, stockée dans les murs du Rift.",
  "L'Entité n'est pas un monstre né de nulle part. Elle est une force antérieure — ce qu'il y avait avant que la matière et l'espace décident de s'organiser. Elle n'a pas de conscience morale. Elle ne cherche pas à détruire par malice. Elle cherche à défaire, parce que c'est sa nature, comme l'eau cherche à descendre.",
  "La prison ne peut pas la détruire. Rien ne le peut. Elle peut seulement la contenir, l'affaiblir, ralentir. Chaque fois que tu la bats, elle se reconstitue. Plus lentement. Mais elle se reconstitue.",
  "Ce que tu fais en entrant dans le Rift — ce n'est pas héroïque. Ce n'est pas inutile non plus. Tu maintiens l'équilibre. Tu repousses ce qui ne devrait pas exister dans un monde qui, lui, a choisi d'exister.",
  "Continue.",
];

// ─── Pages du prologue ────────────────────────────────────────────────────────

// ─── Codex : lore et stats de chaque entité ───────────────────────────────────
// Chaque entrée correspond à un ENEMY_TYPE ou à 'origine' (personnage spécial).
// `stats` reflète les valeurs de base de procGen.js.

export const ENEMY_LORE = [

  // ── Ennemis communs ─────────────────────────────────────────────────────────
  {
    id:       ENEMY_TYPES.CHASER,
    name:     "Écumeur",
    category: 'Ennemi commun',
    color:    '#FF4444',
    lore:     "Une forme de vie primitive née dans les couches superficielles du Rift. L'Écumeur n'a ni stratégie ni instinct de survie : il charge la première chaleur vivante qu'il détecte. Rapide, prévisible, dangereux en groupe.",
    stats:    { hp: 10, attack: 2, defense: 0, speed: 2 },
  },
  {
    id:       ENEMY_TYPES.SHOOTER,
    name:     "Tirailleur",
    category: 'Ennemi commun',
    color:    '#4488FF',
    lore:     "Le Tirailleur est une créature mi-organique, mi-cristalline. Il ne se déplace pas — il attend. Ses organes internes concentrent l'énergie du Rift et la projettent en rafales. Fragile de près, redoutable à distance.",
    stats:    { hp: 8, attack: 3, defense: 0, speed: 1 },
  },
  {
    id:       ENEMY_TYPES.BLOCKER,
    name:     "Titan",
    category: 'Ennemi commun',
    color:    '#888899',
    lore:     "Une entité lourde, lente, presque minérale. Le Titan s'est cristallisé autour d'un noyau d'énergie du Rift. Il ne blesse pas par malice — il occupe l'espace, étouffe les passages, rend les salles irrespirables. La patience est son arme principale.",
    stats:    { hp: 12, attack: 2, defense: 1, speed: 1 },
  },
  {
    id:       ENEMY_TYPES.HEALER,
    name:     "Guérisseur",
    category: 'Ennemi commun',
    color:    '#44FF88',
    lore:     "Le Guérisseur est un parasite symbiotique. Seul, il est inoffensif. Aux côtés d'autres créatures, il devient leur soutien vital : il régénère leurs blessures, prolonge leur existence, multiplie leur menace. Neutralise-le en priorité.",
    stats:    { hp: 8, attack: 3, defense: 0, speed: 1 },
  },
  {
    id:       ENEMY_TYPES.EXPLOSIVE,
    name:     "Explosif",
    category: 'Ennemi commun',
    color:    '#FF8800',
    lore:     "Une créature instable, chargée d'énergie volatile accumulée depuis sa naissance dans le Rift. Elle court vers sa cible sans hésitation. Sa mort est son attaque la plus dangereuse : une explosion qui dévaste tout ce qui l'entoure.",
    stats:    { hp: 6, attack: 1, defense: 0, speed: 2 },
  },
  {
    id:       ENEMY_TYPES.SUMMONER,
    name:     "Invocateur",
    category: 'Ennemi commun',
    color:    '#CC44FF',
    lore:     "Plus intelligent que ses congénères, l'Invocateur a appris à exploiter les failles du Rift pour y faire émerger d'autres créatures. Ce n'est pas lui qui te tuera — ce sont les vagues qu'il génère si tu l'ignores trop longtemps.",
    stats:    { hp: 15, attack: 4, defense: 0, speed: 1 },
  },
  {
    id:       ENEMY_TYPES.SENTINEL,
    name:     "Sentinelle",
    category: "Ennemi d'élite",
    color:    '#44DDE6',
    lore:     "La Sentinelle n'explore pas le Rift : elle le garde. Cette machine organique reste en retrait, verrouille les couloirs et punira toute erreur de positionnement. Dans les hautes couches, elle devient le vrai test de discipline.",
    stats:    { hp: 18, attack: 4, defense: 1, speed: 1 },
  },

  // ── Boss ────────────────────────────────────────────────────────────────────
  {
    id:       ENEMY_TYPES.BOSS_VOID,
    name:     "L'Écho",
    category: 'Boss · Acte I',
    color:    '#BB44FF',
    lore:     "Avant toi, quelqu'un d'autre est entré dans le Rift. Il a atteint ce niveau, pensait maîtriser ce qu'il traversait. Il avait tort. Le Rift ne détruit pas les intrus — il les absorbe, les recycle. L'Écho est ce qui reste de cet aventurier : sa forme, ses réflexes, ses doutes. Il te reconnaît, en un sens.",
    stats:    { hp: 25, attack: 4, defense: 0, speed: 2 },
  },
  {
    id:       ENEMY_TYPES.BOSS_CINDER,
    name:     'Le Veilleur de Cendre',
    category: 'Boss · Acte I',
    color:    '#FF7A2F',
    lore:     "Ce gardien restait autrefois à la lisière d'une porte de service, chargé de surveiller les braises des anciens forges-puits. Le Rift a transformé son devoir en combustion lente. Il n'arrête pas le passage par haine : il le retarde, comme si le temps pouvait encore sauver quelque chose.",
    stats:    { hp: 22, attack: 4, defense: 0, speed: 1 },
  },
  {
    id:       ENEMY_TYPES.BOSS_MIRROR,
    name:     'La Mère-Écho',
    category: 'Boss · Acte I',
    color:    '#FF66AA',
    lore:     "Le Rift garde la mémoire des gestes. La Mère-Écho s'est formée là où trop de survivants ont hésité, ont reculé, ont répété les mêmes erreurs. Elle renvoie les trajectoires, les intentions, les rythmes. La combattre, c'est accepter que le Rift te renvoie toujours une part de toi.",
    stats:    { hp: 24, attack: 4, defense: 0, speed: 2 },
  },
  {
    id:       ENEMY_TYPES.BOSS_WEAVER,
    name:     'Le Tisseur de Ruines',
    category: 'Boss · Acte I',
    color:    '#C48AFF',
    lore:     "Ancien architecte ou simple survivant obsédé par l'ordre, personne n'est plus certain de ce qu'il fut. Le Rift a fait de lui un réparateur malade : il ne ferme pas les passages, il les ajuste, les contraint, les recompose. Sa violence est celle d'un plan de construction qui refuse de mourir.",
    stats:    { hp: 23, attack: 3, defense: 0, speed: 1 },
  },
  {
    id:       ENEMY_TYPES.BOSS_RUST,
    name:     "L'Ange Rouillé",
    category: 'Boss · Acte I',
    color:    '#B7A588',
    lore:     "Une sentinelle sacrée, forgée pour durer plus que les royaumes qu'elle protégeait. Le temps l'a mangée couche après couche jusqu'à n'en laisser qu'une ossature de foi, de métal et de rouille. Elle se couvre parce qu'elle sait que tout finit par s'effriter — sauf le devoir qu'elle s'impose encore.",
    stats:    { hp: 30, attack: 3, defense: 2, speed: 1 },
  },
  {
    id:       ENEMY_TYPES.BOSS_CUTTER,
    name:     "Le Fendeur d'Ombres",
    category: 'Boss · Acte I',
    color:    '#66D6FF',
    lore:     "Un éclaireur de guerre passé trop longtemps dans les couloirs du Rift. Il a appris à ne plus courir vers sa cible, mais à couper ce qui la relie au terrain : lignes, diagonales, habitudes. Il ne chasse pas la chair. Il chasse la certitude.",
    stats:    { hp: 26, attack: 5, defense: 0, speed: 2 },
  },
  {
    id:       ENEMY_TYPES.BOSS_PULSE,
    name:     "Tonnerre Incarné",
    category: 'Boss · Acte II',
    color:    '#FF6600',
    lore:     "Lors de la grande guerre, une arme fut forgée pour traverser les fortifications les plus épaisses. Appelée Tonnerre, elle fut utilisée une seule fois. Le choc atteignit la prison du Rift. L'arme fut aspirée à l'intérieur. Elle n'a pas disparu — elle s'est adaptée, a fusionné avec l'énergie du Rift, est devenue quelque chose de conscient. Il ne comprend pas pourquoi il existe. Il frappe parce que c'est tout ce qu'il sait faire.",
    stats:    { hp: 40, attack: 5, defense: 1, speed: 1 },
  },
  {
    id:       ENEMY_TYPES.BOSS_RIFT,
    name:     "Le Dévoreur",
    category: 'Boss Final · Acte III — A',
    color:    '#FF2266',
    lore:     "Le Dévoreur existait avant les brèches. Il vivait dans les profondeurs du Rift depuis toujours, se nourrissant des créatures qui ne parviennent pas à atteindre le monde extérieur. Ce n'est pas un gardien — c'est un prédateur opportuniste. Il te prévient parce qu'il ne veut pas être consumé lui aussi si tu dépasses ses limites.",
    stats:    { hp: 80, attack: 8, defense: 2, speed: 2 },
  },
  {
    id:       ENEMY_TYPES.BOSS_GUARDIAN,
    name:     "Le Gardien",
    category: 'Boss Final · Acte III — B',
    color:    '#44CCFF',
    lore:     "Les Bâtisseurs savaient que leur prison ne serait pas éternelle. Ils créèrent le Gardien avant de disparaître — une entité de pure volonté, sans mémoire ni désir propre. Sa seule mission : tenir la porte finale. Il ne combat pas par haine ni par peur. Il combat parce que c'est pour ça qu'il existe, et qu'il existera jusqu'à ce qu'on le brise.",
    stats:    { hp: 110, attack: 10, defense: 4, speed: 1 },
  },
  {
    id:       ENEMY_TYPES.BOSS_ENTITY,
    name:     "L'Entité",
    category: 'Boss Final · Acte III — C',
    color:    '#FF0044',
    lore:     "L'Entité est antérieure au monde. Elle ne cherche pas à détruire par malice — elle cherche à défaire, parce que c'est sa nature fondamentale. Elle n'a pas de forme stable : elle s'adapte, se reconfigure, se reconstruit. Chaque fois que tu la bats, elle se reconstitue. Plus lentement. Mais elle se reconstitue.",
    stats:    { hp: 140, attack: 12, defense: 3, speed: 2 },
  },

  // ── Personnages spéciaux ────────────────────────────────────────────────────
  {
    id:       'origine',
    name:     "L'Origine",
    category: 'Voix · Les Bâtisseurs',
    color:    '#FFCC44',
    lore:     "Une voix sans corps. La mémoire collective de la civilisation qui construisit la prison il y a des siècles. Les Bâtisseurs ont disparu du monde matériel, mais leur conscience subsiste dans les murs du Rift. L'Origine ne prend pas parti. Elle explique. Elle observe. Elle t'encourage à continuer — non par compassion, mais parce que tu es utile.",
    stats:    null, // Pas d'ennemi combattable
  },
];

export const PROLOGUE_PAGES = [
  {
    lines: [
      "Il y a très longtemps,",
      "une civilisation construisit une prison.",
      "",
      "Pas pour des criminels.",
      "Pour quelque chose d'antérieur au monde.",
      "Quelque chose qui rongeait ses bords depuis toujours.",
    ],
  },
  {
    lines: [
      "La prison tint des siècles.",
      "",
      "Puis une guerre utilisa une arme interdite.",
      "L'arme frappa la prison.",
      "Des brèches s'ouvrirent.",
      "Des créatures s'échappèrent.",
      "Des villages disparurent.",
    ],
  },
  {
    lines: [
      "Des héros entrent dans le Rift",
      "pour repousser les monstres.",
      "Ou fermer la source.",
      "",
      "Aucun n'a vraiment réussi.",
      "",
      "C'est ton tour.",
    ],
  },
];
