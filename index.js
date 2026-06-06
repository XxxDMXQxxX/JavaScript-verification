const express = require("express")
const app = express()
app.use(express.json())

const accounts = JSON.parse(process.env.ACCOUNTS || '{}')
const tokens = {}
const bindedIPs = {} // 存储账号绑定的IP

app.post("/api/login", (req, res) => {
    const { user, pass } = req.body
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress

    if (!accounts[user] || accounts[user] !== pass) {
        return res.json({ success: false, message: "账号或密码错误" })
    }

    // 检查IP绑定
    if (bindedIPs[user]) {
        if (bindedIPs[user] !== ip) {
            return res.json({ success: false, message: "该账号已在其他设备登录，请联系管理员解绑" })
        }
    } else {
        // 第一次登录绑定IP
        bindedIPs[user] = ip
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

// 管理员解绑IP
app.post("/api/unbind", (req, res) => {
    const { admin_key, user } = req.body
    if (admin_key !== process.env.ADMIN_KEY) {
        return res.json({ success: false, message: "无权限" })
    }
    if (!bindedIPs[user]) {
        return res.json({ success: false, message: "该账号未绑定IP" })
    }
    delete bindedIPs[user]
    // 清除该用户所有token
    for (var token in tokens) {
        if (tokens[token].user === user) delete tokens[token]
    }
    res.json({ success: true, message: user + " IP解绑成功" })
})

// 查看所有绑定情况（管理员）
app.post("/api/list", (req, res) => {
    const { admin_key } = req.body
    if (admin_key !== process.env.ADMIN_KEY) {
        return res.json({ success: false, message: "无权限" })
    }
    res.json({ success: true, data: bindedIPs })
})

const PORT = process.env.PORT || 3000
app.listen(PORT)
