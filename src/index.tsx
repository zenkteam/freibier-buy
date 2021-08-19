import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import PriceChart from "./PriceChart";
import Farm from "./Farm";

// init exchange
const appNode = document.getElementById("root");
if (appNode) {
  if (!appNode.dataset.swapContract) {
    console.error('Please specify data-swap-contract for your buy form.')
  } else {
    ReactDOM.render(
      <React.StrictMode>
        <App 
          swapContract={appNode.dataset.swapContract}
        />
      </React.StrictMode>,
      appNode
    );
  }
}


// init Price display
const priceChartNode = document.getElementById("price-chart");
if (priceChartNode) {
  if (!priceChartNode.dataset.swapContract) {
    console.error('Please specify data-swap-contract for your price chart.')
  } else {
    const decimals = parseInt(priceChartNode.dataset.tokenDecimals || '')
    ReactDOM.render(
      <React.StrictMode>
        <PriceChart 
          swapContract={priceChartNode.dataset.swapContract}
          tokenDecimals={decimals || undefined}
        />
      </React.StrictMode>,
      priceChartNode
    );
  }
}

// init farm display
const farmNode = document.getElementById("farm");
if (farmNode) {
  if (!farmNode.dataset.swapContract) {
    console.error('Please specify data-swap-contract for your farm.')
  }else if(!farmNode.dataset.farmContract) {
    console.error('Please specify data-farm-contract for your farm.')
  } else {
    ReactDOM.render(
      <React.StrictMode>
        <Farm 
          farmContractAddress={farmNode.dataset.farmContract}
          swapContractAddress={farmNode.dataset.swapContract}
        />
      </React.StrictMode>,
      farmNode
    );
  }
}