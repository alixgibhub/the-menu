// Countries The Menu covers: their supermarkets, the loyalty card each one uses
// (null = no card), currency and a sensible starting weekly budget for one person.
// Shared by the app (browser) and the server (Worker), so edit it in one place.

export const COUNTRIES = {
  BE: {
    name: "Belgium", currency: "EUR", budget: 50, timezones: ["Europe/Brussels"],
    stores: {
      "Delhaize": "Delhaize SuperPlus", "Lidl": "Lidl Plus", "Colruyt": "Colruyt Xtra", "Aldi": null,
      "Carrefour": "Carrefour Bonus Card", "Albert Heijn": "AH Bonuskaart", "Jumbo": "Jumbo Extra's",
      "Intermarché": null, "Okay": "Xtra (Okay)", "Spar": "Xtra (Spar)", "Bio-Planet": "Xtra (Bio-Planet)",
    },
  },
  FR: {
    name: "France", currency: "EUR", budget: 55, timezones: ["Europe/Paris"],
    stores: {
      "E.Leclerc": "Carte E.Leclerc", "Carrefour": "Le Club Carrefour", "Intermarché": "Carte Intermarché",
      "Super U": "Carte U", "Auchan": "Waaoh (Auchan)", "Lidl": "Lidl Plus", "Aldi": null,
      "Monoprix": "Compte M (Monoprix)", "Franprix": null, "Picard": null, "Grand Frais": null, "Biocoop": null,
    },
  },
  CH: {
    name: "Switzerland", currency: "CHF", budget: 110, timezones: ["Europe/Zurich"],
    stores: {
      "Migros": "Migros Cumulus", "Coop": "Coop Supercard", "Denner": null, "Aldi Suisse": null,
      "Lidl": "Lidl Plus", "Manor Food": "Manor card", "Volg": null, "Spar": "Spar Friends",
    },
  },
  MX: {
    name: "Mexico", currency: "MXN", budget: 1200,
    timezones: ["America/Mexico_City", "America/Monterrey", "America/Merida", "America/Cancun", "America/Chihuahua", "America/Mazatlan", "America/Tijuana", "America/Hermosillo", "America/Matamoros", "America/Bahia_Banderas"],
    stores: {
      "Walmart": "Walmart Beneficios", "Bodega Aurrera": "Walmart Beneficios", "Soriana": "Soriana Ya",
      "Chedraui": "Mi Chedraui", "La Comer": "Monedero Naranja", "HEB": null,
      "Costco": "Costco membership", "Sam's Club": "Sam's Club membership",
    },
  },
  DE: {
    name: "Germany", currency: "EUR", budget: 55, timezones: ["Europe/Berlin", "Europe/Busingen"],
    stores: {
      "Edeka": "Payback", "Rewe": "REWE Bonus", "Penny": "PENNY App", "Lidl": "Lidl Plus",
      "Aldi Süd": null, "Aldi Nord": null, "Kaufland": "Kaufland Card XTRA", "Netto": "Payback",
      "Norma": null, "Denns BioMarkt": null,
    },
  },
  ES: {
    name: "Spain", currency: "EUR", budget: 45, timezones: ["Europe/Madrid", "Atlantic/Canary", "Africa/Ceuta"],
    stores: {
      "Mercadona": null, "Carrefour": "Club Carrefour", "Lidl": "Lidl Plus", "Dia": "Club Dia",
      "Alcampo": "Club Alcampo", "Eroski": "Eroski Club", "Consum": "Mundo Consum", "Aldi": null,
    },
  },
  PT: {
    name: "Portugal", currency: "EUR", budget: 40, timezones: ["Europe/Lisbon", "Atlantic/Madeira", "Atlantic/Azores"],
    stores: {
      "Continente": "Cartão Continente", "Pingo Doce": "Poupa Mais", "Lidl": "Lidl Plus", "Mercadona": null,
      "Auchan": "Clube Auchan", "Intermarché": "Cartão Poupança", "Aldi": null,
    },
  },
  NL: {
    name: "Netherlands", currency: "EUR", budget: 50, timezones: ["Europe/Amsterdam"],
    stores: {
      "Albert Heijn": "AH Bonuskaart", "Jumbo": "Jumbo Extra's", "Lidl": "Lidl Plus", "Aldi": null,
      "Plus": null, "Dirk": null, "Vomar": null, "Hoogvliet": null, "DekaMarkt": null, "Ekoplaza": null,
    },
  },
  UK: {
    name: "United Kingdom", currency: "GBP", budget: 50, timezones: ["Europe/London"],
    stores: {
      "Tesco": "Tesco Clubcard", "Sainsbury's": "Nectar", "Asda": "Asda Rewards", "Morrisons": "Morrisons More",
      "Aldi": null, "Lidl": "Lidl Plus", "Waitrose": "myWaitrose", "M&S Food": "M&S Sparks",
      "Co-op": "Co-op Membership", "Iceland": "Iceland Bonus Card",
    },
  },
};

export const DEFAULT_COUNTRY = "BE";

// Deals are stored per country and store, e.g. "FR/Carrefour".
export const dealKey = (country, store) => `${country}/${store}`;
