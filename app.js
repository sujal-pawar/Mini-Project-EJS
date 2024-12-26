const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const userModel = require("./models/user");
const postModel = require("./models/post");

app.set('view engine', 'ejs');
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get("/", (req, res) => {
    res.render("index");
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.get("/profile", isLogedin, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate("posts");
    res.render("profile",{user});
})

app.post("/post", isLogedin, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let post = await postModel.create({ user: user._id, content: req.body.content }); 

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
})

app.post("/register", async (req, res) => {
    let { username, name, age, email, password } = req.body;
    let user = await userModel.findOne({ email });

    if (user) {
        res.status(500).send("User already registered")
    } else {
        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(password, salt, async (err, hash) => {
                let newUser = await userModel.create({ username, name, age, email, password: hash });

                const token = jwt.sign({ email: email, id: newUser._id }, "secretkey");
                res.cookie("token", token);
                res.status(201).send(`User registered successfully: ${newUser.name}`);
            });
        });
    }
});

app.post("/login", async (req, res) => {

    let { username, name, age, email, password } = req.body;
    let user = await userModel.findOne({ email });

    if (!user) {
        res.status(500).send("Something went wrong");
    } else {
        bcrypt.compare(password, user.password, function (err, result) {
            if (result) {
                const token = jwt.sign({ email: email, id: user._id }, "secretkey");
                res.cookie("token", token);
                res.redirect("/profile");
            } else {
                res.redirect("/login");
            }
        });
    }
});

app.get("/logout", async (_, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});

function isLogedin(req, res, next) {
    
    if (req.cookies.token === "") {
        res.redirect("/login");
    } else {
        let data = jwt.verify(req.cookies.token, 'secretkey');
        req.user = data;
        next();
    }
}



app.listen(3000, () => {
    console.log("Server is running on port 3000");
});