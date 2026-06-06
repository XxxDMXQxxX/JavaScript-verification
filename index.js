const express = require("express")
const app = express()
app.use(express.json())

const accounts = JSON.parse(process.env.ACCOUNTS || '{}')
const tokens = {}
const bindedIPs = {}

// 管理面板
app.get("/admin", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>管理面板</title>
    <style>
        body { background:#1a1a2e; color:#fff; font-family:sans-serif; padding:40px; }
        h2 { color:#e94560; }
        input { padding:8px; margin:5px; border-radius:4px; border:none; width:200px; }
        button { padding:8px 20px; background:#e94560; color:#fff; border:none; border-radius:4px; cursor:pointer; }
        button:hover { background:#c73652; }
        .result { margin-top:20px; padding:15px; background:#16213e; border-radius:8px; }
        .item { padding:8px; margin:4px 0; background:#0f3460; border-radius:4px; }
    </style>
</head>
<body>
    <h2>管理面板</h2>

    <h3>解绑IP</h3>
    <input id="unbind_key" type="password" placeholder="管理员密钥">
    <input id="unbind_user" placeholder="账号名">
    <button onclick="unbind()">解绑</button>

    <h3>查看绑定列表</h3>
    <input id="list_key" type="password" placeholder="管理员密钥">
    <button onclick="listAll()">查看</button>

    <div class="result" id="result"></div>

    <script>
        async function unbind() {
            const res = await fetch("/api/unbind", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    admin_key: document.getElementById("unbind_key").value,
                    user: document.getElementById("unbind_user").value
                })
            })
            const data = await res.json()
            document.getElementById("result").innerText = data.message
        }

        async function listAll() {
            const res = await fetch("/api/list", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    admin_key: document.getElementById("list_key").value
                })
            })
            const data = await res.json()
            if (data.success) {
                const list = Object.entries(data.data)
                if (list.length === 0) {
                    document.getElementById("result").innerHTML = "暂无绑定数据"
                    return
                }
                let html = "<div>"
                list.forEach(([user, ip]) => {
                    html += "<div class='item'>账号：" + user + " → IP：" + ip + "</div>"
                })
                html += "</div>"
                document.getElementById("result").innerHTML = html
            } else {
                document.getElementById("result").innerText = data.message
            }
        }
    </script>
</body>
</html>
    `)
})

app.post("/api/login", (req, res) => {
    const { user, pass } = req.body
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress

    console.log(`[登录] 账号: ${user} | IP: ${ip} | 时间: ${new Date().toLocaleString('zh-CN')}`)

    if (!accounts[user] || accounts[user] !== pass) {
        console.log(`[失败] 账号: ${user} | IP: ${ip} | 原因: 密码错误`)
        return res.json({ success: false, message: "账号或密码错误" })
    }

    if (bindedIPs[user]) {
        if (bindedIPs[user] !== ip) {
            console.log(`[拦截] 账号: ${user} | IP: ${ip} | 原因: IP不匹配`)
            return res.json({ success: false, message: "该账号已在其他设备登录，请联系管理员解绑" })
        }
    } else {
        bindedIPs[user] = ip
        console.log(`[绑定] 账号: ${user} | IP: ${ip}`)
    }

    const token = Math.random().toString(36).slice(2)
    tokens[token] = { user, ip }
    res.json({ success: true, token })
})

app.post("/api/verify", (req, res) => {
    const { token } = req.body
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const data = tokens[token]

    if (!data) return res.json({ success: false, message: "token无效" })
    if (data.ip !== ip) return res.json({ success: false, message: "IP异常，请重新登录" })

    res.json({ success: true, user: data.user })
})

app.post("/api/unbind", (req, res) => {
    const { admin_key, user } = req.body
    if (admin_key !== process.env.ADMIN_KEY) {
        return res.json({ success: false, message: "无权限" })
    }
    if (!bindedIPs[user]) {
        return res.json({ success: false, message: "该账号未绑定IP" })
    }
    delete bindedIPs[user]
    console.log(`[解绑] 账号: ${user} | 时间: ${new Date().toLocaleString('zh-CN')}`)
    for (var token in tokens) {
        if (tokens[token].user === user) delete tokens[token]
    }
    res.json({ success: true, message: user + " IP解绑成功" })
})

app.post("/api/list", (req, res) => {
    const { admin_key } = req.body
    if (admin_key !== process.env.ADMIN_KEY) {
        return res.json({ success: false, message: "无权限" })
    }
    res.json({ success: true, data: bindedIPs })
})

const PORT = process.env.PORT || 3000
app.listen(PORT)
