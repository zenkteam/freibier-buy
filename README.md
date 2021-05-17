# Freibier.io Buy Integration

![Screenshot](https://raw.githubusercontent.com/zenkteam/freibier-buy/master/docu/screenshot.png)

Quipuswap integration to buy CVZA tokens from any website.

## Usage

Try it on https://zenkteam.github.io/freibier-buy/

To embed it in your site copy the style and script tags from https://zenkteam.github.io/freibier-buy/

There are differente elements you can display on your site:

```html
<!-- embed the exchage form -->
<div id="root"></div>

<!-- embed a price chart -->
<div id="price-chart"></div>

<!-- embed the current price in USD (can be used in multiple locations) -->
<div class="price-per-usd"></div>

<!-- embed the current price in XTZ (can be used in multiple locations) -->
<div class="price-per-tez"></div>

<!-- embed the token price change in the last 24 hours (can be used in multiple locations) -->
<div class="price-change-24h"></div>
```


## Development

1. Clone your new repository:

   `git clone git@github.com:zenkteam/freibier-buy.git`

2. Change your current working directory to the newly cloned repository directory.
3. Install dependencies:

   `npm install`

4. Start development server:

   `npm run start`

5. Open https://localhost:3000 in your browser to see a sample application.

