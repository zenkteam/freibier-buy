import React, { useEffect, useState } from "react";
import LineChart from "./components/LineChart";
import config from './config';

function process_pool_data(data: Array<any>, tokenDecimals: number) {
  return data.map(item => {
    const tez_pool = parseFloat(item.value.storage.tez_pool) / 10 ** 6;
    const token_pool = parseFloat(item.value.storage.token_pool) / 10 ** tokenDecimals;
    const rate = tez_pool / token_pool;
    return {
      tez_pool,
      token_pool,
      rate,
      timestamp: item.timestamp
    }
  })
}
const PriceChart = () => {
  const [data, setData] = useState<Array<any>>([]);

  useEffect(() => {
    // load history
    const smart_contract = config.swapContractAddress;
    const limit = 700; // max: 1000
    fetch(`https://api.tzkt.io/v1/contracts/${smart_contract}/storage/history?limit=${limit}`)
      .then(res => res.json())
      .then(data => process_pool_data(data, 8))
      .then(data => data.reverse())
      .then(data => data.map((item, index) => {
        return {
          label: index % 124 === 0 ? item.timestamp.substr(5, 5) : '', // only show a few labels
          x: index,
          y: item.rate,
        }
      }))
      .then(data => setData(data))
  }, [])

  return (
    <>
      {data.length &&
        <LineChart
          width={600}
          height={300}
          data={data}
          horizontalGuides={5}
          precision={5}
          verticalGuides={1}
        />
      }
    </>
  )
}

export default PriceChart;