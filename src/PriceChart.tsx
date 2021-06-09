import React, { useEffect, useState } from "react";
import LineChart from "./components/LineChart";

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

interface PriceChartProps {
  swapContractAddress: string;
  tokenDecimals?: number;
}

const PriceChart = ({ swapContractAddress, tokenDecimals = 8 }: PriceChartProps) => {
  const [data, setData] = useState<Array<any>>([]);

  useEffect(() => {
    // load history
    const limit = 700; // max: 1000
    fetch(`https://api.tzkt.io/v1/contracts/${swapContractAddress}/storage/history?limit=${limit}`)
      .then(res => res.json())
      .then(data => process_pool_data(data, tokenDecimals))
      .then(data => data.reverse())
      .then(data => data.map((item, index) => {
        return {
          label: index % 124 === 0 ? item.timestamp.substr(5, 5) : '', // only show a few labels
          x: index,
          y: item.rate,
        }
      }))
      .then(data => setData(data))
  }, [swapContractAddress, tokenDecimals])

  const precision = data.length ? (data[data.length-1].y).toLocaleString(undefined, { minimumFractionDigits: 2, minimumSignificantDigits: 1, maximumSignificantDigits: 2 }).length - 2 : 5

  return (
    <>
      {data.length &&
        <LineChart
          width={600}
          height={300}
          data={data}
          horizontalGuides={5}
          precision={precision}
          verticalGuides={1}
        />
      }
    </>
  )
}

export default PriceChart;