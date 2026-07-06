# 📈 Stock Market Simulator

A full-stack Stock Market Simulator built using **Flask, SQLAlchemy, HTML, CSS, JavaScript, and Machine Learning**. The application allows users to experience virtual stock trading using real-time market data without risking real money.

---

## 🚀 Features

### 🔐 User Authentication
- User Registration
- Secure Login & Logout
- Session Management

### 💰 Virtual Portfolio
- Start with virtual cash
- Buy and sell stocks
- Track available balance
- View portfolio holdings

### 📊 Live Stock Data
- Fetch real-time stock prices using **Yahoo Finance (yfinance)**
- Support for:
  - US Stocks (AAPL, TSLA, MSFT, etc.)
  - Indian NSE Stocks (.NS)

### 📈 Interactive Charts
- Historical price charts
- Dynamic graph updates
- Stock performance visualization

### 🤖 Machine Learning Prediction
Predicts whether the stock price is likely to move **UP** or **DOWN** based on historical market data.

Features used:
- Daily Return
- 5-Day Moving Average
- 10-Day Moving Average
- Moving Average Ratio
- Volume Change

Model:
- Random Forest Classifier (Scikit-learn)

The prediction module also displays:
- Prediction Direction
- Confidence Score
- Model Accuracy
- Baseline Accuracy

> **Disclaimer:** Predictions are for educational purposes only and should not be considered financial advice.

---

## 🛠 Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Python
- Flask

### Database
- SQLAlchemy

### Machine Learning
- Scikit-learn
- Random Forest Classifier
- Pandas
- NumPy

### APIs
- Yahoo Finance (yfinance)

---

## 📂 Project Structure

```
Stock-Simulator/
│
├── static/
│   ├── styles.css
│   ├── JSscipr.js
│   └── ...
│
├── templates/
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   └── ...
│
├── app.py
├── Sample Images/
├── requirements.txt
└── README.md
```

---

## ⚙️ Installation

### Clone the repository

```bash
git clone https://github.com/yourusername/stock-market-simulator.git
cd stock-market-simulator
```

### Create a virtual environment

Windows

```bash
python -m venv venv
venv\Scripts\activate
```

Linux / Mac

```bash
python3 -m venv venv
source venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Run the application

```bash
python app.py
```

Open your browser:

```
http://127.0.0.1:5000
```

---

## 📦 Required Libraries

```
Flask
render_template
yfinance
pandas
numpy
scikit-learn
request
Session 
redirect
url_for
jsonify
werkzeug.security
datetime
flask_sqlalchemy
```

Or install manually:

```bash
pip install flask flask-session yfinance pandas numpy scikit-learn matplotlib
```

---

## 🎯 Machine Learning Workflow

1. Download historical stock data
2. Calculate technical indicators
3. Generate feature set
4. Train Random Forest model
5. Predict next-day movement
6. Display confidence and accuracy

---

## 📸 Screenshots

Add screenshots of:

- Login Page
- Dashboard
- Portfolio
- Buy/Sell Stocks
- Stock Chart
- ML Prediction

---

## 🔮 Future Improvements

- Deep Learning (LSTM) price prediction
- Candlestick charts
- Watchlist
- News sentiment analysis
- Portfolio analytics
- Risk assessment
- Email notifications
- Multi-market support
- Cryptocurrency trading simulation

---

## ⚠️ Disclaimer

This project is intended for educational and learning purposes only.

The stock prices are fetched from Yahoo Finance, and the machine learning predictions should **not** be used as financial or investment advice.

---

## 👨‍💻 Contributors

- Navya Agarwal
- Ojas Mittal

---


