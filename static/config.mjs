const defaultConfig = {
  READONLY: false,
  SAVE_INTERVAL: 2000,
  DUPLICATE_CARDS: true,
  API_BASE: "../demo-data/",
  ETAGS: false,
};

const config = new Proxy(defaultConfig, {
  get(obj, prop) {
    const value = localStorage.getItem(prop);
    if(value !== null) return JSON.parse(value);
    return obj[prop];
  },

  set(obj, prop, newval) {
    if(!(prop in obj)) throw `Key ${prop} not a valid config option`;
    localStorage.setItem(prop, JSON.stringify(newval));
    return true;
  },

  deleteProperty(obj, prop) {
    localStorage.removeItem(prop);
  },
});

export default config;
