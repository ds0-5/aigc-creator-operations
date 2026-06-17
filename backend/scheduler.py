import schedule
import time
import subprocess
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# ============================================================
# 配置区域
# ============================================================

EMAIL_CONFIG = {
    "sender": "3608562331@qq.com",
    "auth_code": "cioyxdyazcracjcg",  # 替换成你的授权码
    "receiver": "2360248748@qq.com",
}

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "data.json")


# ============================================================
# 1. 生成 HTML 周报
# ============================================================


def generate_html_report(data):
    """生成 HTML 格式的周报"""
    m = data["metrics"]
    alerts = data.get("alerts", [])
    trends = data["trends"]
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    last_week = trends["values"][-7:]
    avg = sum(last_week) / len(last_week) if last_week else 0

    alert_html = ""
    if alerts:
        for a in alerts[:5]:
            color = (
                "#e74c3c"
                if a["level"] == "danger"
                else "#f39c12" if a["level"] == "warning" else "#3498db"
            )
            icon = (
                "🔴"
                if a["level"] == "danger"
                else "🟡" if a["level"] == "warning" else "🔵"
            )
            alert_html += f'<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;">{icon}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold;">{a["name"]}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;color:{color};">{a["desc"]}</td></tr>'
    else:
        alert_html = '<tr><td colspan="3" style="padding:10px;text-align:center;color:#888;">✅ 暂无预警</td></tr>'

    html = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 20px; }}
    .container {{ max-width: 700px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; padding: 24px; }}
    h1 {{ color: #2c3e50; font-size: 22px; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
    .meta {{ color: #7f8c8d; font-size: 13px; margin-bottom: 20px; }}
    .section {{ background: white; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }}
    .section-title {{ font-weight: 600; color: #2c3e50; font-size: 15px; margin-bottom: 10px; }}
    .kpi-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }}
    .kpi-item {{ display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }}
    .kpi-label {{ color: #555; }}
    .kpi-value {{ font-weight: 600; color: #2c3e50; }}
    .kpi-change-up {{ color: #27ae60; }}
    .kpi-change-down {{ color: #e74c3c; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
    .footer {{ margin-top: 20px; font-size: 12px; color: #95a5a6; text-align: center; border-top: 1px solid #ddd; padding-top: 16px; }}
</style>
</head>
<body>
<div class="container">
    <h1>📊 创作者运营周报</h1>
    <div class="meta">📅 生成时间：{now}</div>

    <div class="section">
        <div class="section-title">📈 核心数据</div>
         <div class="kpi-grid">
            <div class="kpi-item"><span class="kpi-label">总创作者</span><span class="kpi-value">{m['totalCreators']} 人 <span class="kpi-change-up">↑ {m['changes']['totalCreators']*100:.1f}%</span></span></div>
            <div class="kpi-item"><span class="kpi-label">活跃率</span><span class="kpi-value">{m['activeRate']*100:.1f}% <span class="kpi-change-up">↑ {m['changes']['activeRate']*100:.1f}%</span></span></div>
            <div class="kpi-item"><span class="kpi-label">本周产出</span><span class="kpi-value">{m['weeklyOutput']} 篇 <span class="kpi-change-up">↑ {m['changes']['weeklyOutput']*100:.1f}%</span></span></div>
            <div class="kpi-item"><span class="kpi-label">优质率</span><span class="kpi-value">{m['qualityRate']*100:.1f}% <span class="kpi-change-down">↓ {abs(m['changes']['qualityRate'])*100:.1f}%</span></span></div>
            <div class="kpi-item"><span class="kpi-label">流失预警</span><span class="kpi-value">{m['lostAlert']} 人 <span class="kpi-change-down">↑ {m['changes']['lostAlert']}人</span></span></div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">📉 趋势判断</div>
        <div class="kpi-grid">
            <div class="kpi-item"><span class="kpi-label">近7天日均产出</span><span class="kpi-value">{avg:.0f} 篇</span></div>
            <div class="kpi-item"><span class="kpi-label">创作者分层</span><span class="kpi-value">头部10% | 腰部30% | 尾部60%</span></div>
            <div class="kpi-item"><span class="kpi-label">优质内容贡献</span><span class="kpi-value">头部42% | 腰部35% | 尾部23%</span></div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">⚠️ 预警名单</div>
        <table>
            <thead><tr><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd;">等级</th><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd;">创作者</th><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd;">问题描述</th></tr></thead>
            <tbody>{alert_html}</tbody>
        </table>
    </div>

    <div class="footer">📌 本报告由 AIGC创作者运营驾驶舱 自动生成</div>
</div>
</body>
</html>
"""
    return html


# ============================================================
# 2. 发送邮件（底层 smtplib 直接发送，完全控制编码）
# ============================================================


def send_email(html_content):
    """通过 smtplib 底层方法发送邮件，完全避免编码问题"""
    try:
        config = EMAIL_CONFIG
        sender = config["sender"]
        receiver = config["receiver"]
        auth_code = config["auth_code"]

        # ===== 手动构建邮件内容（纯 ASCII 头部 + Base64 编码的 HTML 正文） =====
        from email.utils import formatdate
        import base64

        # 主题（纯英文）
        subject = f"AIGC Weekly Report {datetime.now().strftime('%Y-%m-%d')}"

        # 把 HTML 内容转为 Base64（纯 ASCII 字符）
        html_bytes = html_content.encode("utf-8")
        html_base64 = base64.b64encode(html_bytes).decode("ascii")

        # 手动构建邮件（完全避开 Header 和 MIMEText 的编码陷阱）
        message = f"""From: {sender}
To: {receiver}
Subject: {subject}
Date: {formatdate(localtime=True)}
MIME-Version: 1.0
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: base64

{html_base64}
"""

        # ===== 直接用 smtplib 发送 =====
        with smtplib.SMTP_SSL("smtp.qq.com", 465) as server:
            server.login(sender, auth_code)
            server.sendmail(sender, [receiver], message.encode("ascii"))  # 全部用 ASCII

        print(f"✅ 邮件发送成功！{datetime.now()}")
        return True

    except Exception as e:
        print(f"❌ 邮件发送失败：{e}")
        return False


# ============================================================
# 3. 每日任务
# ============================================================


def daily_job():
    print(f"🔄 {datetime.now()} - 开始执行每日任务...")

    try:
        subprocess.run(
            ["python", "backend/data_generator.py"],
            cwd=os.path.dirname(os.path.dirname(__file__)),
            capture_output=True,
            text=True,
        )
        print("   ✅ 数据已更新")

        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        html_report = generate_html_report(data)
        send_email(html_report)

        print(f"✅ {datetime.now()} - 每日任务完成！")

    except Exception as e:
        print(f"❌ 每日任务执行失败：{e}")


# ============================================================
# 4. 启动
# ============================================================

if __name__ == "__main__":
    schedule.every().day.at("13:10").do(daily_job)

    print("⏰ 定时任务已启动，每天 13:10 执行...")
    print(f"📧 邮件将发送到：{EMAIL_CONFIG['receiver']}")
    print("按 Ctrl+C 停止")

    print("\n🔄 首次启动，立即执行一次测试...")
    daily_job()

    while True:
        schedule.run_pending()
        time.sleep(60)
