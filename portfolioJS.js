/* ==========================================================
   portfolio.js
   Fetches the logged-in user's portfolio from the Flask
   backend and renders the summary stats + holdings table.
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

function formatPercent(value){
    const sign = value > 0 ? "+" : "";
    return sign + value.toFixed(2) + "%";
}

/* ---------------------------------------
   Theme toggle (shared behavior with dashboard.js)
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

    applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

    toggle.addEventListener("click", function(){
        const isLight = document.documentElement.getAttribute("data-theme") === "light";
        const next = isLight ? "dark" : "light";
        localStorage.setItem("theme", next);
        applyTheme(next);
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
        if(confirmed){
            window.location.href = "/logout";
        }
    });

})();

/* ---------------------------------------
   Load the signed-in user's name
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
   Load and render the portfolio
--------------------------------------- */
async function loadPortfolio(){

    const loadingEl = document.getElementById("holdingsLoading");
    const emptyEl   = document.getElementById("holdingsEmpty");
    const bodyEl    = document.getElementById("holdingsBody");

    try {

        const response = await fetch("/portfolio");

        if(response.status === 401){
            window.location.href = "/login";
            return;
        }

        const data = await response.json();

        if(!data.success){
            throw new Error(data.message || "Could not load portfolio");
        }

        document.getElementById("statCash").textContent     = formatCurrency(data.cash);
        document.getElementById("statInvested").textContent = formatCurrency(data.total_invested);
        document.getElementById("statTotal").textContent    = formatCurrency(data.total_value);

        const returnsEl = document.getElementById("statReturns");
        returnsEl.textContent = formatCurrency(data.total_returns);
        returnsEl.classList.toggle("up", data.total_returns >= 0);
        returnsEl.classList.toggle("down", data.total_returns < 0);

        loadingEl.hidden = true;

        if(!data.holdings.length){
            emptyEl.hidden = false;
            return;
        }

        bodyEl.innerHTML = data.holdings.map(function(holding){

            const isUp = holding.pnl >= 0;

            return `
                <tr data-ticker="${holding.ticker}">
                    <td class="holdings-table__ticker">${holding.ticker}</td>
                    <td>${holding.shares}</td>
                    <td>${formatCurrency(holding.avg_price)}</td>
                    <td>${formatCurrency(holding.current_price)}</td>
                    <td>${formatCurrency(holding.market_value)}</td>
                    <td class="${isUp ? "up" : "down"}">
                        ${formatCurrency(holding.pnl)} (${formatPercent(holding.pnl_pct)})
                    </td>
                    <td>
                        <a class="btn btn--ghost btn--sm" href="/stock-page/${encodeURIComponent(holding.ticker)}">
                            View Chart
                        </a>
                    </td>
                </tr>
            `;

        }).join("");

    } catch (err) {
        console.error("Portfolio load error:", err);
        loadingEl.textContent = "Couldn't load your portfolio. Please try again.";
    }

}

/* ---------------------------------------
   Filter holdings by ticker
--------------------------------------- */
(function setupHoldingsSearch(){

    const input = document.getElementById("holdingsSearch");

    if(!input){
        return;
    }

    input.addEventListener("input", function(){
        const query = input.value.trim().toUpperCase();
        const rows  = document.querySelectorAll("#holdingsBody tr");

        rows.forEach(function(row){
            row.hidden = !row.dataset.ticker.includes(query);
        });
    });

})();

loadUser();
loadPortfolio();