// The one place a fuel type's display name is defined — every layer
// (admin web/Flutter, customer web/Flutter) asks the backend for this
// rather than hardcoding "Gasoline 95" a second time somewhere else.
//
// Deliberately a short, justified list rather than every fuel grade that
// exists in the world — see the Phase B report's "Fuel types" section for
// why only these three were added.
const FUEL_TYPES = ['GASOLINE_95', 'GASOLINE_98', 'DIESEL'];

const FUEL_TYPE_LABELS = {
  GASOLINE_95: 'Gasoline 95',
  GASOLINE_98: 'Gasoline 98',
  DIESEL: 'Diesel / Solar',
};

module.exports = { FUEL_TYPES, FUEL_TYPE_LABELS };
