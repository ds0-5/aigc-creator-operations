import json
import random
import os
from datetime import datetime, timedelta
from faker import Faker

# ============================================================
# 配置参数
# ============================================================

CONFIG = {
    "MAX_CREATORS": 30,  # 数据池最大容量（演示设30，真实场景可调大）
    "DAILY_NEW_COUNT": 2,  # 每天自动新增2位创作者
    "BASE_CREATORS": 1284,  # 初始总人数基准
}

fake = Faker("zh_CN")
#Faker.seed(42)
#random.seed(42)

# ============================================================
# 1. 工具函数
# ============================================================


def generate_creator(index, level=None):
    """生成一个单独的创作者"""
    if level is None:
        level = random.choices(["head", "mid", "tail"], weights=[10, 30, 60])[0]

    name_pool = {
        "head": [
            "AI画师-小林",
            "赛博诗人-老张",
            "动态视觉-小唐",
            "AI视觉-阿宁",
            "数字艺术家-老周",
        ],
        "mid": [
            "像素诗人-阿杰",
            "AI影音-老陈",
            "赛博设计-阿凯",
            "AI插画-李老师",
            "数字水墨-小杨",
            "AI篆刻-老徐",
        ],
        "tail": [
            "AI装置-老吴",
            "数字绘画-小刘",
            "AI动画-阿强",
            "赛博书法-老郑",
            "AI雕塑-小赵",
            "数字拼贴-阿梅",
        ],
    }
    name = random.choice(name_pool.get(level, name_pool["tail"]))
    name = f"{name}_{index}" if random.random() > 0.3 else name

    if level == "head":
        weekly_output = random.randint(8, 15)
        interaction_rate = round(random.uniform(0.06, 0.10), 3)
    elif level == "mid":
        weekly_output = random.randint(4, 7)
        interaction_rate = round(random.uniform(0.04, 0.06), 3)
    else:
        weekly_output = random.randint(1, 3)
        interaction_rate = round(random.uniform(0.02, 0.04), 3)

    status = random.choices(["active", "risky", "inactive"], weights=[70, 20, 10])[0]
    days_ago = random.randint(0, 20)
    last_active = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

    return {
        "id": index,
        "name": name,
        "level": level,
        "weeklyOutput": weekly_output,
        "interactionRate": interaction_rate,
        "status": status,
        "lastActive": last_active,
    }


def load_existing_data():
    """加载现有的 data.json，如果不存在返回 None"""
    file_path = os.path.join("data", "data.json")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_data(data):
    """保存数据到 data.json"""
    os.makedirs("data", exist_ok=True)
    file_path = os.path.join("data", "data.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 数据已保存到: {file_path}")


# ============================================================
# 2. 核心逻辑：增量追加 + 滑动窗口
# ============================================================


def generate_incremental_data():
    """增量生成数据"""
    existing = load_existing_data()

    if existing is None:
        # ===== 首次运行：生成全量数据 =====
        print("🆕 首次运行，生成全量初始数据...")
        creators = [generate_creator(i) for i in range(1, CONFIG["BASE_CREATORS"] + 1)]
        # 打乱一下让分布更自然
        random.shuffle(creators)

        # 重新分配ID
        for idx, c in enumerate(creators, 1):
            c["id"] = idx

        # 取前CONFIG["MAX_CREATORS"]个作为初始池
        creators = creators[: CONFIG["MAX_CREATORS"]]

        # 计算指标
        total = len(creators)
        active = sum(1 for c in creators if c["status"] == "active")
        weekly = sum(c["weeklyOutput"] for c in creators)
        quality = sum(1 for c in creators if c["level"] == "head")

        data = {
            "metrics": {
                "totalCreators": total,
                "activeRate": round(active / total, 3),
                "weeklyOutput": weekly,
                "qualityRate": round(quality / total, 3),
                "lostAlert": sum(1 for c in creators if c["status"] == "risky"),
                "changes": {
                    "totalCreators": round(random.uniform(-0.05, 0.18), 3),
                    "activeRate": round(random.uniform(-0.03, 0.05), 3),
                    "weeklyOutput": round(random.uniform(-0.05, 0.15), 3),
                    "qualityRate": round(random.uniform(-0.04, 0.03), 3),
                    "lostAlert": round(random.uniform(-0.02, 0.06), 3),
                },
            },
            "layers": {
                "labels": ["头部创作者", "腰部创作者", "尾部创作者"],
                "percentages": [10, 30, 60],
                "contribution": [42, 35, 23],
                "colors": ["#4a7abf", "#7ab7ff", "#2a3a5a"],
            },
            "trends": {
                "labels": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
                "values": [random.randint(25, 55) for _ in range(7)],
            },
            "alerts": [],
            "creators": creators,
        }

        # 生成预警
        risky_creators = [c for c in creators if c["status"] == "risky"]
        alert_templates = [
            {
                "level": "danger",
                "desc": "连续15天未产出，存在流失风险",
                "time": "2小时前",
            },
            {
                "level": "warning",
                "desc": "近3篇互动率下降52%，选题可能疲劳",
                "time": "5小时前",
            },
            {
                "level": "info",
                "desc": "新入驻7天，仅发布1篇，建议激活",
                "time": "1天前",
            },
            {
                "level": "warning",
                "desc": "内容质量评分连续下降，需关注",
                "time": "2天前",
            },
        ]
        for i, c in enumerate(risky_creators[:5]):
            if i < len(alert_templates):
                data["alerts"].append(
                    {
                        "level": alert_templates[i]["level"],
                        "name": c["name"],
                        "desc": alert_templates[i]["desc"],
                        "time": alert_templates[i]["time"],
                    }
                )

        save_data(data)
        print(f"📊 初始数据生成完成！当前创作者数: {len(creators)}")
        return

    # ===== 已有数据：增量追加 =====
    print("📈 检测到已有数据，执行增量追加...")

    creators = existing["creators"]
    old_count = len(creators)

    # 1. 生成 2 个新创作者
    new_creators = []
    for i in range(CONFIG["DAILY_NEW_COUNT"]):
        new_id = old_count + i + 1
        new_creator = generate_creator(new_id)
        new_creators.append(new_creator)
        print(f"   👤 新增创作者: {new_creator['name']}")

    # 2. 追加到列表
    creators.extend(new_creators)

    # 3. 滑动窗口：如果超过最大容量，删除最早的（最前面的）
    if len(creators) > CONFIG["MAX_CREATORS"]:
        removed = len(creators) - CONFIG["MAX_CREATORS"]
        creators = creators[removed:]
        print(
            f"   🗑️ 删除了最早注册的 {removed} 位创作者，保持容量上限 {CONFIG['MAX_CREATORS']}"
        )

    # 4. 重新分配ID
    for idx, c in enumerate(creators, 1):
        c["id"] = idx

    # 5. 重新计算指标
    total = len(creators)
    active = sum(1 for c in creators if c["status"] == "active")
    weekly = sum(c["weeklyOutput"] for c in creators)
    quality = sum(1 for c in creators if c["level"] == "head")
    risky = sum(1 for c in creators if c["status"] == "risky")

    # 6. 更新 metrics
    old_metrics = existing["metrics"]
    existing["metrics"] = {
        "totalCreators": total,
        "activeRate": round(active / total, 3),
        "weeklyOutput": weekly,
        "qualityRate": round(quality / total, 3),
        "lostAlert": risky,
        "changes": {
            "totalCreators": round(
                (total - old_count) / old_count if old_count > 0 else 0.01, 3
            ),
            "activeRate": round(random.uniform(-0.02, 0.04), 3),
            "weeklyOutput": round(random.uniform(-0.03, 0.08), 3),
            "qualityRate": round(random.uniform(-0.03, 0.02), 3),
            "lostAlert": round(random.uniform(-0.02, 0.04), 3),
        },
    }

    # 7. 更新趋势图（每天的数据向右平移，最后一天生成新值）
    old_trends = existing["trends"]["values"]
    new_value = max(20, old_trends[-1] + random.randint(-5, 10))
    new_trends = old_trends[1:] + [new_value]
    existing["trends"]["values"] = new_trends

    # 8. 更新预警列表（从当前创作者中重新生成）
    risky_creators = [c for c in creators if c["status"] == "risky"]
    alert_templates = [
        {"level": "danger", "desc": "连续15天未产出，存在流失风险", "time": "2小时前"},
        {
            "level": "warning",
            "desc": "近3篇互动率下降52%，选题可能疲劳",
            "time": "5小时前",
        },
        {"level": "info", "desc": "新入驻7天，仅发布1篇，建议激活", "time": "1天前"},
        {"level": "warning", "desc": "内容质量评分连续下降，需关注", "time": "2天前"},
    ]
    existing["alerts"] = []
    for i, c in enumerate(risky_creators[:5]):
        if i < len(alert_templates):
            existing["alerts"].append(
                {
                    "level": alert_templates[i]["level"],
                    "name": c["name"],
                    "desc": alert_templates[i]["desc"],
                    "time": alert_templates[i]["time"],
                }
            )

    # 9. 保存
    save_data(existing)
    print(
        f"📊 增量更新完成！当前创作者数: {len(creators)}（新增 {len(new_creators)} 人）"
    )


# ============================================================
# 3. 主函数
# ============================================================

if __name__ == "__main__":
    print(f"🔄 {datetime.now()} - 开始执行数据生成任务...")
    generate_incremental_data()
    print("🎉 任务完成！")
