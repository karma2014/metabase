/* @flow weak */

import "babel-polyfill";
import "number-to-locale-string";

// If enabled this monkeypatches `t` and `jt` to return blacked out
// strings/elements to assist in finding untranslated strings.
import "metabase/lib/i18n-debug";

// make the i18n function "t" global so we don't have to import it in basically every file
import { t, jt } from "c-3po";
global.t = t;
global.jt = jt;

// set the locale before loading anything else
import { setLocalization } from "metabase/lib/i18n";
if (window.MetabaseLocalization) {
  setLocalization(window.MetabaseLocalization);
}

import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { Provider as ThemeProvider } from "rebass";

import MetabaseAnalytics, {
  registerAnalyticsClickListener,
} from "metabase/lib/analytics";
import MetabaseSettings from "metabase/lib/settings";

import api from "metabase/lib/api";

import { getStore } from "./store";

import { refreshSiteSettings } from "metabase/redux/settings";

import { Router, useRouterHistory } from "react-router";
import { createHistory } from "history";
import { syncHistoryWithStore } from "react-router-redux";

// remove trailing slash
const BASENAME = window.MetabaseRoot.replace(/\/+$/, "");

api.basename = BASENAME;

const browserHistory = useRouterHistory(createHistory)({
  basename: BASENAME,
});

const baseTheme = {
  font: "Lato",
  colors: {
    //primary: "#509ee3",
    primary: "red",
    metric: "#9CC177",
    indigo: "#7172AD",
    question: '#93B3C9',
    grey1: "#DCE1E4",
    grey2: "#93A1AB",
    grey3: "#2E353B",
    text: "#2E353B",
  },
  spacing: [
    4, 6, 8, 10, 12
  ]
};

function _init(reducers, getRoutes, callback) {
  const store = getStore(reducers, browserHistory, { theme: baseTheme });
  const routes = getRoutes(store);
  const history = syncHistoryWithStore(browserHistory, store);

  ReactDOM.render(
    <Provider store={store}>
      <ThemeProvider theme={store.getState().theme}>
        <Router history={history}>{routes}</Router>
      </ThemeProvider>
    </Provider>,
    document.getElementById("root"),
  );

  // listen for location changes and use that as a trigger for page view tracking
  history.listen(location => {
    MetabaseAnalytics.trackPageView(location.pathname);
  });

  registerAnalyticsClickListener();

  store.dispatch(refreshSiteSettings());

  // enable / disable GA based on opt-out of anonymous tracking
  MetabaseSettings.on("anon_tracking_enabled", () => {
    window[
      "ga-disable-" + MetabaseSettings.get("ga_code")
    ] = MetabaseSettings.isTrackingEnabled() ? null : true;
  });

  window.Metabase = window.Metabase || {};
  window.Metabase.store = store;

  if (callback) {
    callback(store);
  }
}

export function init(...args) {
  if (document.readyState != "loading") {
    _init(...args);
  } else {
    document.addEventListener("DOMContentLoaded", () => _init(...args));
  }
}
