const defaultConfig = {
  READONLY: false,
  SAVE_INTERVAL: 2000,
  DUPLICATE_CARDS: true,
  API_BASE: "/api/",
};

const config = new Proxy({}, {
  get(obj, prop) {
    const value = localStorage.getItem(prop);
    if(value !== null) return JSON.parse(value);
    return defaultConfig[prop];
  },

  set(obj, prop, newval) {
    localStorage.setItem(prop, JSON.stringify(newval));
  },
});

export default config;
