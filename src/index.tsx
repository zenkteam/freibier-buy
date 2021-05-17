import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import PriceChart from "./PriceChart";

// init exchange
const appNode = document.getElementById("root");
if (appNode) {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    appNode
  );
}


// init Price display
const priceChartNode = document.getElementById("price-chart");
if (priceChartNode) {
  ReactDOM.render(
    <React.StrictMode>
      <PriceChart />
    </React.StrictMode>,
    priceChartNode
  );
}