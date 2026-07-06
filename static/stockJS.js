/* ==========================================================
   stock.js
   Loads a single stock's data from the Flask backend,
   draws a candlestick chart of its price history, and
   handles buy/sell trades.
   ========================================================== */



let currentTicker = (typeof TICKER !== "undefined" ? TICKER : "").toUpperCase()
const requestedAction = "";

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

function formatCompact(value){
    if(!value) return "—";
    const units = [
        { value: 1e12, suffix: "T" },
        { value: 1e9,  suffix: "B" },
        { value: 1e6,  suffix: "M" },
        { value: 1e3,  suffix: "K" }
    ];
    for(const unit of units){
        if(value >= unit.value){
            return "$" + (value / unit.value).toFixed(2) + unit.suffix;
        }
    }
    return "$" + value;
}

/* ---------------------------------------
   Theme toggle
--------------------------------------- */
(function setupThemeToggle(){

    const toggle = document.getElementById("themeToggle");
    if(!toggle) return;

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
    if(!logoutBtn) return;

    logoutBtn.addEventListener("click", function(){
        if(confirm("Log out of your account?")){
            window.location.href = "/logout";
        }
    });
})();

/* ---------------------------------------
   Ticker search — jump to a new stock
--------------------------------------- */
(function setupTickerSearch(){

    const input = document.getElementById("tickerSearch");
    if(!input) return;

    input.addEventListener("keydown", function(event){
        if(event.key === "Enter" && input.value.trim()){
            const ticker = input.value.trim().toUpperCase();
            window.location.href = `/stock-page/${encodeURIComponent(ticker)}`;
        }
    });

})();

/* ---------------------------------------
   Load signed-in user's name
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
   Load available cash (for the trade panel)
--------------------------------------- */
async function loadCash(){
    try {
        const response = await fetch("/account");
        if(!response.ok) return;
        const data = await response.json();
        document.getElementById("tradeCash").textContent = formatCurrency(data.cash_balance);
    } catch (err) {
        console.error("Could not load account balance:", err);
    }
}
async function loadPrediction(ticker) {
    try {
        const response = await fetch(`/predict/${ticker}`, {
            credentials: "include"    // ← add this line
        })
        const data = await response.json()

        if (!data.success) return

        const predEl     = document.getElementById("predictionText")
        const confEl     = document.getElementById("predictionConf")
        const accEl      = document.getElementById("predictionAcc")
        const baselineEl = document.getElementById("predictionBaseline")

        if (predEl) {
            predEl.textContent = data.prediction === "UP" ? "↑ UP" : "↓ DOWN"
            predEl.style.color = data.prediction === "UP"
                ? "var(--mint-400)"
                : "var(--rose-400)"
        }

        if (confEl)     confEl.textContent     = "Confidence: " + (data.confidence * 100).toFixed(0) + "%"
        if (accEl)      accEl.textContent      = "Model accuracy: " + (data.accuracy * 100).toFixed(0) + "%"
        if (baselineEl) baselineEl.textContent = "Baseline: " + (data.baseline * 100).toFixed(0) + "%"

    } catch (err) {
        console.error("Prediction error:", err)
    }
}
/* ---------------------------------------
   Candlestick chart
--------------------------------------- */
function drawCandlestickChart(history){

    const canvas = document.getElementById("priceChart");
    const wrap   = canvas.parentElement;
    const ctx    = canvas.getContext("2d");

    const dpr    = window.devicePixelRatio || 1;
    const width  = wrap.clientWidth;
    const height = 320;

    canvas.width  = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width + "px";
    canvas.style.height = height + "px";
    ctx.scale(dpr, dpr);

    const styles    = getComputedStyle(document.documentElement);
    const gridColor = styles.getPropertyValue("--ink-800").trim();
    const textColor = styles.getPropertyValue("--muted").trim();
    const upColor   = styles.getPropertyValue("--mint-400").trim();
    const downColor = styles.getPropertyValue("--rose-400").trim();

    const padding = { top: 16, right: 16, bottom: 24, left: 64 };
    const chartW  = width - padding.left - padding.right;
    const chartH  = height - padding.top - padding.bottom;

    const highs = history.map(d => d.high);
    const lows  = history.map(d => d.low);
    const maxPrice = Math.max(...highs);
    const minPrice = Math.min(...lows);
    const priceRange = (maxPrice - minPrice) || 1;

    function yFor(price){
        return padding.top + chartH - ((price - minPrice) / priceRange) * chartH;
    }

    ctx.clearRect(0, 0, width, height);

    // grid lines + y-axis labels
    const gridLines = 5;
    ctx.strokeStyle = gridColor;
    ctx.fillStyle = textColor;
    ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.lineWidth = 1;

    for(let i = 0; i <= gridLines; i++){
        const price = minPrice + (priceRange / gridLines) * i;
        const y = yFor(price);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillText("$" + price.toFixed(2), 4, y + 4);
    }

    // candlesticks
    const slotWidth  = chartW / history.length;
    const candleWidth = Math.max(2, Math.min(14, slotWidth * 0.6));

    history.forEach(function(day, i){
        const x = padding.left + slotWidth * i + slotWidth / 2;
        const isUp = day.close >= day.open;

        ctx.strokeStyle = isUp ? upColor : downColor;
        ctx.fillStyle   = isUp ? upColor : downColor;

        // wick
        ctx.beginPath();
        ctx.moveTo(x, yFor(day.high));
        ctx.lineTo(x, yFor(day.low));
        ctx.stroke();

        // body
        const openY  = yFor(day.open);
        const closeY = yFor(day.close);
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));

        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // x-axis labels — show ~6 evenly spaced dates
    const labelCount = Math.min(6, history.length);
    const step = Math.max(1, Math.floor(history.length / labelCount));

    ctx.fillStyle = textColor;
    history.forEach(function(day, i){
        if(i % step !== 0) return;
        const x = padding.left + slotWidth * i + slotWidth / 2;
        const label = day.date.slice(5); // MM-DD
        ctx.fillText(label, x - 14, height - 6);
    });

}

/* ---------------------------------------
   Load stock data and render the page
--------------------------------------- */
async function loadStock(ticker){

    const emptyState   = document.getElementById("stockEmptyState");
    const content       = document.getElementById("stockContent");
    const loadingEl     = document.getElementById("stockLoading");

    if(!ticker){
        emptyState.hidden = false;
        content.hidden = true;
        return;
    }

    emptyState.hidden = true;
    loadingEl.hidden = false;
    content.hidden = true;

    try {

        const response = await fetch(`/stock/${encodeURIComponent(ticker)}`);
        
        if(response.status === 401){
            window.location.href = "/login";
            return;
        }

        const data = await response.json();

        if(!data.success){
            loadingEl.textContent = data.message || "Could not load this stock.";
            return;
        }

        document.getElementById("stockSymbol").textContent = data.ticker;
        document.getElementById("stockName").textContent   = data.name;
        document.getElementById("stockPrice").textContent  = formatCurrency(data.current_price);
        document.getElementById("stock52High").textContent = formatCurrency(data.week_52_high);
        document.getElementById("stock52Low").textContent  = formatCurrency(data.week_52_low);
        document.getElementById("stockMarketCap").textContent = formatCompact(data.market_cap);

        const history = data.history;
        const changeEl = document.getElementById("stockChange");

        if(history.length >= 2){
            const prevClose = history[history.length - 2].close;
            const change    = data.current_price - prevClose;
            const changePct = (change / prevClose) * 100;
            const isUp = change >= 0;

            changeEl.textContent = `${isUp ? "▲" : "▼"} ${Math.abs(change).toFixed(2)} (${changePct.toFixed(2)}%)`;
            changeEl.classList.toggle("up", isUp);
            changeEl.classList.toggle("down", !isUp);
        } else {
            changeEl.textContent = "";
        }

        loadingEl.hidden = true;
        content.hidden = false;

        drawCandlestickChart(history);
        loadPrediction(ticker)
        applyRequestedAction();

    } catch (err) {
        console.error("Stock load error:", err);
        loadingEl.textContent = "Something went wrong loading this stock.";
    }

}

/* ---------------------------------------
   If the user arrived via a Buy/Sell shortcut on the
   dashboard, highlight that action and focus the input
--------------------------------------- */
function applyRequestedAction(){

    if(requestedAction !== "BUY" && requestedAction !== "SELL"){
        return;
    }

    const button = document.querySelector(`[data-trade-action="${requestedAction}"]`);
    const sharesInput = document.getElementById("tradeShares");

    if(button){
        button.classList.add("is-suggested");
    }

    if(sharesInput){
        sharesInput.focus();
    }

}

/* ---------------------------------------
   Trade form
--------------------------------------- */
(function setupTradeForm(){

    const form = document.getElementById("tradeForm");
    if(!form) return;

    form.addEventListener("submit", async function(event){

        event.preventDefault();

        const submitter = event.submitter;
        const action = submitter ? submitter.dataset.tradeAction : "BUY";
        const shares = parseFloat(document.getElementById("tradeShares").value);
        const messageEl = document.getElementById("tradeMessage");

        if(!shares || shares <= 0){
            messageEl.hidden = false;
            messageEl.textContent = "Enter a number of shares greater than 0.";
            messageEl.classList.add("down");
            return;
        }

        form.querySelectorAll("button").forEach(btn => btn.disabled = true);

        try {

            const response = await fetch("/trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticker: currentTicker,
                    action: action,
                    shares: shares
                })
            });

            const data = await response.json();

            messageEl.hidden = false;
            messageEl.textContent = data.message;
            messageEl.classList.toggle("up", data.success);
            messageEl.classList.toggle("down", !data.success);

            if(data.success){
                document.getElementById("tradeCash").textContent = formatCurrency(data.new_balance);
                form.reset();
            }

        } catch (err) {
            console.error("Trade error:", err);
            messageEl.hidden = false;
            messageEl.textContent = "Something went wrong placing this trade.";
            messageEl.classList.add("down");
        } finally {
            form.querySelectorAll("button").forEach(btn => btn.disabled = false);
        }

    });

})();

loadUser();
loadCash();
loadStock(currentTicker);