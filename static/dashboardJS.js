/* ==========================================================
   dashboard.js
   Interactivity for the dashboard page: theme toggle, the
   stock search filter, logout, and buy/sell button handlers.
   ========================================================== */

/* ---------------------------------------
   Theme toggle (persisted in localStorage)
--------------------------------------- */
// (function setupThemeToggle(){

//     const toggle = document.getElementById("themeToggle");

//     if(!toggle){
//         return;
//     }

//     const icon = toggle.querySelector(".theme-toggle__icon");

//     function applyTheme(theme){
//         if(theme === "light"){
//             document.documentElement.setAttribute("data-theme", "light");
//             icon.textContent = "☀️";
//         } else {
//             document.documentElement.removeAttribute("data-theme");
//             icon.textContent = "🌙";
//         }
//     }

//     // Reflect whatever the anti-flash inline script in <head> already applied
//     applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

//     toggle.addEventListener("click", function(){
//         const isLight = document.documentElement.getAttribute("data-theme") === "light";
//         const next = isLight ? "dark" : "light";
//         localStorage.setItem("theme", next);
//         applyTheme(next);
//     });

// })();

/* ---------------------------------------
   Stock search filter
--------------------------------------- */
// (function setupStockSearch(){

//     const input = document.getElementById("stockSearch");
//     const cards = document.querySelectorAll(".stock-card");
//     const emptyState = document.getElementById("stocksEmpty");

//     if(!input || !cards.length){
//         return;
//     }

//     input.addEventListener("input", function(){

//         const query = input.value.trim().toLowerCase();
//         let visibleCount = 0;

//         cards.forEach(function(card){
//             const symbol = card.dataset.symbol.toLowerCase();
//             const name = card.dataset.name.toLowerCase();
//             const matches = symbol.includes(query) || name.includes(query);

//             card.hidden = !matches;

//             if(matches){
//                 visibleCount++;
//             }
//         });

//         if(emptyState){
//             emptyState.hidden = visibleCount !== 0;
//         }

//     });

// })();

/* ==========================================================
   dashboardJS.js
   Interactivity for the dashboard page: theme toggle, live
   dashboard data (balance + popular stocks) from the Flask
   backend, stock search/navigation, and logout.
   ========================================================== */

/* ---------------------------------------
   Formatting helpers
--------------------------------------- */
function formatCurrency(value){
    const sign = value < 0 ? "-" : "";
    return sign + "$" + Math.abs(value).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Best-effort friendly names for known tickers. /dashboard-data only
// returns { ticker, price }, so anything not in this list just falls
// back to showing the raw ticker as its own name.
const TICKER_NAMES = {
    "AAPL":        "Apple Inc.",
    "TSLA":        "Tesla, Inc.",
    "GOOGL":       "Alphabet Inc.",
    "MSFT":        "Microsoft Corporation",
    "NVDA":        "NVIDIA Corporation",
    "AMZN":        "Amazon.com, Inc.",
    "RELIANCE.NS": "Reliance Industries Ltd.",
    "TCS.NS":      "Tata Consultancy Services",
    "INFY.NS":     "Infosys Limited"
};

/* ---------------------------------------
   Theme toggle (persisted in localStorage)
--------------------------------------- */
(function setupThemeToggle(){

    const toggle = document.getElementById("themeToggle");

    if(!toggle){
        return;
    }

    const icon = toggle.querySelector(".theme-toggle__icon");

    function applyTheme(theme){
        if(theme === "light"){
            document.documentElement.setAttribute("data-theme", "light");
            icon.textContent = "☀️";
        } else {
            document.documentElement.removeAttribute("data-theme");
            icon.textContent = "🌙";
        }
    }

    // Reflect whatever the anti-flash inline script in <head> already applied
    applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

    toggle.addEventListener("click", function(){
        const isLight = document.documentElement.getAttribute("data-theme") === "light";
        const next = isLight ? "dark" : "light";
        localStorage.setItem("theme", next);
        applyTheme(next);
    });

})();

/* ---------------------------------------
   Signed-in user's name
--------------------------------------- */
async function loadUser(){
    const usernameEl = document.getElementById("username");
    try {
        const response = await fetch("/me");
        const data = await response.json();
        if(data.logged_in && usernameEl){
            usernameEl.textContent = data.email.split("@")[0];
        }
    } catch (err) {
        console.error("Could not load user info:", err);
    }
}

/* ---------------------------------------
   Build one stock card's markup
--------------------------------------- */
function stockCardHTML(stock){

    const name = TICKER_NAMES[stock.ticker] || stock.ticker;

    return `
        <article class="stock-card" data-symbol="${stock.ticker}" data-name="${name}">
            <div class="stock-card__head">
                <span class="stock-card__symbol">${stock.ticker}</span>
            </div>
            <p class="stock-card__name">${name}</p>
            <p class="stock-card__price">${formatCurrency(stock.price)}</p>
            <div class="stock-card__actions">
                <button class="btn btn--solid btn--sm" data-action="buy">Buy</button>
                <button class="btn btn--ghost btn--sm" data-action="sell">Sell</button>
            </div>
        </article>
    `;

}

/* ---------------------------------------
   Load real-time dashboard data:
   balance stats + popular stock prices
--------------------------------------- */
async function loadDashboardData(){

    const loadingEl = document.getElementById("stocksLoading");
    const grid = document.getElementById("stockGrid");

    try {

        const response = await fetch("/dashboard-data");

        if(response.status === 401){
            window.location.href = "/login";
            return;
        }

        const data = await response.json();

        if(!data.success){
            throw new Error(data.message || "Could not load dashboard data");
        }

        document.getElementById("statBalance").textContent  = formatCurrency(data.cash);
        document.getElementById("statHoldings").textContent = formatCurrency(data.holdings_value);
        document.getElementById("statTotal").textContent    = formatCurrency(data.total_value);

        if(data.popular_stocks && data.popular_stocks.length){
            grid.innerHTML = data.popular_stocks.map(stockCardHTML).join("");
        } else {
            grid.innerHTML = "";
        }

        loadingEl.hidden = true;

    } catch (err) {
        console.error("Dashboard data error:", err);
        loadingEl.textContent = "Couldn't load live market data. Please refresh.";
    }

}

/* ---------------------------------------
   Stock search — filter the grid as you type,
   jump to the chart page for that ticker on Enter
--------------------------------------- */
(function setupStockSearch(){

    const input = document.getElementById("stockSearch");
    const emptyState = document.getElementById("stocksEmpty");

    if(!input){
        return;
    }

    input.addEventListener("input", function(){

        // Cards are injected asynchronously, so query fresh each time
        // rather than caching a NodeList at setup.
        const cards = document.querySelectorAll(".stock-card");
        const query = input.value.trim().toLowerCase();
        let visibleCount = 0;

        cards.forEach(function(card){
            const symbol = card.dataset.symbol.toLowerCase();
            const name = card.dataset.name.toLowerCase();
            const matches = symbol.includes(query) || name.includes(query);

            card.hidden = !matches;

            if(matches){
                visibleCount++;
            }
        });

        if(emptyState){
            emptyState.hidden = visibleCount !== 0 || cards.length === 0;
        }

    });

    input.addEventListener("keydown", function(event){

        if(event.key !== "Enter" || !input.value.trim()){
            return;
        }

        const query = input.value.trim().toLowerCase();
        const cards = Array.from(document.querySelectorAll(".stock-card"));
        const matchingCard = cards.find(function(card){
            return card.dataset.symbol.toLowerCase() === query
                || card.dataset.name.toLowerCase().includes(query);
        });

        const ticker = matchingCard ? matchingCard.dataset.symbol : input.value.trim().toUpperCase();

        window.location.href = `/stock-page/${encodeURIComponent(ticker)}`

    });

})();

/* ---------------------------------------
   Stock cards — clicking Buy/Sell (or the card itself)
   goes to the chart + trade page for that ticker
--------------------------------------- */
(function setupStockCards(){

    const grid = document.getElementById("stockGrid");

    if(!grid){
        return;
    }

    grid.addEventListener("click", function(event){

        const card = event.target.closest(".stock-card");

        if(!card){
            return;
        }

        const symbol = card.dataset.symbol;
        
        window.location.href = `/stock-page/${symbol}`;

    });

})();

/* ---------------------------------------
   Logout
--------------------------------------- */
(function setupLogout(){

    const logoutBtn = document.getElementById("logoutBtn");

    if(!logoutBtn){
        return;
    }

    logoutBtn.addEventListener("click", function(){

        const confirmed = confirm("Log out of your account?");

        if(!confirmed){
            return;
        }

        // The backend's /logout route is a plain GET that clears the
        // session and redirects server-side — no fetch/JSON involved.
        window.location.href = "/logout";

    });

})();

loadUser();
loadDashboardData();