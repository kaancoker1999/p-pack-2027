/**
 * Parti listesinde renklendirme için isimden cinsiyet TAHMİNİ.
 * Yalnızca ilk isme bakar ("Mehmet Ali" → Mehmet). Listede olmayan ya da hem kadın hem erkek
 * için kullanılan isimlerde 'u' (belirsiz) döner; admin panelden elle düzeltilebilir.
 */
export type Gender = 'm' | 'f' | 'u';

const MALE = `ahmet mehmet mustafa ali hüseyin hasan ibrahim ismail osman yusuf murat ömer ramazan halil süleyman abdullah
mahmut recep salih fatih kadir emre hakan adem kemal yaşar bekir musa metin serkan orhan burak gökhan uğur mert onur
furkan kaan emir can cem cenk efe berk berkay berke arda alp alper alperen batuhan baran barış bora buğra bülent
cihan çağan çağatay çınar doruk doğan doğukan egemen ege ekrem emin emirhan enes engin ercan erdem eren erhan erkan
erol ersin ertuğrul eymen fırat ferhat fuat gürkan görkem güven harun haluk ilker ilhan ilyas kağan kerem kerim
koray kutay levent mahir mete metehan mirac miraç melih mesut muhammed muhammet necati nihat oğuz oğuzhan okan oktay
olcay onat orkun ozan polat rıza rüzgar sarp selim semih sercan serdar serhat sinan soner taha tarık taylan tayfun
tolga tuna tunç turgut tuğrul türker ufuk utku volkan yağız yalçın yavuz yiğit yunus zafer ata atakan aras ayaz
bartu batu berat tuğra kuzey poyraz demir çetin sefa selçuk şahin şükrü tamer timur tufan ümit yasin yılmaz
anıl atilla aykut aziz bahadır cengiz coşkun erdinç gökay hamza kıvanç mirza nazım necip rasim sadık vedat zeki
john james michael david daniel thomas robert william richard joseph charles christopher matthew andrew joshua
mark paul steven kevin brian george edward peter alex alexander max leo lucas oliver noah liam ethan jack henry
luca marco andrea giovanni antonio carlos juan jose luis miguel pedro pablo diego hans lukas felix jonas ben tim
tom nick sam adam omar ahmed mohamed mohammed hamza karim amir arman ivan dmitri sergey nikolai`;

const FEMALE = `fatma ayşe emine hatice zeynep elif meryem şerife zehra sultan hanife merve havva zeliha esra fadime özlem
yasemin hülya cemile sevim gülsüm leyla dilek büşra aysel songül kübra halime esma aynur hacer tuğba rabia seda
sibel elife gamze derya filiz kadriye gül nurcan hilal ebru pınar selin ceren cansu irem buse beyza ecrin defne
nehir azra asel ada ela eylül melis melisa melike melek mina mira nil nisa naz nazlı nazan nur nuray nurgül öykü
özge pelin rana rüya sena selen sevgi sevda sıla simge su sude şevval şeyma şule tuba tülay tülin yağmur yaren
yelda yeşim zerrin zümra aleyna alara aslı asya ayça aylin aysu ayşegül ayşenur bade bahar banu başak begüm belgin
bengü berfin berna berrak betül bilge burcu cemre çağla çiğdem damla dila dilara didem duru duygu ece eda ekin
elçin elvan emel esin eslem ezgi feride ferda feyza funda gizem gökçe gonca gülay gülşen güliz gülçin hande
hazal hümeyra ilayda ilkim ipek irmak işıl jale kader lale lara mehtap meltem mine müge nagihan neslihan nesrin
nihan nilay nilüfer oya petek reyhan sanem seçil selma serap sevil sevinç sezen şebnem tuana tuğçe ümran yıldız
zeynepnur zuhal açelya ahu alev aybüke azize birsen canan cansel çisem dicle gözde hayal lamia masal mislina
mary jennifer linda elizabeth barbara susan jessica sarah karen lisa nancy emma olivia ava isabella sophia sofia
mia charlotte amelia emily anna maria laura julia lena lea hannah lina clara chloe zoe nina eva sara alice
giulia francesca chiara elena carmen lucia ana natalia olga tatiana irina svetlana yulia leila amira fatima aisha
mariam layla noor yasmin nadia`;

/** Hem kadın hem erkek için yaygın isimler: tahmin yapılmaz. */
const UNISEX = `deniz derin doğa ekin evren özgür umut güneş ilkay toprak kayra çağrı deren devrim ferah yüksel
bilge olcay su ayhan aytaç güngör ışık kamuran muzaffer nur sezer şafak tan ülkü yücel alex sam taylor jordan`;

const toSet = (s: string) => new Set(s.split(/\s+/).filter(Boolean));
const unisex = toSet(UNISEX);
const male = toSet(MALE);
const female = toSet(FEMALE);

export function guessGender(firstName: string): Gender {
  const first = firstName.trim().toLocaleLowerCase('tr-TR').split(/[\s-]+/)[0] ?? '';
  if (!first || unisex.has(first)) return 'u';
  if (male.has(first)) return 'm';
  if (female.has(first)) return 'f';
  return 'u';
}
