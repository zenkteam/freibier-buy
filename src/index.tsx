import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import Price from "./Price";

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
const priceNode = document.getElementById("price");
if (priceNode) {
  ReactDOM.render(
    <React.StrictMode>
      <Price />
    </React.StrictMode>,
    priceNode
  );
}