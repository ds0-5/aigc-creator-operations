from flask import Flask, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # 允许前端跨域访问

# 数据文件路径
DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "data.json")


def load_data():
    """从 JSON 文件加载数据"""
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@app.route("/api/metrics")
def get_metrics():
    data = load_data()
    return jsonify(data["metrics"])


@app.route("/api/layers")
def get_layers():
    data = load_data()
    return jsonify(data["layers"])


@app.route("/api/trends")
def get_trends():
    data = load_data()
    return jsonify(data["trends"])


@app.route("/api/alerts")
def get_alerts():
    data = load_data()
    return jsonify(data["alerts"])


@app.route("/api/creators")
def get_creators():
    data = load_data()
    return jsonify(data["creators"])


@app.route("/api/all")
def get_all():
    """一次性获取所有数据，减少请求次数"""
    return jsonify(load_data())


@app.route("/api/health")
def health():
    """健康检查"""
    return jsonify({"status": "ok", "data_file": DATA_FILE})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
