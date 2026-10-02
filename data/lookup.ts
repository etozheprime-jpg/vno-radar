import type { Place } from '../../shared/types.js';

// IATA|city|lat|lon — static dictionary so we never need extra API calls for names.
const RAW = `VNO|Vilnius|54.6341|25.2858
KUN|Kaunas|54.9639|24.0848
PLQ|Palanga|55.9732|21.0939
RIX|Riga|56.9236|23.9711
TLL|Tallinn|59.4133|24.8328
WAW|Warsaw|52.1657|20.9671
WMI|Warsaw Modlin|52.4511|20.6518
KRK|Krakow|50.0777|19.7848
GDN|Gdansk|54.3776|18.4662
KTW|Katowice|50.4743|19.08
WRO|Wroclaw|51.1027|16.8858
POZ|Poznan|52.4210|16.8263
LHR|London|51.47|-0.4543
LGW|London|51.1537|-0.1821
STN|London|51.885|0.235
LTN|London|51.8747|-0.3683
MAN|Manchester|53.3537|-2.2750
EDI|Edinburgh|55.95|-3.3725
BHX|Birmingham|52.4539|-1.7480
BRS|Bristol|51.3827|-2.7191
LPL|Liverpool|53.3336|-2.8497
DUB|Dublin|53.4213|-6.2701
SNN|Shannon|52.702|-8.9248
FRA|Frankfurt|50.0379|8.5622
MUC|Munich|48.3538|11.7861
BER|Berlin|52.3667|13.5033
HAM|Hamburg|53.6304|9.9882
DUS|Dusseldorf|51.2895|6.7668
CGN|Cologne|50.8659|7.1427
NUE|Nuremberg|49.4987|11.0669
FMM|Memmingen|47.9888|10.2395
HHN|Frankfurt-Hahn|49.9487|7.2639
AMS|Amsterdam|52.3105|4.7683
EIN|Eindhoven|51.4501|5.3747
BRU|Brussels|50.9014|4.4844
CRL|Brussels Charleroi|50.4592|4.4538
CDG|Paris|49.0097|2.5479
ORY|Paris|48.7233|2.3794
BVA|Paris Beauvais|49.4544|2.1128
FCO|Rome|41.8003|12.2389
CIA|Rome|41.7994|12.5949
MXP|Milan|45.63|8.7231
BGY|Milan Bergamo|45.6739|9.7042
BLQ|Bologna|44.5354|11.2887
VCE|Venice|45.5053|12.3519
TSF|Venice Treviso|45.6484|12.1944
NAP|Naples|40.886|14.2908
PSA|Pisa|43.6839|10.3927
BCN|Barcelona|41.2971|2.0785
MAD|Madrid|40.4936|-3.5668
VLC|Valencia|39.4893|-0.4816
AGP|Malaga|36.6749|-4.4991
ALC|Alicante|38.2822|-0.5582
PMI|Palma de Mallorca|39.5517|2.7388
LIS|Lisbon|38.7742|-9.1342
OPO|Porto|41.2481|-8.6814
ATH|Athens|37.9364|23.9445
SKG|Thessaloniki|40.5197|22.9709
HER|Heraklion|35.3397|25.1803
CHQ|Chania|35.5317|24.1497
LCA|Larnaca|34.8751|33.6249
PFO|Paphos|34.718|32.4857
TLV|Tel Aviv|32.0114|34.8867
IST|Istanbul|41.2753|28.7519
SAW|Istanbul Sabiha Gokcen|40.8986|29.3092
AYT|Antalya|36.8987|30.8005
HEL|Helsinki|60.3172|24.9633
ARN|Stockholm|59.6498|17.9238
NYO|Stockholm Skavsta|58.7886|16.9122
CPH|Copenhagen|55.6181|12.6561
BLL|Billund|55.7403|9.1518
OSL|Oslo|60.1976|11.1004
TRF|Oslo Torp|59.1867|10.2587
GOT|Gothenburg|57.6628|12.2798
VIE|Vienna|48.1103|16.5697
PRG|Prague|50.1008|14.26
BUD|Budapest|47.4369|19.2556
SOF|Sofia|42.6967|23.4114
OTP|Bucharest|44.5711|26.085
ZRH|Zurich|47.4647|8.5492
GVA|Geneva|46.2381|6.1089
BSL|Basel|47.59|7.5291
DXB|Dubai|25.2532|55.3657
AUH|Abu Dhabi|24.433|54.6511
NCE|Nice|43.6584|7.2159
MRS|Marseille|43.4393|5.2214
SPU|Split|43.5389|16.298
ZAG|Zagreb|45.7429|16.0688
DBV|Dubrovnik|42.5614|18.2682
TIA|Tirana|41.4147|19.7206
BEG|Belgrade|44.8184|20.3091
LJU|Ljubljana|46.2237|14.4576
TFS|Tenerife|28.0445|-16.5725
LPA|Gran Canaria|27.9319|-15.3866
KEF|Reykjavik|63.985|-22.6056
TBS|Tbilisi|41.6692|44.9547
EVN|Yerevan|40.1473|44.3959
KBP|Kyiv|50.345|30.8947
MLA|Malta|35.8575|14.4775
HRG|Hurghada|27.1783|33.7994
SSH|Sharm el-Sheikh|27.9773|34.395
AMM|Amman|31.7226|35.9932
JFK|New York|40.6413|-73.7781
EWR|Newark|40.6895|-74.1745`;

const AIRPORTS = new Map<string, Place>();
for (const line of RAW.split('\n')) {
  const [iata, city, lat, lon] = line.split('|');
  AIRPORTS.set(iata, { iata, city, lat: Number(lat), lon: Number(lon) });
}

export function place(iata: string | null | undefined): Place {
  const code = (iata ?? '').toUpperCase();
  return AIRPORTS.get(code) ?? { iata: code, city: null, lat: null, lon: null };
}

export const AIRLINES: Record<string, string> = {
  FR: 'Ryanair', RK: 'Ryanair UK', W6: 'Wizz Air', W4: 'Wizz Air Malta', W9: 'Wizz Air UK', BT: 'airBaltic',
  LO: 'LOT Polish Airlines', LH: 'Lufthansa', SK: 'SAS', AY: 'Finnair', KL: 'KLM', AF: 'Air France',
  TK: 'Turkish Airlines', OS: 'Austrian', LX: 'SWISS', SN: 'Brussels Airlines', U2: 'easyJet', DY: 'Norwegian',
  EI: 'Aer Lingus', BA: 'British Airways', A3: 'Aegean', PC: 'Pegasus', AZ: 'ITA Airways', IB: 'Iberia',
  TP: 'TAP Air Portugal', LS: 'Jet2', FZ: 'flydubai', EK: 'Emirates', QS: 'Smartwings', JU: 'Air Serbia',
  OU: 'Croatia Airlines', TO: 'Transavia', HV: 'Transavia', VY: 'Vueling', EW: 'Eurowings', DE: 'Condor',
  UA: 'United', DL: 'Delta', AA: 'American', PS: 'Ukraine International', JP: 'Adria', GQ: 'Sky Express',
};

export const AIRCRAFT: Record<string, string> = {
  B737: 'Boeing 737-700', B738: 'Boeing 737-800', B739: 'Boeing 737-900', B37M: 'Boeing 737 MAX 7',
  B38M: 'Boeing 737 MAX 8', B39M: 'Boeing 737 MAX 9', B752: 'Boeing 757-200', B763: 'Boeing 767-300',
  B772: 'Boeing 777-200', B77W: 'Boeing 777-300ER', B788: 'Boeing 787-8', B789: 'Boeing 787-9',
  A319: 'Airbus A319', A320: 'Airbus A320', A321: 'Airbus A321', A20N: 'Airbus A320neo', A21N: 'Airbus A321neo',
  A19N: 'Airbus A319neo', A332: 'Airbus A330-200', A333: 'Airbus A330-300', A359: 'Airbus A350-900',
  BCS1: 'Airbus A220-100', BCS3: 'Airbus A220-300', E170: 'Embraer 170', E175: 'Embraer 175',
  E190: 'Embraer 190', E195: 'Embraer 195', E75L: 'Embraer 175', DH8D: 'De Havilland Dash 8 Q400',
  AT72: 'ATR 72', AT76: 'ATR 72-600', AT75: 'ATR 72-500', CRJ9: 'CRJ-900', CRJ7: 'CRJ-700', SF34: 'Saab 340',
};
