// Every country an admin can pick as a destination: ISO 3166-1 alpha-2 codes, named with the browser's
// built-in region names (no network call). The ISO code is the stable identity of a country in the app.

const ISO_CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO ' +
  'FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE ' +
  'JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO ' +
  'MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW ' +
  'PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM ' +
  'TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW';

export interface WorldCountry {
  code: string;
  name: string;
  flag: string;
}

export const flagEmoji = (code: string) =>
  [...code.toUpperCase()].map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join('');

const buildCountries = (): WorldCountry[] => {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    names = null;
  }

  return ISO_CODES.split(' ')
    .map((code) => ({ code, name: names?.of(code) || code, flag: flagEmoji(code) }))
    .filter((country) => country.name !== country.code || !names)
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const WORLD_COUNTRIES: WorldCountry[] = buildCountries();

/** Case- and accent-insensitive search by country name or ISO code. */
export const searchWorldCountries = (query: string, limit = 12): WorldCountry[] => {
  const normalize = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const needle = normalize(query.trim());
  if (!needle) {
    return WORLD_COUNTRIES.slice(0, limit);
  }

  const exactCode: WorldCountry[] = [];
  const starts: WorldCountry[] = [];
  const contains: WorldCountry[] = [];
  for (const country of WORLD_COUNTRIES) {
    const name = normalize(country.name);
    if (country.code.toLowerCase() === needle) {
      exactCode.push(country);
    } else if (name.startsWith(needle)) {
      starts.push(country);
    } else if (name.includes(needle)) {
      contains.push(country);
    }
  }
  // An exact ISO code ("tr") outranks names that merely start with the same letters ("Trinidad...").
  return [...exactCode, ...starts, ...contains].slice(0, limit);
};
