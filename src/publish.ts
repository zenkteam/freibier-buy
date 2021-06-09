
const attachToElements = (className: string, content: string) => {
  const priceChangeNode = document.getElementsByClassName(className);
  if (priceChangeNode.length) {
    for (const tag of priceChangeNode) {
      tag.innerHTML = content;
    }
  }
}

const publishEvent = (eventName: string, content: any) => {
  const event = new CustomEvent(eventName,
    {
      bubbles: true,
      detail: content
    }
  )
  document.dispatchEvent(event);
}

const Publish = {
  userTokenBalance: function (tokenBalance: number, tokenSymbol: string) {
    const content = (tokenBalance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ' + tokenSymbol;
    attachToElements('user-token-balance', content);
    publishEvent('user-token-balance', tokenBalance);
  },
  userBalance: function (balance: number) {
    const content = (balance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ꜩ';
    attachToElements('user-balance', content);
    publishEvent('user-balance', balance);
  },
  tokenPriceChange: function (change: number) {
    const content = (change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    attachToElements('price-change-24h', content);
    publishEvent('price-change-24h', change);
  },
  pricePerTez: function (price: number) {
    const content = (price).toLocaleString(undefined, { minimumFractionDigits: 2, minimumSignificantDigits: 1, maximumSignificantDigits: 2 }) + ' ꜩ';
    attachToElements('price-per-tez', content);
    publishEvent('price-per-tez', price);
  },
  pricePerUsd: function (price: number) {
    const content = '$' + (price).toLocaleString(undefined, { minimumFractionDigits: 2, minimumSignificantDigits: 1, maximumSignificantDigits: 3 });
    attachToElements('price-per-usd', content);
    publishEvent('price-per-usd', price);
  },
}

export default Publish;