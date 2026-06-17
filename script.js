/**
 * AIGC创作者运营驾驶舱 - 完整逻辑（阶段三：智能升级版）
 * 新增功能：一键周报 + 智能预警话术
 */

// =============================================================
// 1. 全局状态
// =============================================================

let DASHBOARD_DATA = null;
let layerChartInstance = null;
let trendChartInstance = null;

// 话术模板（按预警等级）
const SUGGESTION_MAP = {
    danger: '⚠️ 建议：立即私信沟通，了解原因并提供流量扶持',
    warning: '📌 建议：本周内主动联系，了解创作瓶颈或选题方向',
    info: '💡 建议：发送平台活动信息或新手激励，激发创作热情'
};

// 预警等级优先级（用于排序）
const PRIORITY = { danger: 0, warning: 1, info: 2 };

// =============================================================
// 2. 工具函数
// =============================================================

function formatPercent(value) {
    return (value * 100).toFixed(1) + '%';
}

function formatChange(value, isAbsolute) {
    if (isAbsolute) {
        if (value > 0) return '↑ ' + value + '人';
        if (value < 0) return '↓ ' + Math.abs(value) + '人';
        return '→ 0人';
    }
    var sign = value >= 0 ? '+' : '';
    var arrow = value >= 0 ? '↑' : '↓';
    return arrow + ' ' + sign + (value * 100).toFixed(1) + '%';
}

function getChangeClass(value) {
    return value >= 0 ? 'up' : 'down';
}

function getAlertClass(level) {
    var map = { danger: 'danger', warning: 'warning', info: 'info' };
    return map[level] || 'info';
}

function getAlertIcon(level) {
    var map = { danger: '🔴', warning: '🟡', info: '🔵' };
    return map[level] || '🔵';
}

function getLevelLabel(level) {
    var map = { head: '头部', mid: '腰部', tail: '尾部' };
    return map[level] || level;
}

function getLevelClass(level) {
    var map = { head: 'head', mid: 'mid', tail: 'tail' };
    return map[level] || '';
}

function getStatusLabel(status) {
    var map = { active: '活跃', risky: '有流失风险', inactive: '不活跃' };
    return map[status] || status;
}

function getStatusClass(status) {
    var map = { active: 'active', risky: 'risky', inactive: 'inactive' };
    return map[status] || '';
}

// =============================================================
// 3. 数据加载
// =============================================================

async function fetchAllData() {
    try {
        var response = await fetch('http://localhost:5000/api/all');
        if (!response.ok) {
            throw new Error('API 响应异常: ' + response.status);
        }
        var data = await response.json();
        console.log('✅ 数据从 API 加载成功');
        return data;
    } catch (error) {
        console.error('❌ 数据加载失败:', error);
        alert('⚠️ 无法连接后端服务，请确认已运行 python backend/app.py');
        return null;
    }
}

// =============================================================
// 4. KPI 卡片渲染
// =============================================================

function renderKPI(data) {
    var container = document.getElementById('kpiRow');
    var m = data.metrics;
    var c = m.changes;

    var cards = [
        { label: '总创作者', value: m.totalCreators.toLocaleString(), change: c.totalCreators, changeType: 'percent', sub: '累计入驻' },
        { label: '活跃率', value: formatPercent(m.activeRate), change: c.activeRate, changeType: 'percent', sub: '近7天有产出' },
        { label: '本周产出', value: m.weeklyOutput.toLocaleString() + ' 篇', change: c.weeklyOutput, changeType: 'percent', sub: '环比上周' },
        { label: '流失预警', value: m.lostAlert + ' 人', change: c.lostAlert, changeType: 'absolute', sub: '连续10天未产出' }
    ];

    container.innerHTML = cards.map(function (card) {
        var changeClass = getChangeClass(card.change);
        var changeText = formatChange(card.change, card.changeType === 'absolute');
        return '<div class="kpi-card">' +
            '<div class="kpi-label">' + card.label + '</div>' +
            '<div><span class="kpi-value">' + card.value + '</span>' +
            '<span class="kpi-change ' + changeClass + '">' + changeText + '</span></div>' +
            '<div class="kpi-sub">' + card.sub + '</div>' +
            '</div>';
    }).join('');
}

// =============================================================
// 5. 图表渲染
// =============================================================

function renderLayerChart(data) {
    var ctx = document.getElementById('layerChart').getContext('2d');
    if (layerChartInstance) {
        layerChartInstance.destroy();
    }
    var d = data.layers;
    layerChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: d.labels,
            datasets: [{
                data: d.percentages,
                backgroundColor: d.colors,
                borderColor: '#0b0d11',
                borderWidth: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#8899bb',
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 12, family: "'Inter', 'PingFang SC', sans-serif" }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            var label = context.label || '';
                            var value = context.parsed || 0;
                            var contribution = d.contribution[context.dataIndex] || 0;
                            return label + ': ' + value + '% (贡献' + contribution + '%优质内容)';
                        }
                    }
                }
            }
        }
    });
}

function renderTrendChart(data) {
    var ctx = document.getElementById('trendChart').getContext('2d');
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }
    var d = data.trends;
    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: d.labels,
            datasets: [{
                label: '产出篇数',
                data: d.values,
                borderColor: '#4a7abf',
                backgroundColor: 'rgba(74, 122, 191, 0.10)',
                borderWidth: 2.5,
                pointBackgroundColor: '#4a7abf',
                pointBorderColor: '#0b0d11',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.3,
                spanGaps: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return '产出: ' + context.parsed.y + ' 篇';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(60, 100, 180, 0.08)', drawBorder: false },
                    ticks: { color: '#667799', font: { size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#667799', font: { size: 11 } }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

// =============================================================
// 6. 预警列表渲染（智能排序 + 话术）
// =============================================================

function renderAlerts(data) {
    var container = document.getElementById('alertList');
    var alerts = data.alerts || [];

    // 按紧急程度排序（danger > warning > info）
    var sorted = alerts.slice().sort(function (a, b) {
        return PRIORITY[a.level] - PRIORITY[b.level];
    });

    if (sorted.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #667799;">✅ 暂无预警，继续保持</div>';
        return;
    }

    container.innerHTML = sorted.map(function (alert) {
        var alertClass = getAlertClass(alert.level);
        var icon = getAlertIcon(alert.level);
        var suggestion = SUGGESTION_MAP[alert.level] || '📌 建议关注';
        return '<div class="alert-item ' + alertClass + '">' +
            '<span class="level">' + icon + '</span>' +
            '<span class="name">' + alert.name + '</span>' +
            '<span class="desc">' + alert.desc + '</span>' +
            '<span style="margin-left: auto; font-size: 12px; color: #4fc3a1; max-width: 220px; text-align: right;">' + suggestion + '</span>' +
            '<span class="time">' + alert.time + '</span>' +
            '</div>';
    }).join('');
}

// =============================================================
// 7. 表格渲染
// =============================================================

var currentFilters = { level: 'all', status: 'all' };

function renderTable(data) {
    var tbody = document.getElementById('tableBody');
    var stats = document.getElementById('tableStats');
    var creators = data.creators || [];
    var levelFilter = currentFilters.level;
    var statusFilter = currentFilters.status;

    var filtered = creators.filter(function (creator) {
        var matchLevel = levelFilter === 'all' || creator.level === levelFilter;
        var matchStatus = statusFilter === 'all' || creator.status === statusFilter;
        return matchLevel && matchStatus;
    });

    var levelOrder = { head: 0, mid: 1, tail: 2 };
    filtered.sort(function (a, b) {
        if (levelOrder[a.level] !== levelOrder[b.level]) {
            return levelOrder[a.level] - levelOrder[b.level];
        }
        return b.weeklyOutput - a.weeklyOutput;
    });

    tbody.innerHTML = filtered.map(function (creator) {
        return '<tr>' +
            '<td><strong>' + creator.name + '</strong></td>' +
            '<td><span class="level-badge ' + getLevelClass(creator.level) + '">' + getLevelLabel(creator.level) + '</span></td>' +
            '<td>' + creator.weeklyOutput + ' 篇</td>' +
            '<td>' + (creator.interactionRate * 100).toFixed(1) + '%</td>' +
            '<td><span class="status-badge ' + getStatusClass(creator.status) + '">' + getStatusLabel(creator.status) + '</span></td>' +
            '<td>' + creator.lastActive + '</td>' +
            '</tr>';
    }).join('');

    var total = filtered.length;
    var all = creators.length;
    stats.textContent = '共 ' + total + ' 位创作者' + (total !== all ? ' (已筛选，总计 ' + all + ' 人)' : '');
}

function applyFilters() {
    var levelEl = document.getElementById('filterLevel');
    var statusEl = document.getElementById('filterStatus');
    currentFilters.level = levelEl ? levelEl.value : 'all';
    currentFilters.status = statusEl ? statusEl.value : 'all';
    if (DASHBOARD_DATA) {
        renderTable(DASHBOARD_DATA);
    }
}

// =============================================================
// 8. 核心功能：一键生成周报（可直接粘贴飞书）
// =============================================================

function exportReport() {
    var data = DASHBOARD_DATA;
    if (!data) {
        alert('⚠️ 数据未加载，请先刷新页面');
        return;
    }

    var m = data.metrics;
    var alerts = data.alerts || [];
    var trends = data.trends;
    var now = new Date().toLocaleDateString('zh-CN');
    var nowTime = new Date().toLocaleString('zh-CN');

    // 计算趋势
    var lastWeek = trends.values.slice(-7);
    var trendAvg = lastWeek.reduce(function (a, b) { return a + b; }, 0) / lastWeek.length;
    var prevAvg = 45;
    var trendDirection = trendAvg > prevAvg ? '📈 上升' : '📉 下降';

    // 预警按优先级排序
    var sortedAlerts = alerts.slice().sort(function (a, b) {
        return PRIORITY[a.level] - PRIORITY[b.level];
    });

    // ===== 构建报告 =====
    var lines = [];
    var separator = '═══════════════════════════════════════════════════════════════';

    lines.push('╔' + separator + '╗');
    lines.push('║          📊 AIGC创作者运营周报 - ' + now + '                      ║');
    lines.push('╠' + separator + '╣');

    // 核心数据
    lines.push('║  【核心数据】                                               ║');
    lines.push('║  总创作者：' + m.totalCreators.toLocaleString() + ' 人  ↑ ' + (m.changes.totalCreators * 100).toFixed(1) + '%  │');
    lines.push('║  活跃率：  ' + formatPercent(m.activeRate) + '      ↑ ' + (m.changes.activeRate * 100).toFixed(1) + '%  │');
    lines.push('║  本周产出：' + m.weeklyOutput + ' 篇              ↑ ' + (m.changes.weeklyOutput * 100).toFixed(1) + '%  │');
    lines.push('║  优质率：  ' + formatPercent(m.qualityRate) + '      ↓ ' + (Math.abs(m.changes.qualityRate) * 100).toFixed(1) + '%  │');
    lines.push('║  流失预警：' + m.lostAlert + ' 人                  ↑ ' + m.changes.lostAlert + '人 │');

    lines.push('╠' + separator + '╣');

    // 趋势判断
    lines.push('║  【趋势判断】                                               ║');
    lines.push('║  近7天日均产出：' + trendAvg.toFixed(0) + ' 篇，趋势 ' + trendDirection + '     │');
    lines.push('║  创作者分层：头部10% | 腰部30% | 尾部60%                    ║');
    lines.push('║  优质内容贡献：头部42% | 腰部35% | 尾部23%                  ║');

    lines.push('╠' + separator + '╣');

    // 预警 + 话术
    lines.push('║  【预警名单 + 建议动作】                                    ║');
    if (sortedAlerts.length === 0) {
        lines.push('║  ✅ 暂无预警，一切正常                                    ║');
    } else {
        sortedAlerts.forEach(function (a) {
            var icon = a.level === 'danger' ? '🔴' : a.level === 'warning' ? '🟡' : '🔵';
            var suggestion = SUGGESTION_MAP[a.level] || '📌 建议关注';
            // 截断过长的描述
            var desc = a.desc.length > 14 ? a.desc.slice(0, 14) + '…' : a.desc;
            var line = '║  ' + icon + ' ' + a.name.padEnd(6) + ' │ ' + desc.padEnd(16) + ' │ ' + suggestion;
            // 确保不超过边界
            if (line.length > 58) {
                line = line.slice(0, 55) + '… ║';
            } else {
                line = line.padEnd(59) + '║';
            }
            lines.push(line);
        });
    }

    lines.push('╚' + separator + '╝');
    lines.push('');
    lines.push('📎 报告生成时间：' + nowTime);
    lines.push('📌 数据来源：AIGC创作者运营驾驶舱');

    var report = lines.join('\n');

    // ===== 复制到剪贴板 =====
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(report).then(function () {
            alert('✅ 周报已生成并复制到剪贴板！\n直接 Ctrl+V 粘贴到飞书/钉钉即可发送。');
        }).catch(function () {
            console.log(report);
            alert('📄 周报已生成！请查看控制台输出 (F12 → Console) 并手动复制。');
        });
    } else {
        console.log(report);
        alert('📄 周报已生成！请查看控制台输出 (F12 → Console) 并手动复制。');
    }
}

// =============================================================
// 9. 其他交互功能
// =============================================================

function refreshData() {
    fetchAllData().then(function (data) {
        if (data) {
            DASHBOARD_DATA = data;
            renderAll(data);
            var now = new Date().toLocaleString('zh-CN');
            var timeEl = document.querySelector('.update-time');
            if (timeEl) {
                timeEl.textContent = '📅 更新：' + now;
            }
            var btn = document.querySelector('.btn-secondary[onclick="refreshData()"]');
            if (btn) {
                var original = btn.textContent;
                btn.textContent = '✅ 已刷新';
                btn.style.borderColor = 'rgba(79, 195, 161, 0.5)';
                setTimeout(function () {
                    btn.textContent = original;
                    btn.style.borderColor = '';
                }, 1500);
            }
        }
    });
}

function exportCSV() {
    var data = DASHBOARD_DATA;
    if (!data) {
        alert('⚠️ 数据未加载，请先刷新页面');
        return;
    }
    var creators = data.creators || [];
    if (creators.length === 0) {
        alert('⚠️ 暂无创作者数据');
        return;
    }
    var headers = ['创作者', '层级', '本周产出', '互动率', '状态', '最后活跃'];
    var rows = creators.map(function (c) {
        return [c.name, getLevelLabel(c.level), c.weeklyOutput, (c.interactionRate * 100).toFixed(1) + '%', getStatusLabel(c.status), c.lastActive];
    });
    var csv = headers.join(',') + '\n';
    rows.forEach(function (row) {
        csv += row.join(',') + '\n';
    });
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    link.download = '创作者数据_' + dateStr + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    var btn = document.querySelector('.table-filters .btn-secondary');
    if (btn) {
        var original = btn.textContent;
        btn.textContent = '✅ 已导出';
        setTimeout(function () { btn.textContent = original; }, 1500);
    }
}

// =============================================================
// 10. 整体渲染
// =============================================================

function renderAll(data) {
    renderKPI(data);
    renderLayerChart(data);
    renderTrendChart(data);
    renderAlerts(data);
    renderTable(data);
}

// =============================================================
// 11. 页面初始化
// =============================================================

async function init() {
    console.log('🚀 AIGC创作者运营驾驶舱 启动中...');
    console.log('📡 正在从 API 加载数据...');

    var data = await fetchAllData();
    if (data) {
        DASHBOARD_DATA = data;
        renderAll(data);
        console.log('💡 提示：点击顶部"周/月"按钮可切换视图');
        console.log('✅ 初始化完成！数据时间:', new Date().toLocaleString());
        console.log('💡 提示：点击"导出周报"可生成可直接粘贴的运营报告');
    } else {
        var container = document.getElementById('kpiRow');
        container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ef7a6b; background:rgba(190,60,50,0.1); border-radius:14px; border:1px solid rgba(190,60,50,0.2);">' +
            '⚠️ 无法连接后端服务<br><br>' +
            '<span style="font-size:14px; color:#8899bb;">请在终端运行：<code style="background:#1a1e26; padding:2px 12px; border-radius:4px;">python backend/app.py</code></span>' +
            '</div>';
    }
}

document.addEventListener('DOMContentLoaded', init);

// =============================================================
// 12. 视图切换（周/月）
// =============================================================

let currentView = 'weekly';

/**
 * 根据视图生成对应的模拟数据
 * 真实场景中，这里应该调用不同的 API 接口
 */
function getViewData(view, baseData) {
    var data = JSON.parse(JSON.stringify(baseData)); // 深拷贝
    var m = data.metrics;

    if (view === 'monthly') {
        // 月视图：数据乘以 4 倍（4周≈1个月）
        m.totalCreators = Math.round(m.totalCreators * 1.05);
        m.weeklyOutput = m.weeklyOutput * 4;
        m.activeRate = Math.min(0.95, m.activeRate * 1.02);
        m.changes.weeklyOutput = m.changes.weeklyOutput * 1.2;
        // 趋势图改为12周（3个月）
        data.trends.labels = ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周', '第7周', '第8周', '第9周', '第10周', '第11周', '第12周'];
        data.trends.values = data.trends.values.map(function (v) { return Math.round(v * 1.1 + Math.random() * 10); });
        // 确保12个数据点
        while (data.trends.values.length < 12) {
            data.trends.values.push(Math.round(data.trends.values[data.trends.values.length - 1] * 0.95 + Math.random() * 15));
        }
        data.trends.values = data.trends.values.slice(0, 12);
    } else {
        // 周视图：恢复原始数据
        // 由于我们是用深拷贝，这里其实不需要额外操作
        // 但为了安全，重新从 baseData 获取
        return baseData;
    }
    return data;
}

function switchView(view) {
    if (!DASHBOARD_DATA) {
        alert('⚠️ 数据未加载，请先刷新页面');
        return;
    }

    currentView = view;
    var viewData = getViewData(view, DASHBOARD_DATA);

    // 更新按钮状态
    document.querySelectorAll('.view-btn').forEach(function (btn) {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });

    // 重新渲染
    renderAll(viewData);

    // 更新标题提示
    var note = document.querySelector('.chart-note');
    if (note) {
        var suffix = view === 'monthly' ? '（月维度数据，基于周数据推算）' : '（周维度数据）';
        note.textContent = '环比上周 ↑ 8.7% ' + suffix;
    }

    console.log('🔄 切换视图到:', view === 'weekly' ? '周' : '月');
}

window.applyFilters = applyFilters;
window.exportReport = exportReport;
window.refreshData = refreshData;
window.exportCSV = exportCSV;
window.switchView = switchView; 