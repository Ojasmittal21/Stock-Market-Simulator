from flask import Flask, jsonify, render_template, request, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone, timedelta
import yfinance as yf
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score


app = Flask(__name__)

app.config["SECRET_KEY"] = "your_super_secret_key"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)



class User(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    email    = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)


class Account(db.Model):
    user_id      = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)
    cash_balance = db.Column(db.Float, nullable=False, default=10000.0)


IST = timezone(timedelta(hours=5, minutes=30))


class Trade(db.Model):
    id        = db.Column(db.Integer, primary_key=True)
    user_id   = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    ticker    = db.Column(db.String(20), nullable=False)
    action    = db.Column(db.String(4), nullable=False)
    shares    = db.Column(db.Float, nullable=False)
    price     = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(IST))


with app.app_context():
    db.create_all()


# ── PAGE ROUTES ───────────────────────────────────────────────────

@app.route("/")
def home():
    return render_template("home.html")


@app.route("/login", methods=["GET"])
def login_page():
    return render_template("login.html")


@app.route("/register", methods=["GET"])
def register_page():
    return render_template("signup.html")


@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("dashboard.html")

@app.route("/portfolio-page")
def portfolio_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("portfolio.html")

@app.route("/stock-page/<ticker>")
def stock_page(ticker):
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("stock.html", ticker=ticker)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))


@app.route("/login", methods=["POST"])
def login():
    data     = request.json
    email    = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if user is None:
        return jsonify({"message": "User not registered"}), 404

    if user and check_password_hash(user.password, password):
        session["user_id"] = user.id
        session["email"]   = user.email
        return jsonify({"message": "Login successful"})  
    else:
        return jsonify({"message": "Invalid email or password"}), 401


@app.route("/register", methods=["POST"])
def register():
    try:
        data     = request.json
        email    = data.get("email")
        password = data.get("password")

        if len(password) < 6:
            return jsonify({"message": "Password must be at least 6 characters"}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"message": "User already registered"}), 409

        hashed_password = generate_password_hash(password)
        new_user        = User(email=email, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        new_account = Account(user_id=new_user.id)
        db.session.add(new_account)
        db.session.commit()

        return jsonify({"message": "User registered successfully"})
    except Exception as e:
        print("REGISTER ERROR:", e)        # ← prints real error in terminal
        return jsonify({"message": str(e)}), 500


@app.route("/me")
def me():
    if "user_id" in session:
        return jsonify({"logged_in": True, "email": session["email"]})
    return jsonify({"logged_in": False})


@app.route("/account")
def account():
    if "user_id" not in session:
        return jsonify({"message": "Login required"}), 401

    acc = Account.query.filter_by(user_id=session["user_id"]).first()

    if acc is None:
        return jsonify({"message": "Account not found"}), 404

    return jsonify({
        "email":        session["email"],
        "cash_balance": acc.cash_balance
    })


@app.route("/stock/<ticker>")
def stock(ticker):
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Login required"}), 401

    try:
        stock_data    = yf.Ticker(ticker.upper())
        current_price = stock_data.fast_info["last_price"]
        history       = stock_data.history(period="1mo")

        if history.empty:
            return jsonify({"success": False, "message": "Ticker not found"}), 404

        info         = stock_data.info
        history_list = []

        for date, row in history.iterrows():
            history_list.append({
                "date":   str(date.date()),
                "open":   round(row["Open"], 2),
                "high":   round(row["High"], 2),
                "low":    round(row["Low"], 2),
                "close":  round(row["Close"], 2),
                "volume": int(row["Volume"])
            })

        return jsonify({
            "success":       True,
            "ticker":        ticker.upper(),
            "name":          info.get("longName", ticker.upper()),
            "current_price": round(current_price, 2),
            "week_52_high":  info.get("fiftyTwoWeekHigh", 0),
            "week_52_low":   info.get("fiftyTwoWeekLow", 0),
            "market_cap":    info.get("marketCap", 0),
            "history":       history_list
        })

    except Exception as e:
        print("STOCK ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/trade", methods=["POST"])
def trade():
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Login required"}), 401

    data    = request.json
    ticker  = data.get("ticker", "").upper()
    action  = data.get("action", "").upper()
    shares  = float(data.get("shares", 0))
    user_id = session["user_id"]

    if not ticker or action not in ["BUY", "SELL"] or shares <= 0:
        return jsonify({"success": False, "message": "Invalid input"}), 400

    try:
        current_price = yf.Ticker(ticker).fast_info["last_price"]
    except Exception as e:
        return jsonify({"success": False, "message": "Could not fetch price"}), 500

    trade_cost = shares * current_price
    acc        = Account.query.filter_by(user_id=user_id).first()

    if action == "BUY":
        if trade_cost > acc.cash_balance:
            return jsonify({
                "success": False,
                "message": f"Not enough cash. Need ${trade_cost:,.2f}, you have ${acc.cash_balance:,.2f}"
            }), 400
        acc.cash_balance -= trade_cost

    else:  
        user_trades = Trade.query.filter_by(user_id=user_id, ticker=ticker).all()
        owned       = sum(t.shares if t.action == "BUY" else -t.shares for t in user_trades)

        if shares > owned:
            return jsonify({
                "success": False,
                "message": f"You only own {round(owned, 4)} shares of {ticker}"
            }), 400

        # FIX 3 — cash_balance not cash_valance (typo fixed)
        acc.cash_balance += trade_cost

    new_trade = Trade(
        user_id=user_id,
        ticker=ticker,
        action=action,
        shares=shares,
        price=current_price
    )
    db.session.add(new_trade)
    db.session.commit()

    return jsonify({
        "success":     True,
        "message":     f"{action} {shares} shares of {ticker} at ${current_price:,.2f}",
        "new_balance": round(acc.cash_balance, 2)
    })

@app.route("/portfolio")

def portfolio():
    if "user_id" not in session:
        return jsonify({"success":False , "message":"Login required"}),401
    
    user_id=session["user_id"]
    acc=Account.query.filter_by(user_id=user_id).first()
    all_trade=Trade.query.filter_by(user_id=user_id).all()

    ticker_data={}
    for t in all_trade:
        if t.ticker not in ticker_data:
            ticker_data[t.ticker]={
                "shares":0,
                "total_cost":0,
                "buy_shares":0
            }

        if t.action=="BUY":
            ticker_data[t.ticker]["shares"] += t.shares
            ticker_data[t.ticker]["total_cost"] +=t.shares*t.price
            ticker_data[t.ticker]["buy_shares"] +=t.shares
        
        else:
            ticker_data[t.ticker]["shares"] -=t.shares

    # Now we'll calculate the profit and loss of each

    holdings_list=[]
    total_invested=0.0
    holdings_value=0.0

    for ticker , data in ticker_data.items():
        if data["shares"] <=0:
            continue

        try:
            current_price=yf.Ticker(ticker).fast_info["last_price"]

        # if yaoo finance fails
        except Exception:
            current_price=data["total_cost"]/data["buy_shares"]

        avg_price=data["total_cost"]/data["buy_shares"]
        cost_basis= avg_price*data["shares"]
        market_value=current_price*data["shares"]
        pnl=market_value-cost_basis
        pnl_pct=(pnl/cost_basis)*100

        total_invested+=cost_basis
        holdings_value+=market_value

        holdings_list.append({
            "ticker": ticker,
            "shares": round(data["shares"],4),
            "avg_price": round(avg_price, 2),
            "current_price": round(current_price, 2),
            "market_value": round(market_value, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2)
        })

    return jsonify({
            "success": True,
            "email": session["email"],
            "cash": round(acc.cash_balance,2),
            "total_invested": round(total_invested, 2),
            "total_returns": round(holdings_value-total_invested, 2),
            "total_value": round(acc.cash_balance + holdings_value, 2),
            "holdings": holdings_list

        })


POPULAR_TICKERS = ["AAPL", "TSLA", "GOOGL", "MSFT", "RELIANCE.NS", "TCS.NS", "INFY.NS", "NVDA"]

@app.route("/dashboard-data")
def dashboard_data():
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Login required"}), 401

    user_id = session["user_id"]
    acc     = Account.query.filter_by(user_id=user_id).first()

    # Calculate holdings value from trades
    all_trades  = Trade.query.filter_by(user_id=user_id).all()
    ticker_data = {}

    for t in all_trades:
        if t.ticker not in ticker_data:
            ticker_data[t.ticker] = {
                "shares":     0,
                "total_cost": 0,
                "buy_shares": 0
            }
        if t.action == "BUY":
            ticker_data[t.ticker]["shares"]     += t.shares
            ticker_data[t.ticker]["total_cost"] += t.shares * t.price
            ticker_data[t.ticker]["buy_shares"] += t.shares
        else:
            ticker_data[t.ticker]["shares"] -= t.shares

    # Build holdings list with live prices
    holdings       = []
    holdings_value = 0.0

    for ticker, data in ticker_data.items():
        if data["shares"] <= 0:
            continue

        try:
            current_price = yf.Ticker(ticker).fast_info["last_price"]
        except Exception:
            current_price = data["total_cost"] / data["buy_shares"]

        avg_price    = data["total_cost"] / data["buy_shares"]
        market_value = current_price * data["shares"]
        pnl          = market_value - (avg_price * data["shares"])
        holdings_value += market_value

        holdings.append({
            "ticker":        ticker,
            "shares":        round(data["shares"], 4),
            "avg_price":     round(avg_price, 2),
            "current_price": round(current_price, 2),
            "market_value":  round(market_value, 2),
            "pnl":           round(pnl, 2),
            "pnl_pct":       round((pnl / (avg_price * data["shares"])) * 100, 2)
        })

    # Get popular stocks live prices
    popular = []
    for ticker in POPULAR_TICKERS:
        try:
            price = yf.Ticker(ticker).fast_info["last_price"]
            popular.append({
                "ticker": ticker,
                "price":  round(price, 2)
            })
        except Exception:
            pass   

    return jsonify({
        "success":        True,
        "email":          session["email"],
        "cash":           round(acc.cash_balance, 2),
        "holdings_value": round(holdings_value, 2),
        "total_value":    round(acc.cash_balance + holdings_value, 2),
        "popular_stocks": popular,
        "holdings":       holdings
    })

# ML Prediction
@app.route("/predict/<ticker>")
def predict(ticker):
    if "user_id" not in session:
        return jsonify({"success":False,"message":"Login Required"}),401
    
    try:
        df=yf.Ticker(ticker.upper()).history(period="1y")

        if(df.empty or len(df)<30):
            return jsonify({"success":False,"message":"Not enough data"}),404
        
        df["daily_return"]=df["Close"].pct_change()
        df["ma5"]           = df["Close"].rolling(5).mean()
        df["ma10"]          = df["Close"].rolling(10).mean()
        df["ma_ratio"]      = df["ma5"] / df["ma10"]
        df["volume_change"] = df["Volume"].pct_change()
    
        df["label"]=(df["Close"].shift(-1)>df["Close"]).astype(int)

        df=df.dropna()
        
        features=["daily_return","ma5","ma10","ma_ratio","volume_change"]
        X=df[features]
        y=df["label"]

        X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=0.2,shuffle=False)

        model=RandomForestClassifier(n_estimators=100,random_state=42)
        model.fit(X_train,y_train)

        y_pred=model.predict(X_test)
        accuracy=accuracy_score(y_test,y_pred)
        baseline=float(y_test.mean())

        latest=X.iloc[[-1]]
        prediction=model.predict(latest)[0]
        confidence=model.predict_proba(latest)[0]

        return jsonify({
            "success":    True,
            "ticker":     ticker.upper(),
            "prediction": "UP" if prediction == 1 else "DOWN",
            "confidence": round(float(max(confidence)), 2),
            "accuracy":   round(float(accuracy), 2),
            "baseline":   round(baseline, 2),
            "note":       "Educational only — not financial advice"
        })

    except Exception as e:
        print("PREDICT ERROR:", e)
        return jsonify({"success": False, "message": str(e)}), 500



if __name__ == "__main__":
    app.run(debug=True,host="0.0.0.0", port=5000)