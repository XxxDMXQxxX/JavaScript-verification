const express = require("express")
const app = express()
app.use(express.json())

const accounts = JSON.parse(process.env.ACCOUNTS || '{}')
const tokens = {}

app.post("/api/login", (req, res) => {
    const { user, pass } = req.body
    if (accounts[user] && accounts[user] === pass) {
        const token = Math.random().toString(36).slice(2)
        tokens[token] = user
        res.json({ success: true, token })
    } else {
        res.json({ success: false, message: "账号或密码错误" })
    }
})

app.post("/api/verify", (req, res) => {
    const { token } = req.body
    if (tokens[token]) {
        res.json({ success: true, user: tokens[token] })
    } else {
        res.json({ success: false, message: "token无效" })
    }
})

const PORT = process.env.PORT || 3000
app.listen(PORT)
