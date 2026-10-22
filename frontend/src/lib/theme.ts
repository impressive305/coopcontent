export const THEME_KEY = "theme";

// Runs in <head> before first paint so a saved dark preference doesn't flash light.
export const themeScript = `(function(){try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;
